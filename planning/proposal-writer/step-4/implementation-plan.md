# Implementation Plan: Proposal Document Generation (Step 4)

## Overview

This document provides a detailed implementation plan for the "Download with AI feedback" functionality in Step 4 of the Proposal Writer. The plan is divided into Backend and Frontend tasks, designed for execution by Claude Opus 4.5.

**Reference Specification:** `specs/tools/proposal-writer/step-4/proposal-document-generation.md`

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           IMPLEMENTATION FLOW                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. BACKEND SERVICE (New)                                               │
│     └── proposal_document_generation/                                    │
│         ├── __init__.py                                                  │
│         ├── config.py                                                    │
│         └── service.py                                                   │
│                                                                          │
│  2. BACKEND WORKER (Modify)                                             │
│     └── workflow/worker.py                                               │
│         └── Add handler: _handle_proposal_document_generation()         │
│                                                                          │
│  3. BACKEND ROUTES (Modify)                                             │
│     └── routes.py                                                        │
│         ├── POST /{id}/generate-proposal-document                       │
│         └── GET /{id}/proposal-document-status                          │
│                                                                          │
│  4. FRONTEND SERVICE (Modify)                                           │
│     └── proposalService.ts                                               │
│         ├── generateProposalDocument()                                   │
│         └── getProposalDocumentStatus()                                  │
│                                                                          │
│  5. FRONTEND COMPONENT (Modify)                                         │
│     └── Step4ProposalReview.tsx                                          │
│         ├── Add section selection with checkboxes                        │
│         ├── Add user comments per section                                │
│         ├── Remove "Re-analyze" button                                   │
│         └── Implement "Download with AI feedback" handler                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# PART 1: BACKEND IMPLEMENTATION

## Task B1: Create `proposal_document_generation` Service

### B1.1: Create `__init__.py`

**File:** `igad-app/backend/app/tools/proposal_writer/proposal_document_generation/__init__.py`

**Content:**
```python
"""
Proposal Document Generation Service

Generates refined proposal documents based on:
- Draft proposal content
- AI-generated section feedback
- User comments and guidance

Following the same pattern as concept_document_generation.
"""

from app.tools.proposal_writer.proposal_document_generation.service import (
    proposal_document_generator,
)

__all__ = ["proposal_document_generator"]
```

---

### B1.2: Create `config.py`

**File:** `igad-app/backend/app/tools/proposal_writer/proposal_document_generation/config.py`

**Reference Pattern:** `igad-app/backend/app/tools/proposal_writer/concept_document_generation/config.py`

**Content:**
```python
"""
Proposal Document Generation Configuration

This module contains configuration settings for generating refined proposal
documents based on AI feedback and user comments.

The Proposal Document Generation uses AI to:
- Apply section-by-section AI feedback
- Incorporate user comments and guidance
- Preserve structure while improving content
- Maintain consistency with RFP requirements

AI Parameters:
    model: AWS Bedrock model ID for Claude
    max_tokens: Maximum tokens for Bedrock response (16000 for full proposal)
    temperature: Sampling temperature (0.2 for consistent outputs)
    top_p: Nucleus sampling parameter
    top_k: Top-k sampling parameter

Processing Settings:
    timeout: Maximum processing time in seconds
    max_retries: Maximum retry attempts on failure

DynamoDB Prompt Lookup:
    section: Top-level section key ("proposal_writer")
    sub_section: Step identifier ("step-4")
    category: Prompt category filter ("Proposal Regeneration")

Usage:
    from app.tools.proposal_writer.proposal_document_generation.config import (
        PROPOSAL_DOCUMENT_GENERATION_SETTINGS
    )
"""

PROPOSAL_DOCUMENT_GENERATION_SETTINGS = {
    # ==================== AI Model Configuration ====================
    "model": "us.anthropic.claude-sonnet-4-20250514-v1:0",  # Claude Sonnet 4
    "max_tokens": 16000,  # Maximum tokens for response (~12,000 words)
    "temperature": 0.2,  # Low temperature for consistent, conservative refinement
    "top_p": 0.9,  # Nucleus sampling
    "top_k": 250,  # Top-k sampling
    # ==================== Processing Settings ====================
    "timeout": 600,  # Processing timeout (10 minutes for full proposal)
    "max_retries": 3,  # Maximum retry attempts on failure
    # ==================== DynamoDB Prompt Lookup ====================
    "section": "proposal_writer",  # Top-level section
    "sub_section": "step-4",  # Step identifier
    "category": "Proposal Regeneration",  # Prompt category filter
}
```

---

### B1.3: Create `service.py`

**File:** `igad-app/backend/app/tools/proposal_writer/proposal_document_generation/service.py`

**Reference Pattern:** `igad-app/backend/app/tools/proposal_writer/concept_document_generation/service.py`

**Full Implementation:**

