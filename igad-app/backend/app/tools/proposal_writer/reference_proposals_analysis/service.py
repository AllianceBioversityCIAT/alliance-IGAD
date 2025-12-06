"""
Reference Proposals Analysis Service

Analyzes reference proposals from S3 Vectors to extract:
- Structural patterns and section hierarchies
- Narrative strategies and writing techniques
- Donor alignment signals
- Transferable best practices

The service retrieves vectorized documents, reconstructs them,
and analyzes up to 3 proposals using Claude Haiku 4.5.
"""

import json
import os
import re
import time
from typing import Any, Dict, List, Optional

import boto3
from boto3.dynamodb.conditions import Attr

from app.database.client import db_client
from app.shared.ai.bedrock_service import BedrockService
from app.shared.vectors.service import VectorEmbeddingsService
from app.tools.proposal_writer.reference_proposals_analysis.config import (
    REFERENCE_PROPOSALS_ANALYSIS_SETTINGS,
)


class ReferenceProposalsAnalyzer:
    """
    Analyzes reference proposals to extract structural and stylistic patterns.

    Workflow:
    1. Retrieve vectors from S3 Vectors for this proposal
    2. Group chunks by document_name and reconstruct documents
    3. Limit to max 3 documents (most recent or user-selected)
    4. Load prompt from DynamoDB
    5. Analyze each document with Claude Haiku
    6. Consolidate individual analyses into unified insights
    7. Return structured analysis for injection into other prompts
    """

    def __init__(self):
        """Initialize services and clients."""
        self.vector_service = VectorEmbeddingsService()
        self.bedrock = BedrockService()
        self.dynamodb = boto3.resource("dynamodb")
        self.table_name = os.environ.get("TABLE_NAME", "igad-testing-main-table")

    def analyze_reference_proposals(self, proposal_id: str) -> Dict[str, Any]:
        """
        Analyze all reference proposals for a given proposal.

        Args:
            proposal_id: Unique proposal identifier

        Returns:
            Dict with structure:
            {
                "reference_proposal_analysis": {
                    "consolidated_analysis": {...},
                    "documents_analyzed": 3
                },
                "status": "completed"
            }

        Raises:
            Exception: If no reference proposals found or analysis fails
        """
        try:
            # Step 1: Verify proposal exists
            print(f"📋 Loading proposal: {proposal_id}")
            proposal = db_client.get_item_sync(
                pk=f"PROPOSAL#{proposal_id}", sk="METADATA"
            )

            if not proposal:
                raise Exception(f"Proposal {proposal_id} not found")

            # Step 2: Retrieve and reconstruct reference documents from S3 Vectors
            print(f"🔍 Retrieving reference proposals from S3 Vectors...")
            max_docs = REFERENCE_PROPOSALS_ANALYSIS_SETTINGS["max_documents"]
            documents = self.vector_service.get_documents_by_proposal(
                proposal_id=proposal_id,
                index_name="reference-proposals-index",
                max_docs=max_docs
            )

            if not documents:
                print("⚠️  No reference proposals found - returning empty analysis")
                return {
                    "reference_proposal_analysis": {
                        "narrative_analysis": "No reference proposals were uploaded for this analysis.",
                        "structured_data": {
                            "status": "skipped",
                            "reason": "No reference documents uploaded"
                        }
                    },
                    "documents_analyzed": 0,
                    "status": "completed",
                }

            print(f"📚 Found {len(documents)} reference proposal(s)")

            # Step 3: Truncate documents if too long
            max_chars = REFERENCE_PROPOSALS_ANALYSIS_SETTINGS["max_chars_per_document"]
            for doc in documents:
                if len(doc["full_text"]) > max_chars:
                    print(f"  ✂️  Truncating {doc['document_name']} from {len(doc['full_text'])} to {max_chars} chars")
                    doc["full_text"] = (
                        doc["full_text"][:max_chars]
                        + "\n\n[... Document truncated for analysis ...]"
                    )

            # Step 4: Load analysis prompt from DynamoDB
            print("📝 Loading analysis prompt from DynamoDB...")
            prompt_template = self._load_prompt()

            # Step 5: Analyze each document
            print(f"🔍 Analyzing {len(documents)} document(s) with Claude Haiku...")
            individual_analyses = []
            start_time = time.time()

            for idx, doc in enumerate(documents, 1):
                print(f"  📄 Analyzing document {idx}/{len(documents)}: {doc['document_name']}")
                analysis = self._analyze_single_document(
                    document_text=doc["full_text"],
                    document_name=doc["document_name"],
                    prompt_template=prompt_template,
                )
                individual_analyses.append({
                    "document_name": doc["document_name"],
                    "analysis": analysis
                })

            elapsed = time.time() - start_time
            print(f"⏱️  Total analysis time: {elapsed:.2f} seconds")

            # Step 6: Consolidate analyses
            print("🔄 Consolidating analyses...")
            consolidated = self._consolidate_analyses(individual_analyses)

            print("✅ Reference proposals analysis completed successfully")

            return {
                "reference_proposal_analysis": consolidated,
                "documents_analyzed": len(documents),
                "status": "completed",
            }

        except Exception as e:
            print(f"❌ Reference proposals analysis failed: {str(e)}")
            raise Exception(f"Reference proposals analysis failed: {str(e)}")

    # ==================== PRIVATE HELPER METHODS ====================

    def _load_prompt(self) -> Dict[str, str]:
        """
        Load analysis prompt from DynamoDB.

        Searches for prompt:
        - name: "Prompt 1.1"
        - section: "proposal_writer"
        - sub_section: "step-1"
        - categories: contains "Reference Proposals"
        - is_active: true

        Returns:
            Dict with 'system_prompt', 'user_prompt', 'output_format'

        Raises:
            Exception: If prompt not found
        """
        try:
            table = self.dynamodb.Table(self.table_name)
            response = table.scan(
                FilterExpression=(
                    Attr("is_active").eq(True)
                    & Attr("section").eq("proposal_writer")
                    & Attr("sub_section").eq("step-1")
                    & Attr("categories").contains("Reference Proposals")
                )
            )

            items = response.get("Items", [])
            if not items:
                raise Exception(
                    "No active prompt found in DynamoDB for Reference Proposals"
                )

            prompt_item = items[0]
            print(f"✅ Loaded prompt: {prompt_item.get('name', 'Unnamed')}")

            return {
                "system_prompt": prompt_item.get("system_prompt", ""),
                "user_prompt": prompt_item.get("user_prompt_template", ""),
                "output_format": prompt_item.get("output_format", ""),
            }

        except Exception as e:
            print(f"❌ Failed to load prompt from DynamoDB: {str(e)}")
            raise Exception(f"Failed to load analysis prompt: {str(e)}")

    def _analyze_single_document(
        self,
        document_text: str,
        document_name: str,
        prompt_template: Dict[str, str],
    ) -> Dict[str, Any]:
        """
        Analyze a single reference proposal document.

        Args:
            document_text: Full text of the document
            document_name: Name of the document
            prompt_template: Prompt loaded from DynamoDB

        Returns:
            Parsed analysis result
        """
        # Inject document text into user prompt
        # The prompt expects {{reference_proposal_text}} placeholder
        user_prompt = prompt_template["user_prompt"].replace(
            "{{reference_proposal_text}}", document_text
        )

        # Add output format if provided
        if prompt_template["output_format"]:
            user_prompt = f"{user_prompt}\n\n{prompt_template['output_format']}"

        # Call Bedrock with defaults for max_tokens and temperature
        start_time = time.time()
        ai_response = self.bedrock.invoke_claude(
            system_prompt=prompt_template["system_prompt"],
            user_prompt=user_prompt,
            max_tokens=REFERENCE_PROPOSALS_ANALYSIS_SETTINGS.get("max_tokens", 8000),
            temperature=REFERENCE_PROPOSALS_ANALYSIS_SETTINGS.get("temperature", 0.3),
            model_id=REFERENCE_PROPOSALS_ANALYSIS_SETTINGS["model"],
        )
        elapsed = time.time() - start_time
        print(f"    ⏱️  Analysis time: {elapsed:.2f}s")

        # Parse response
        parsed = self._parse_response(ai_response)

        return parsed

    def _parse_response(self, response: str) -> Dict[str, Any]:
        """
        Parse Claude's response.

        The response should contain:
        1. Narrative analysis (text)
        2. JSON structured data

        Args:
            response: Raw response from Claude

        Returns:
            Parsed dict with narrative and structured data
        """
        try:
            # Try to extract JSON from response
            # The prompt asks for narrative + JSON, so we need to separate them

            # Look for JSON block
            json_match = re.search(
                r"```json\s*(\{.*?\})\s*```", response, re.DOTALL
            )
            if json_match:
                json_str = json_match.group(1)
                structured_data = json.loads(json_str)

                # Everything before JSON is narrative
                narrative_end = response.find("```json")
                narrative = response[:narrative_end].strip()

                return {
                    "narrative_analysis": narrative,
                    "structured_data": structured_data,
                }
            else:
                # Try to find raw JSON object
                json_match = re.search(r"(\{.*\})", response, re.DOTALL)
                if json_match:
                    structured_data = json.loads(json_match.group(1))
                    # Text before JSON is narrative
                    narrative_end = response.find("{")
                    narrative = response[:narrative_end].strip()

                    return {
                        "narrative_analysis": narrative,
                        "structured_data": structured_data,
                    }
                else:
                    # No JSON found, return as pure narrative
                    print("⚠️  No structured JSON found in response")
                    return {
                        "narrative_analysis": response,
                        "structured_data": {},
                    }

        except json.JSONDecodeError as e:
            print(f"⚠️  JSON parsing failed: {str(e)}")
            return {"narrative_analysis": response, "structured_data": {}}

    def _consolidate_analyses(
        self, individual_analyses: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Consolidate multiple document analyses into a unified analysis.

        Args:
            individual_analyses: List of analyses from individual documents

        Returns:
            Consolidated analysis suitable for {{reference_proposal_analysis}} injection
        """
        if len(individual_analyses) == 1:
            # Only one document, return it directly
            return individual_analyses[0]["analysis"]

        # Multiple documents: consolidate insights
        consolidated_narrative = "# Consolidated Analysis from Multiple Reference Proposals\n\n"
        consolidated_narrative += f"Analyzed {len(individual_analyses)} reference proposals to extract common patterns and best practices.\n\n"

        # Collect all structured data
        all_structure_maps = []
        all_narrative_patterns = []
        all_writing_styles = []
        all_donor_patterns = []
        all_best_practices = []

        for idx, item in enumerate(individual_analyses, 1):
            analysis = item["analysis"]
            doc_name = item["document_name"]

            # Add narrative
            if "narrative_analysis" in analysis and analysis["narrative_analysis"]:
                consolidated_narrative += f"## Document {idx}: {doc_name}\n\n"
                consolidated_narrative += analysis["narrative_analysis"] + "\n\n"

            # Collect structured data
            if "structured_data" in analysis:
                struct = analysis["structured_data"]
                if "structure_map" in struct:
                    all_structure_maps.append(struct["structure_map"])
                if "narrative_patterns" in struct:
                    all_narrative_patterns.append(struct["narrative_patterns"])
                if "writing_style" in struct:
                    all_writing_styles.append(struct["writing_style"])
                if "donor_alignment_patterns" in struct:
                    all_donor_patterns.append(struct["donor_alignment_patterns"])
                if "best_practices" in struct:
                    all_best_practices.extend(struct["best_practices"])

        # Create consolidated structured data
        consolidated_structured = {
            "structure_maps": all_structure_maps,
            "common_narrative_patterns": self._find_common_patterns(
                all_narrative_patterns
            ),
            "common_writing_styles": self._find_common_styles(all_writing_styles),
            "donor_alignment_patterns": self._find_common_donor_patterns(
                all_donor_patterns
            ),
            "best_practices": list(set(all_best_practices)),  # Deduplicate
        }

        return {
            "narrative_analysis": consolidated_narrative,
            "structured_data": consolidated_structured,
        }

    def _find_common_patterns(self, patterns_list: List[Dict]) -> Dict[str, str]:
        """Find common narrative patterns across documents."""
        if not patterns_list:
            return {}

        # For now, return the first one as representative
        # TODO: Implement smart merging logic
        return patterns_list[0] if patterns_list else {}

    def _find_common_styles(self, styles_list: List[Dict]) -> Dict[str, Any]:
        """Find common writing styles across documents."""
        if not styles_list:
            return {}

        # For now, return the first one as representative
        return styles_list[0] if styles_list else {}

    def _find_common_donor_patterns(self, patterns_list: List[Dict]) -> Dict[str, Any]:
        """Find common donor alignment patterns across documents."""
        if not patterns_list:
            return {}

        # Merge all keywords
        all_keywords = []
        for p in patterns_list:
            if "keywords" in p:
                all_keywords.extend(p.get("keywords", []))

        return {
            "common_keywords": list(set(all_keywords)),
            "representative_pattern": patterns_list[0] if patterns_list else {},
        }