```python
"""
Proposal Document Generation Service

Generates refined proposal documents based on:
- Draft proposal content
- AI-generated section feedback  
- User comments and guidance

The service filters to selected sections and uses Claude 
to generate a refined proposal maintaining structure integrity.
"""

import json
import logging
import os
import re
import traceback
from datetime import datetime
from io import BytesIO
from typing import Any, Dict, List, Optional

import boto3
from boto3.dynamodb.conditions import Attr
from docx import Document
from PyPDF2 import PdfReader

from app.shared.ai.bedrock_service import BedrockService
from app.tools.proposal_writer.proposal_document_generation.config import (
    PROPOSAL_DOCUMENT_GENERATION_SETTINGS,
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class ProposalDocumentGenerator:
    """
    Generates refined proposal documents using AI.

    Workflow:
    1. Load prompt template from DynamoDB
    2. Prepare context with draft, feedback, and user comments
    3. Filter to selected sections only
    4. Inject context into prompt
    5. Call Claude via Bedrock
    6. Parse and return refined proposal
    """

    def __init__(self):
        """Initialize Bedrock and DynamoDB clients."""
        self.bedrock = BedrockService()
        self.dynamodb = boto3.resource("dynamodb")
        self.s3 = boto3.client("s3")
        self.table_name = os.environ.get("TABLE_NAME", "igad-testing-main-table")
        self.bucket = os.environ.get("PROPOSALS_BUCKET")
        if not self.bucket:
            raise Exception("PROPOSALS_BUCKET environment variable not set")

    def generate_document(
        self,
        proposal_code: str,
        draft_proposal: str,
        section_feedback: List[Dict[str, Any]],
        user_comments: Dict[str, str],
        selected_sections: List[str],
    ) -> Dict[str, Any]:
        """
        Generate refined proposal document using AI.

        Args:
            proposal_code: Proposal identifier for logging
            draft_proposal: Full text of draft proposal
            section_feedback: AI feedback per section from draft_feedback_analysis
            user_comments: User-provided comments per section
            selected_sections: List of section titles to refine

        Returns:
            Dict with 'generated_proposal', 'sections', and 'metadata'

        Raises:
            ValueError: If prompt template not found
            Exception: If document generation fails
        """
        try:
            logger.info(f"📋 Generating refined proposal for: {proposal_code}")
            logger.info(f"   Selected sections: {len(selected_sections)}")
            logger.info(f"   User comments: {len(user_comments)}")
            
            start_time = datetime.utcnow()

            # Step 1: Load prompt template
            logger.info("📝 Loading prompt template...")
            prompt_parts = self._get_prompt_template()

            if not prompt_parts:
                raise ValueError("Prompt template not found in DynamoDB")

            # Step 2: Prepare context
            logger.info("🔄 Preparing context...")
            context = self._prepare_context(
                draft_proposal,
                section_feedback,
                user_comments,
                selected_sections,
            )

            # Step 3: Build final prompt
            user_prompt = self._inject_context(prompt_parts["user_prompt"], context)
            final_prompt = f"{user_prompt}\n\n{prompt_parts['output_format']}".strip()

            # Step 4: Call Bedrock
            logger.info("📡 Calling Bedrock (this may take 3-5 minutes)...")

            ai_response = self.bedrock.invoke_claude(
                system_prompt=prompt_parts["system_prompt"],
                user_prompt=final_prompt,
                max_tokens=PROPOSAL_DOCUMENT_GENERATION_SETTINGS.get("max_tokens", 16000),
                temperature=PROPOSAL_DOCUMENT_GENERATION_SETTINGS.get("temperature", 0.2),
                model_id=PROPOSAL_DOCUMENT_GENERATION_SETTINGS["model"],
            )

            elapsed = (datetime.utcnow() - start_time).total_seconds()
            logger.info(f"✅ Response received in {elapsed:.1f} seconds")

            # Step 5: Parse response
            logger.info("📊 Parsing response...")
            document = self._parse_response(ai_response)
            
            # Add metadata
            document["metadata"] = {
                "proposal_code": proposal_code,
                "sections_refined": len(selected_sections),
                "generation_time_seconds": elapsed,
                "generated_at": datetime.utcnow().isoformat(),
            }

            logger.info("✅ Refined proposal generated successfully")
            return document

        except Exception as e:
            logger.error(f"❌ Document generation failed: {str(e)}")
            traceback.print_exc()
            raise

    def _get_prompt_template(self) -> Optional[Dict[str, str]]:
        """
        Load document generation prompt from DynamoDB.

        Filters for:
        - is_active: true
        - section: "proposal_writer"
        - sub_section: "step-4"
        - categories: contains "Proposal Regeneration"

        Returns:
            Dict with 'system_prompt', 'user_prompt', 'output_format', or None
        """
        try:
            table = self.dynamodb.Table(self.table_name)
            filter_expr = (
                Attr("is_active").eq(True)
                & Attr("section").eq(PROPOSAL_DOCUMENT_GENERATION_SETTINGS["section"])
                & Attr("sub_section").eq(PROPOSAL_DOCUMENT_GENERATION_SETTINGS["sub_section"])
                & Attr("categories").contains(PROPOSAL_DOCUMENT_GENERATION_SETTINGS["category"])
            )

            # Handle DynamoDB pagination
            items = []
            response = table.scan(FilterExpression=filter_expr)
            items.extend(response.get("Items", []))

            while "LastEvaluatedKey" in response:
                response = table.scan(
                    FilterExpression=filter_expr,
                    ExclusiveStartKey=response["LastEvaluatedKey"],
                )
                items.extend(response.get("Items", []))

            if not items:
                logger.warning("⚠️  No prompts found in DynamoDB")
                return None

            prompt_item = items[0]
            logger.info(f"✅ Loaded prompt: {prompt_item.get('name', 'Unnamed')}")

            return {
                "system_prompt": prompt_item.get("system_prompt", ""),
                "user_prompt": prompt_item.get("user_prompt_template", ""),
                "output_format": prompt_item.get("output_format", ""),
            }

        except Exception as e:
            logger.error(f"❌ Error loading prompt: {str(e)}")
            return None

    def _prepare_context(
        self,
        draft_proposal: str,
        section_feedback: List[Dict[str, Any]],
        user_comments: Dict[str, str],
        selected_sections: List[str],
    ) -> Dict[str, str]:
        """
        Prepare context for prompt injection.

        Filters feedback to only selected sections.

        Args:
            draft_proposal: Full draft proposal text
            section_feedback: All section feedback
            user_comments: User comments keyed by section title
            selected_sections: List of selected section titles

        Returns:
            Dict with 'draft_proposal', 'section_feedback', 'user_comments'
        """
        # Filter feedback to selected sections only
        filtered_feedback = [
            f for f in section_feedback
            if f.get("section_title") in selected_sections
        ]

        logger.info(f"📊 Filtered to {len(filtered_feedback)} sections from {len(section_feedback)} total")
        
        # Filter user comments to selected sections only
        filtered_comments = {
            k: v for k, v in user_comments.items()
            if k in selected_sections and v.strip()
        }
        
        logger.info(f"📝 Including {len(filtered_comments)} user comments")

        return {
            "draft_proposal": draft_proposal,
            "section_feedback": json.dumps(filtered_feedback, indent=2),
            "user_comments": json.dumps(filtered_comments, indent=2),
        }

    def _inject_context(self, template: str, context: Dict[str, Any]) -> str:
        """
        Inject context variables into prompt template.

        Supports placeholder formats:
        - {[DRAFT PROPOSAL]}
        - {[SECTION FEEDBACK]}
        - {[USER COMMENTS]}

        Args:
            template: Prompt template with placeholder markers
            context: Dict of context values

        Returns:
            Prompt with injected context
        """
        prompt = template
        replacements_made = 0

        for key, value in context.items():
            value_str = str(value)

            # Format 1: {[KEY]} (uppercase with spaces)
            key_upper = key.upper().replace("_", " ")
            placeholder_bracket = "{[" + key_upper + "]}"
            if placeholder_bracket in prompt:
                prompt = prompt.replace(placeholder_bracket, value_str)
                replacements_made += 1
                logger.info(f"✅ Replaced placeholder: {placeholder_bracket}")

            # Format 2: {[key]} (original key in bracket format)
            placeholder_bracket_original = "{[" + key + "]}"
            if placeholder_bracket_original in prompt:
                prompt = prompt.replace(placeholder_bracket_original, value_str)
                replacements_made += 1
                logger.info(f"✅ Replaced placeholder: {placeholder_bracket_original}")

            # Format 3: {{key}} (double brace format)
            placeholder_double_brace = f"{{{{{key}}}}}"
            if placeholder_double_brace in prompt:
                prompt = prompt.replace(placeholder_double_brace, value_str)
                replacements_made += 1
                logger.info(f"✅ Replaced placeholder: {placeholder_double_brace}")

        logger.info(f"🔄 Total placeholders replaced: {replacements_made}")

        # DEBUG: Check for any remaining unreplaced placeholders
        remaining_brackets = re.findall(r'\{\[[^\]]+\]\}', prompt)
        if remaining_brackets:
            logger.warning(f"⚠️ Unreplaced placeholders: {remaining_brackets[:5]}")

        return prompt

    def _parse_response(self, response: str) -> Dict[str, Any]:
        """
        Parse AI response into structured document.

        The AI returns the refined proposal as plain text/markdown.
        We extract sections by looking for markdown headers.

        Args:
            response: Raw response from Claude

        Returns:
            Dict with 'generated_proposal' and 'sections'
        """
        # The response should be the refined proposal document
        sections = self._extract_sections_from_text(response)
        
        return {
            "generated_proposal": response,
            "sections": sections,
        }

    def _extract_sections_from_text(self, text: str) -> Dict[str, str]:
        """
        Extract sections from markdown text.

        Looks for section headers:
        - ## Section Title (markdown h2)
        - # Section Title (markdown h1)

        Args:
            text: Markdown text

        Returns:
            Dict of section_title: content
        """
        sections = {}
        current_section = None
        current_content = []

        for line in text.split("\n"):
            stripped_line = line.strip()

            # Check for ## section headers (most common in proposals)
            if stripped_line.startswith("## "):
                if current_section:
                    sections[current_section] = "\n".join(current_content).strip()
                current_section = stripped_line[3:].strip()
                current_content = []
            # Check for # section headers
            elif stripped_line.startswith("# ") and not stripped_line.startswith("## "):
                if current_section:
                    sections[current_section] = "\n".join(current_content).strip()
                current_section = stripped_line[2:].strip()
                current_content = []
            elif current_section:
                current_content.append(line)

        # Don't forget the last section
        if current_section:
            sections[current_section] = "\n".join(current_content).strip()

        logger.info(f"📊 Extracted {len(sections)} sections from text")
        for title in list(sections.keys())[:5]:
            logger.info(f"   ✓ {title}")

        return sections


# ==================== SERVICE INSTANCE ====================

# Global instance for document generation
proposal_document_generator = ProposalDocumentGenerator()
```

---

## Task B2: Modify Worker (`workflow/worker.py`)

**File:** `igad-app/backend/app/tools/proposal_writer/workflow/worker.py`

### B2.1: Add Imports

**Location:** Top of file, after existing imports (~line 38)

**Add:**
```python
# For proposal document generation (Step 4)
from io import BytesIO
from docx import Document
from PyPDF2 import PdfReader

from app.tools.proposal_writer.proposal_document_generation.service import (
    proposal_document_generator,
)
```

**Note:** The `BytesIO`, `Document`, and `PdfReader` imports are needed by `_load_draft_proposal_from_s3()` function. If these are already imported elsewhere in worker.py, skip the duplicates.

---

### B2.2: Add Status Functions

**Location:** In `_set_processing_status()` function (~after line 140)

**Add new elif case:**
```python
    elif analysis_type == "proposal_document":
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="SET proposal_document_status = :status, proposal_document_started_at = :started",
            expression_attribute_values={
                ":status": "processing",
                ":started": datetime.utcnow().isoformat(),
            },
        )
```

**Location:** In `_set_completed_status()` function (~after line 349)

**Add new elif case:**
```python
    elif analysis_type == "proposal_document":
        # Extract the generated proposal content
        proposal_content = result.get("generated_proposal", "")
        sections = result.get("sections", {})
        metadata = result.get("metadata", {})

        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="""
                SET refined_proposal_document = :document,
                    proposal_document_status = :status,
                    proposal_document_completed_at = :completed,
                    updated_at = :updated
            """,
            expression_attribute_values={
                ":document": {
                    "generated_proposal": proposal_content,
                    "sections": sections,
                    "metadata": metadata,
                },
                ":status": "completed",
                ":completed": datetime.utcnow().isoformat(),
                ":updated": datetime.utcnow().isoformat(),
            },
        )
```

**Location:** In `_set_failed_status()` function (~after line 502)

**Add new elif case:**
```python
    elif analysis_type == "proposal_document":
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="""
                SET proposal_document_status = :status,
                    proposal_document_error = :error,
                    proposal_document_failed_at = :failed,
                    updated_at = :updated
            """,
            expression_attribute_values={
                ":status": "failed",
                ":error": error_msg,
                ":failed": datetime.utcnow().isoformat(),
                ":updated": datetime.utcnow().isoformat(),
            },
        )
```

---

### B2.3: Add Handler Function

**Location:** After `_handle_draft_feedback_analysis()` (~line 905)

**Add:**
```python
# ==================== PROPOSAL DOCUMENT GENERATION ====================


def _handle_proposal_document_generation(
    proposal_id: str, event: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Execute proposal document generation with AI refinement.

    Generates a refined proposal based on:
    - Draft proposal content
    - AI-generated section feedback
    - User comments and guidance
    - Selected sections for refinement

    Args:
        proposal_id: Proposal identifier
        event: Lambda event containing:
            - selected_sections: List of section titles to refine
            - user_comments: Dict of {section_title: comment}

    Returns:
        Generated refined proposal result

    Raises:
        Exception: If prerequisites not met or generation fails
    """
    logger.info(f"📋 Processing proposal document generation for: {proposal_id}")

    # Retrieve proposal and validate dependencies
    proposal = db_client.get_item_sync(pk=f"PROPOSAL#{proposal_id}", sk="METADATA")

    if not proposal:
        raise Exception(f"Proposal {proposal_id} not found")

    # Validate prerequisites
    rfp_analysis = proposal.get("rfp_analysis")
    if not rfp_analysis:
        raise Exception("RFP analysis must be completed first")

    draft_feedback = proposal.get("draft_feedback_analysis")
    if not draft_feedback:
        raise Exception("Draft feedback analysis must be completed first")

    # Get section feedback from draft_feedback_analysis
    section_feedback = draft_feedback.get("section_feedback", [])
    if not section_feedback:
        raise Exception("No section feedback found in draft_feedback_analysis")

    # Get selected sections and user comments from event
    selected_sections = event.get("selected_sections", [])
    user_comments = event.get("user_comments", {})

    if not selected_sections:
        raise Exception("At least one section must be selected")

    logger.info("✅ Prerequisites validated")
    logger.info(f"   Selected sections: {len(selected_sections)}")
    logger.info(f"   User comments: {len(user_comments)}")

    # Load draft proposal from S3
    logger.info("📥 Loading draft proposal from S3...")
    draft_proposal = _load_draft_proposal_from_s3(proposal_id, proposal)
    
    if not draft_proposal:
        raise Exception("Failed to load draft proposal from S3")
    
    logger.info(f"   Draft proposal: {len(draft_proposal)} characters")

    _set_processing_status(proposal_id, "proposal_document")

    logger.info("🔍 Starting proposal document generation...")
    result = proposal_document_generator.generate_document(
        proposal_code=proposal_id,
        draft_proposal=draft_proposal,
        section_feedback=section_feedback,
        user_comments=user_comments,
        selected_sections=selected_sections,
    )

    logger.info("✅ Proposal document generation completed successfully")
    logger.info(f"📊 Result keys: {list(result.keys())}")

    _set_completed_status(proposal_id, "proposal_document", result)
    logger.info("💾 Proposal document result saved to DynamoDB")

    return result


def _load_draft_proposal_from_s3(
    proposal_id: str, proposal: Dict[str, Any]
) -> Optional[str]:
    """
    Load draft proposal content from S3.

    Tries to load from draft_proposal folder in S3.
    Supports PDF and DOCX files.

    Args:
        proposal_id: Proposal code
        proposal: Proposal metadata from DynamoDB

    Returns:
        Extracted text content or None if not found
    
    Note:
        Uses imports from module level:
        - os, boto3 (already imported in worker.py)
        - BytesIO from io
        - Document from docx
        - PdfReader from PyPDF2
    """
    # Note: These imports should be added at the top of worker.py (see B2.1)
    from io import BytesIO
    from docx import Document
    from PyPDF2 import PdfReader

    bucket = os.environ.get("PROPOSALS_BUCKET")
    if not bucket:
        logger.error("PROPOSALS_BUCKET not set")
        return None

    s3_client = boto3.client("s3")
    draft_folder = f"{proposal_id}/documents/draft_proposal/"

    try:
        # List files in draft_proposal folder
        response = s3_client.list_objects_v2(Bucket=bucket, Prefix=draft_folder)
        
        if "Contents" not in response or len(response["Contents"]) == 0:
            logger.warning(f"⚠️  No files found in {draft_folder}")
            return None

        # Find the draft file (PDF, DOCX, or TXT)
        draft_file = None
        for obj in response["Contents"]:
            key = obj["Key"]
            if key.lower().endswith((".pdf", ".docx", ".doc", ".txt")):
                draft_file = key
                break

        if not draft_file:
            logger.warning("⚠️  No supported document files found in draft_proposal/")
            return None

        logger.info(f"📄 Found draft file: {draft_file}")

        # Download and extract text
        obj = s3_client.get_object(Bucket=bucket, Key=draft_file)
        file_bytes = obj["Body"].read()

        if draft_file.lower().endswith(".pdf"):
            pdf_file = BytesIO(file_bytes)
            reader = PdfReader(pdf_file)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            return text.strip()

        elif draft_file.lower().endswith(".docx"):
            docx_file = BytesIO(file_bytes)
            document = Document(docx_file)
            text = ""
            for paragraph in document.paragraphs:
                if paragraph.text.strip():
                    text += paragraph.text + "\n"
            for table in document.tables:
                for row in table.rows:
                    row_text = [cell.text.strip() for cell in row.cells]
                    text += " | ".join(row_text) + "\n"
            return text.strip()

        elif draft_file.lower().endswith(".txt"):
            return file_bytes.decode("utf-8")

        else:
            logger.error(f"❌ Unsupported file type: {draft_file}")
            return None

    except Exception as e:
        logger.error(f"❌ Error loading draft proposal: {str(e)}")
        return None
```

---

### B2.4: Update Lambda Handler

**Location:** In `handler()` function, in the routing section (~line 1292-1298)

**Add new elif case after `elif analysis_type == "proposal_template":`:**

```python
        elif analysis_type == "proposal_document":
            _handle_proposal_document_generation(proposal_id, event)
```

---

## Task B3: Modify Routes (`routes.py`)

**File:** `igad-app/backend/app/tools/proposal_writer/routes.py`

### B3.1: Add Pydantic Model

**Location:** After `TemplateGenerationRequest` class (~line 71)

**Add:**
```python
class ProposalDocumentRequest(BaseModel):
    selected_sections: List[str]  # List of section titles to include in refinement
    user_comments: Optional[Dict[str, str]] = None  # Dict of {section_title: comment}
```

---

### B3.2: Add POST Endpoint

**Location:** After the `get_proposal_template_status` endpoint (~line 2173)

**Add:**
```python
@router.post("/{proposal_id}/generate-proposal-document")
async def generate_proposal_document(
    proposal_id: str, request: ProposalDocumentRequest, user=Depends(get_current_user)
):
    """
    Generate refined proposal document based on AI feedback and user comments.

    This endpoint:
    1. Validates prerequisites (draft_feedback_analysis exists)
    2. Saves selected_sections and user_comments to DynamoDB
    3. Sets proposal_document_status to "processing"
    4. Invokes Worker Lambda asynchronously
    5. Returns immediately with status

    Frontend should poll /proposal-document-status for completion

    Prerequisites:
    - RFP analysis must be completed
    - Draft feedback analysis must be completed
    - At least one section must be selected

    Request body:
    - selected_sections: List of section titles to refine
    - user_comments: Optional dict of user comments per section
    """
    try:
        user_id = user.get("user_id")
        print(f"🟢 Generate proposal document request for proposal: {proposal_id}")

        # Verify proposal ownership using helper
        pk, proposal_code, proposal = await _verify_proposal_access(proposal_id, user)

        # Validate prerequisites
        if not proposal.get("rfp_analysis"):
            raise HTTPException(
                status_code=400, detail="RFP analysis must be completed first (Step 1)"
            )

        if not proposal.get("draft_feedback_analysis"):
            raise HTTPException(
                status_code=400,
                detail="Draft feedback analysis must be completed first (Step 4)",
            )

        # Validate selected sections
        selected_sections = request.selected_sections
        if not selected_sections or len(selected_sections) == 0:
            raise HTTPException(
                status_code=400, detail="At least one section must be selected"
            )

        # Security: Validate comment length (max 2000 chars per section)
        if request.user_comments:
            for section_title, comment in request.user_comments.items():
                if len(comment) > 2000:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Comment for '{section_title}' exceeds maximum length of 2000 characters"
                    )

        print(f"   Selected sections: {len(selected_sections)}")
        if request.user_comments:
            print(f"   User comments: {len(request.user_comments)}")

        # Save selection data to DynamoDB for reference
        await db_client.update_item(
            pk=pk,
            sk="METADATA",
            update_expression="""
                SET proposal_document_status = :status, 
                    proposal_document_started_at = :started,
                    proposal_document_selected_sections = :sections,
                    proposal_document_user_comments = :comments
            """,
            expression_attribute_values={
                ":status": "processing",
                ":started": datetime.utcnow().isoformat(),
                ":sections": selected_sections,
                ":comments": request.user_comments or {},
            },
        )

        # Invoke Worker Lambda asynchronously
        worker_function = os.getenv("WORKER_FUNCTION_NAME")

        payload = {
            "analysis_type": "proposal_document",
            "proposal_id": proposal_code,
            "user_id": user_id,
            "selected_sections": selected_sections,
            "user_comments": request.user_comments or {},
        }

        print(
            f"📡 Invoking worker lambda for proposal document generation: {proposal_code}"
        )

        lambda_client.invoke(
            FunctionName=worker_function,
            InvocationType="Event",  # Asynchronous
            Payload=json.dumps(payload),
        )

        print(f"✅ Worker lambda invoked successfully for {proposal_code}")

        return {
            "status": "processing",
            "message": "Proposal document generation started. Poll /proposal-document-status for updates.",
            "started_at": datetime.utcnow().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error starting proposal document generation: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
```

---

### B3.3: Add GET Status Endpoint

**Location:** After the POST endpoint

**Add:**
```python
@router.get("/{proposal_id}/proposal-document-status")
async def get_proposal_document_status(
    proposal_id: str, user=Depends(get_current_user)
):
    """
    Poll for proposal document generation completion status.

    Returns:
    - status: "not_started" | "processing" | "completed" | "failed"
    - started_at: ISO timestamp when generation started
    - completed_at: ISO timestamp when generation completed
    - error: Error message (if failed)
    - data: Generated proposal document content (if completed)
    """
    try:
        # Verify proposal ownership using helper
        pk, proposal_code, proposal = await _verify_proposal_access(proposal_id, user)

        status = proposal.get("proposal_document_status", "not_started")

        response = {
            "status": status,
            "started_at": proposal.get("proposal_document_started_at"),
            "completed_at": proposal.get("proposal_document_completed_at"),
            "error": proposal.get("proposal_document_error"),
        }

        if status == "completed":
            refined_doc = proposal.get("refined_proposal_document", {})
            response["data"] = {
                "generated_proposal": refined_doc.get("generated_proposal", ""),
                "sections": refined_doc.get("sections", {}),
                "metadata": refined_doc.get("metadata", {}),
            }

        return response

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting proposal document status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check status: {str(e)}")
```

---

# PART 2: FRONTEND IMPLEMENTATION

## Task F1: Modify `proposalService.ts`

**File:** `igad-app/frontend/src/tools/proposal-writer/services/proposalService.ts`

### F1.1: Add New Methods

**Location:** After `getDraftFeedbackStatus()` method (~line 852)

**Add:**
```typescript
  // ==================== Proposal Document Generation (Step 4) ====================

  /**
   * Start proposal document generation (Step 4 - Download with AI feedback)
   *
   * Generates a refined proposal document based on:
   * - AI-generated section feedback from draft analysis
   * - User comments and guidance per section
   * - Selected sections to refine
   *
   * Prerequisites:
   * - RFP analysis must be completed (Step 1)
   * - Draft feedback analysis must be completed (Step 4)
   *
   * @param proposalId - Proposal UUID or code (PROP-YYYYMMDD-XXXX)
   * @param selectedSections - Array of section titles to include in refinement
   * @param userComments - Optional dict of user comments per section
   * @returns Status response (processing or error)
   * @throws Error if prerequisites not met or generation fails to start
   *
   * @example
   * ```typescript
   * const result = await proposalService.generateProposalDocument(
   *   'abc-123',
   *   ['Executive Summary', 'Methodology'],
   *   { 'Executive Summary': 'Focus on climate resilience' }
   * )
   * if (result.status === 'processing') {
   *   // Poll for completion using getProposalDocumentStatus()
   * }
   * ```
   */
  async generateProposalDocument(
    proposalId: string,
    selectedSections: string[],
    userComments?: Record<string, string>
  ): Promise<{
    status: string
    message: string
    started_at?: string
  }> {
    const response = await apiClient.post(
      `/api/proposals/${proposalId}/generate-proposal-document`,
      {
        selected_sections: selectedSections,
        user_comments: userComments || null,
      }
    )
    return response.data
  }

  /**
   * Poll proposal document generation status
   *
   * Check the completion status of an ongoing proposal document generation.
   * Call this repeatedly (with polling) until status is 'completed' or 'failed'.
   *
   * @param proposalId - Proposal UUID or code (PROP-YYYYMMDD-XXXX)
   * @returns Current status, data (if completed), or error (if failed)
   * @throws Error if unable to check status
   *
   * @example
   * ```typescript
   * const status = await proposalService.getProposalDocumentStatus('abc-123')
   * if (status.status === 'completed') {
   *   const refinedProposal = status.data?.generated_proposal
   *   // Generate DOCX and trigger download
   * }
   * ```
   */
  async getProposalDocumentStatus(proposalId: string): Promise<{
    status: string
    data?: {
      generated_proposal: string
      sections: Record<string, string>
      metadata: {
        proposal_code: string
        sections_refined: number
        generation_time_seconds: number
        generated_at: string
      }
    }
    error?: string
    started_at?: string
    completed_at?: string
  }> {
    const response = await apiClient.get(
      `/api/proposals/${proposalId}/proposal-document-status`
    )
    return response.data
  }
```

---

## Task F2: Modify `Step4ProposalReview.tsx`

**File:** `igad-app/frontend/src/tools/proposal-writer/pages/Step4ProposalReview.tsx`

### F2.1: Add New Imports

**Location:** Top of file, with other lucide-react imports (~line 8-23)

**Add to existing import (if not present):**
```typescript
import { Check, Edit3 } from 'lucide-react'
```

**Add docx imports (copy from Step2ConceptReview):**
```typescript
// Document generation
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx'
```

---

### F2.2: Add New State Variables

**Location:** Inside `Step4ProposalReview` component, after existing useState declarations

**Add:**
```typescript
  // Section selection state for "Download with AI feedback"
  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [userComments, setUserComments] = useState<Record<string, string>>({})
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false)
  const [generationProgress, setGenerationProgress] = useState<{
    step: number
    total: number
    message: string
    description: string
  } | null>(null)
```

---

### F2.3: Initialize Selected Sections (useEffect)

**Location:** After existing useEffects

**Add:**
```typescript
  // Initialize selected sections when feedback data changes
  // Pre-select all sections with "NEEDS_IMPROVEMENT" status
  useEffect(() => {
    if (feedbackData.length > 0) {
      const needsImprovement = feedbackData
        .filter(section => section.status === 'NEEDS_IMPROVEMENT')
        .map(section => section.title)
      setSelectedSections(needsImprovement)
    }
  }, [feedbackData])
```

---

### F2.4: Add Handler Functions

**Location:** After existing handlers (before the return statement)

**Add these functions:**

#### F2.4.1: `handleToggleSection` - Toggle section selection

```typescript
  /**
   * Toggle section selection for AI feedback refinement
   */
  const handleToggleSection = useCallback((sectionTitle: string) => {
    setSelectedSections(prev =>
      prev.includes(sectionTitle)
        ? prev.filter(s => s !== sectionTitle)
        : [...prev, sectionTitle]
    )
  }, [])
```

#### F2.4.2: `handleCommentChange` - Handle user comment change for a section

```typescript
  /**
   * Handle user comment change for a specific section
   */
  const handleCommentChange = useCallback((sectionTitle: string, comment: string) => {
    setUserComments(prev => ({ ...prev, [sectionTitle]: comment }))
  }, [])
```

#### F2.4.3: `parseInlineFormatting` - Parse markdown inline formatting to TextRun objects

```typescript
  /**
   * Parse inline markdown formatting (bold, italic, code) to DOCX TextRun objects
   */
  const parseInlineFormatting = useCallback((text: string): TextRun[] => {
    const runs: TextRun[] = []
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|[^*`]+)/g
    const matches = text.match(regex)

    if (!matches) {
      return [new TextRun({ text })]
    }

    matches.forEach(match => {
      if (match.startsWith('**') && match.endsWith('**')) {
        // Bold text
        runs.push(
          new TextRun({
            text: match.slice(2, -2),
            bold: true,
          })
        )
      } else if (match.startsWith('*') && match.endsWith('*')) {
        // Italic text
        runs.push(
          new TextRun({
            text: match.slice(1, -1),
            italics: true,
          })
        )
      } else if (match.startsWith('`') && match.endsWith('`')) {
        // Code text
        runs.push(
          new TextRun({
            text: match.slice(1, -1),
            font: 'Courier New',
            color: '166534',
          })
        )
      } else {
        // Normal text
        runs.push(new TextRun({ text: match }))
      }
    })

    return runs
  }, [])
```

#### F2.4.4: `markdownToParagraphs` - Convert markdown to DOCX paragraphs

```typescript
  /**
   * Convert markdown text to DOCX Paragraph and Table elements
   * Handles headings, lists, tables, and inline formatting
   */
  const markdownToParagraphs = useCallback(
    (markdown: string): (Paragraph | Table)[] => {
      const lines = markdown.split('\n')
      const elements: (Paragraph | Table)[] = []
      let tableRows: string[][] = []
      let tableHeaders: string[] = []
      let inTable = false

      // Helper to check if line is a table row
      const isTableRow = (line: string): boolean => {
        const trimmed = line.trim()
        return trimmed.includes('|') && (trimmed.startsWith('|') || trimmed.split('|').length >= 2)
      }

      // Helper to check if line is table separator
      const isTableSeparator = (line: string): boolean => {
        const trimmed = line.trim()
        return /^\|?[\s:-]+\|[\s|:-]+\|?$/.test(trimmed)
      }

      // Helper to parse table row into cells
      const parseTableRow = (line: string): string[] => {
        return line
          .split('|')
          .map(cell => cell.trim())
          .filter((_, index, arr) => {
            if (index === 0 && arr[0] === '') {
              return false
            }
            if (index === arr.length - 1 && arr[arr.length - 1] === '') {
              return false
            }
            return true
          })
      }

      // Helper to flush table to elements
      const flushTable = () => {
        if (tableHeaders.length > 0 || tableRows.length > 0) {
          const rows: TableRow[] = []

          // Add header row
          if (tableHeaders.length > 0) {
            rows.push(
              new TableRow({
                tableHeader: true,
                children: tableHeaders.map(
                  header =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: header,
                              bold: true,
                              size: 22,
                            }),
                          ],
                        }),
                      ],
                      shading: { fill: 'F3F4F6' },
                    })
                ),
              })
            )
          }

          // Add data rows
          tableRows.forEach(row => {
            rows.push(
              new TableRow({
                children: row.map(
                  cell =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: parseInlineFormatting(cell),
                        }),
                      ],
                    })
                ),
              })
            )
          })

          // Create table with borders
          elements.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows,
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
                left: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
                right: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
              },
            })
          )

          // Add spacing after table
          elements.push(new Paragraph({ text: '', spacing: { after: 200 } }))

          tableHeaders = []
          tableRows = []
          inTable = false
        }
      }

      lines.forEach(line => {
        // Check for table rows
        if (isTableRow(line)) {
          if (isTableSeparator(line)) {
            inTable = true
            return
          }

          if (!inTable && tableHeaders.length === 0) {
            tableHeaders = parseTableRow(line)
          } else {
            inTable = true
            tableRows.push(parseTableRow(line))
          }
          return
        }

        // Flush table if we hit a non-table line
        if (inTable || tableHeaders.length > 0) {
          flushTable()
        }

        if (line.startsWith('#### ')) {
          elements.push(
            new Paragraph({
              children: parseInlineFormatting(line.substring(5)),
              heading: HeadingLevel.HEADING_4,
              spacing: { before: 200, after: 100 },
            })
          )
        } else if (line.startsWith('### ')) {
          elements.push(
            new Paragraph({
              children: parseInlineFormatting(line.substring(4)),
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 240, after: 120 },
            })
          )
        } else if (line.startsWith('## ')) {
          elements.push(
            new Paragraph({
              children: parseInlineFormatting(line.substring(3)),
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 360, after: 160 },
            })
          )
        } else if (line.startsWith('# ')) {
          elements.push(
            new Paragraph({
              children: parseInlineFormatting(line.substring(2)),
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 480, after: 240 },
            })
          )
        } else if (line.match(/^[*-]\s+/)) {
          const bulletText = line.replace(/^[*-]\s+/, '')
          elements.push(
            new Paragraph({
              children: parseInlineFormatting(bulletText),
              bullet: { level: 0 },
              spacing: { after: 60, line: 276 },
            })
          )
        } else if (line.match(/^\s{2,}[*-]\s+/)) {
          const bulletText = line.replace(/^\s{2,}[*-]\s+/, '')
          elements.push(
            new Paragraph({
              children: parseInlineFormatting(bulletText),
              bullet: { level: 1 },
              spacing: { after: 60, line: 276 },
            })
          )
        } else if (line.trim() === '') {
          elements.push(
            new Paragraph({
              text: '',
              spacing: { after: 120 },
            })
          )
        } else if (line.trim()) {
          elements.push(
            new Paragraph({
              children: parseInlineFormatting(line.trim()),
              spacing: { after: 140, line: 276 },
            })
          )
        }
      })

      // Flush any remaining table
      flushTable()

      return elements.length > 0 ? elements : [new Paragraph({ text: 'No content available' })]
    },
    [parseInlineFormatting]
  )
```

#### F2.4.5: `generateAndDownloadDocx` - Generate DOCX from markdown and trigger download

```typescript
  /**
   * Generate DOCX document from markdown content and trigger download
   */
  const generateAndDownloadDocx = useCallback(
    async (markdownContent: string, filename: string) => {
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      // Build document with header and formatted content
      const documentParagraphs: (Paragraph | Table)[] = []

      // Add title
      documentParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Refined Proposal Document',
              bold: true,
              size: 32,
              color: '166534',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      )

      // Add generation date
      documentParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Generated on ${currentDate}`,
              italics: true,
              size: 20,
              color: '6B7280',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      )

      // Add divider
      documentParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '─'.repeat(50),
              color: 'E5E7EB',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      )

      // Add main content
      const contentParagraphs = markdownToParagraphs(markdownContent)
      documentParagraphs.push(...contentParagraphs)

      // Create document
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 1440, // 1 inch
                  right: 1440,
                  bottom: 1440,
                  left: 1440,
                },
              },
            },
            children: documentParagraphs,
          },
        ],
      })

      // Generate and download
      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    },
    [markdownToParagraphs]
  )
```

#### F2.4.6: `handleDownloadWithFeedback` - Main handler for "Download with AI feedback"

```typescript
  /**
   * Handle "Download with AI feedback" button click
   * Triggers proposal document generation with selected sections and user comments
   */
  const handleDownloadWithFeedback = useCallback(async () => {
    if (selectedSections.length === 0) {
      toast.error('Please select at least one section to refine')
      return
    }

    setIsGeneratingDocument(true)
    setGenerationProgress({
      step: 1,
      total: 4,
      message: 'Starting document generation...',
      description: 'Preparing your refined proposal',
    })

    try {
      // Step 1: Start generation
      setGenerationProgress({
        step: 1,
        total: 4,
        message: 'Initiating AI refinement...',
        description: 'Sending selected sections and comments to AI',
      })

      await proposalService.generateProposalDocument(
        proposalId,
        selectedSections,
        userComments
      )

      // Step 2: Poll for completion
      setGenerationProgress({
        step: 2,
        total: 4,
        message: 'AI is refining your proposal...',
        description: 'This may take 2-3 minutes for large proposals',
      })

      const maxAttempts = 60 // 3 minutes with 3-second intervals
      let attempts = 0
      let completed = false

      while (attempts < maxAttempts && !completed) {
        await new Promise(resolve => setTimeout(resolve, 3000)) // Wait 3 seconds

        const statusResponse = await proposalService.getProposalDocumentStatus(proposalId)

        if (statusResponse.status === 'completed') {
          completed = true

          // Step 3: Process result
          setGenerationProgress({
            step: 3,
            total: 4,
            message: 'Processing refined document...',
            description: 'Preparing document for download',
          })

          const refinedProposal = statusResponse.data?.generated_proposal

          if (!refinedProposal) {
            throw new Error('No refined proposal content received')
          }

          // Step 4: Generate and download DOCX
          setGenerationProgress({
            step: 4,
            total: 4,
            message: 'Generating DOCX file...',
            description: 'Your download will begin shortly',
          })

          const filename = `Refined_Proposal_${proposalId}_${new Date().toISOString().slice(0, 10)}.docx`
          await generateAndDownloadDocx(refinedProposal, filename)

          toast.success('Refined proposal downloaded successfully!')
        } else if (statusResponse.status === 'failed') {
          throw new Error(statusResponse.error || 'Document generation failed')
        } else {
          // Still processing, update progress message
          const elapsedSeconds = attempts * 3
          const elapsedMinutes = Math.floor(elapsedSeconds / 60)
          const remainingSeconds = elapsedSeconds % 60

          setGenerationProgress({
            step: 2,
            total: 4,
            message: 'AI is refining your proposal...',
            description: `Elapsed: ${elapsedMinutes}m ${remainingSeconds}s`,
          })
        }

        attempts++
      }

      if (!completed) {
        throw new Error('Document generation timed out. Please try again.')
      }
    } catch (error) {
      console.error('Error generating document:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to generate refined proposal. Please try again.'
      )
    } finally {
      setIsGeneratingDocument(false)
      setGenerationProgress(null)
    }
  }, [
    selectedSections,
    userComments,
    proposalId,
    generateAndDownloadDocx,
  ])
```

---

### F2.5: Remove "Re-analyze" Button

**Location:** In the action bar section (~lines 1764-1772)

**Remove this entire button:**
```tsx
<button
  type="button"
  className={styles.reanalyzeButton}
  onClick={handleReanalyze}
  disabled={isAnalyzing}
>
  <RefreshCw size={16} className={isAnalyzing ? styles.spinning : ''} />
  Re-analyze
</button>
```

**Also remove the same button from the bottom action bar if present.**

---

### F2.6: Modify `SectionFeedbackItem` Component

**Update the component to include:**
1. Checkbox for section selection
2. Textarea for user comments
3. Toggle handlers

**Props interface update:**
```typescript
interface SectionFeedbackItemProps {
  section: FeedbackSection
  isExpanded: boolean
  onToggle: () => void
  isSelected: boolean
  onToggleSelection: () => void
  userComment?: string
  onCommentChange: (comment: string) => void
}
```

---

### F2.7: Update Section Rendering

**Location:** Where `SectionFeedbackItem` components are rendered (~lines 1800-1808)

**Update to pass new props:**
```tsx
{feedbackData.map(section => (
  <SectionFeedbackItem
    key={section.id}
    section={section}
    isExpanded={expandedSections.includes(section.id)}
    onToggle={() => toggleSection(section.id)}
    isSelected={selectedSections.includes(section.title)}
    onToggleSelection={() => handleToggleSection(section.title)}
    userComment={userComments[section.title]}
    onCommentChange={comment => handleCommentChange(section.title, comment)}
  />
))}
```

---

### F2.8: Add Selection Counter

**Location:** Above the feedback list, after the card header

**Add:**
```tsx
{/* Selection counter */}
<div className={styles.selectionCount}>
  <strong>{selectedSections.length}</strong> sections selected for refinement
</div>
```

---

### F2.9: Update "Download with AI feedback" Button

**Location:** In the action bars

**Update the button to use the new handler and disable when no sections selected:**
```tsx
<button
  type="button"
  className={styles.downloadFeedbackButton}
  onClick={handleDownloadWithFeedback}
  disabled={selectedSections.length === 0 || isGeneratingDocument}
>
  {isGeneratingDocument ? (
    <>
      <RefreshCw size={16} className={styles.spinning} />
      Generating...
    </>
  ) : (
    <>
      <Download size={16} />
      Download with AI feedback
    </>
  )}
</button>
```

---

### F2.10: Add Generation Progress Modal

**Location:** At the top of the JSX return, after the existing AnalysisProgressModal

**Add:**
```tsx
{/* Document Generation Progress Modal */}
{isGeneratingDocument && generationProgress && (
  <AnalysisProgressModal
    isOpen={isGeneratingDocument}
    progress={generationProgress}
  />
)}
```

---

### F2.11: Add CSS Styles

**File:** `igad-app/frontend/src/tools/proposal-writer/pages/step4-proposal-review.module.css`

**Add these styles (copy from step2-concept-review.module.css if not present):**
```css
/* Checkbox styles */
.checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.checkbox:hover {
  border-color: #16a34a;
}

.checkboxChecked {
  background-color: #16a34a;
  border-color: #16a34a;
}

/* Selection counter */
.selectionCount {
  padding: 12px 16px;
  background: #f0fdf4;
  border-radius: 8px;
  color: #166534;
  font-size: 14px;
  margin-bottom: 16px;
}

/* Comment textarea */
.commentsSection {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  margin-top: 16px;
}

.commentTextarea {
  width: 100%;
  min-height: 80px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
}

.commentTextarea:focus {
  outline: none;
  border-color: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
}

.subsectionIcon {
  color: #6b7280;
  flex-shrink: 0;
  margin-top: 4px;
}

/* Spinning animation for loading states */
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
```

---

# EXECUTION ORDER

## Backend (Execute in Order)

1. **B1.1** - Create `__init__.py`
2. **B1.2** - Create `config.py`
3. **B1.3** - Create `service.py`
4. **B2.1** - Add import to worker.py
5. **B2.2** - Add status functions to worker.py
6. **B2.3** - Add handler function to worker.py
7. **B2.4** - Update Lambda handler routing
8. **B3.1** - Add Pydantic model to routes.py
9. **B3.2** - Add POST endpoint to routes.py
10. **B3.3** - Add GET endpoint to routes.py

## Frontend (Execute in Order)

1. **F1.1** - Add service methods to proposalService.ts
2. **F2.1** - Add imports to Step4ProposalReview.tsx
3. **F2.2** - Add state variables
4. **F2.3** - Add useEffect for initialization
5. **F2.4** - Add handler functions (copy markdownToParagraphs from Step2)
6. **F2.5** - Remove "Re-analyze" button
7. **F2.6** - Modify SectionFeedbackItem component
8. **F2.7** - Update section rendering with new props
9. **F2.8** - Add selection counter
10. **F2.9** - Update download button
11. **F2.10** - Add generation progress modal
12. **F2.11** - Add CSS styles

---

# TESTING CHECKLIST

## Backend Testing

- [ ] New service module imports correctly
- [ ] Prompt loads from DynamoDB with correct filters
- [ ] Context preparation filters to selected sections only
- [ ] Bedrock invocation works with configured model
- [ ] Response parsing extracts sections correctly
- [ ] Worker handler processes proposal_document type
- [ ] Status updates correctly (processing -> completed/failed)
- [ ] POST endpoint validates prerequisites
- [ ] POST endpoint invokes Lambda asynchronously
- [ ] GET endpoint returns correct status and data

## Frontend Testing

- [ ] Section checkboxes toggle selection correctly
- [ ] Pre-selection of NEEDS_IMPROVEMENT sections works
- [ ] User comments are captured per section
- [ ] Download button disabled when no sections selected
- [ ] Progress modal displays during generation
- [ ] Polling completes or times out appropriately
- [ ] DOCX generation and download works
- [ ] Error handling displays user-friendly messages
- [ ] Re-analyze button is removed

---

# PROMPT CONFIGURATION

**IMPORTANT:** Before testing, ensure the prompt is configured in DynamoDB with:

| Attribute | Value |
|-----------|-------|
| `section` | `"proposal_writer"` |
| `sub_section` | `"step-4"` |
| `category` (in categories array) | `"Proposal Regeneration"` |
| `is_active` | `true` |

The prompt content should be from: `specs/tools/proposal-writer/step-4/prompt-prosal-document.txt`

---

# REFERENCE FILES

| File | Purpose |
|------|---------|
| `specs/tools/proposal-writer/step-4/proposal-document-generation.md` | Technical specification |
| `specs/tools/proposal-writer/step-4/prompt-prosal-document.txt` | Prompt template |
| `igad-app/backend/app/tools/proposal_writer/concept_document_generation/` | Reference pattern for backend service |
| `igad-app/frontend/src/tools/proposal-writer/pages/Step2ConceptReview.tsx` | Reference pattern for frontend UI |
