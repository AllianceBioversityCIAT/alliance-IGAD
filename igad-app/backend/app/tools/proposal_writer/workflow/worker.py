"""
Proposal Writer Analysis Worker

Handles long-running asynchronous analysis tasks:
- RFP document analysis and extraction
- Concept evaluation and alignment assessment
- Concept document generation with AI

The worker coordinates multiple analysis steps and manages retry logic with
exponential backoff for long-running operations.
"""

import json
import logging
import time
import traceback
from datetime import datetime
from typing import Any, Dict, Optional

from app.database.client import db_client
from app.shared.vectors.service import VectorEmbeddingsService
from app.tools.proposal_writer.concept_document_generation.service import (
    concept_generator,
)
from app.tools.proposal_writer.concept_evaluation.service import SimpleConceptAnalyzer
from app.tools.proposal_writer.proposal_draft_feedback.service import (
    DraftFeedbackService,
)
from app.tools.proposal_writer.proposal_template_generation.service import (
    proposal_template_generator,
)
from app.tools.proposal_writer.reference_proposals_analysis.service import (
    ReferenceProposalsAnalyzer,
)
from app.tools.proposal_writer.rfp_analysis.service import SimpleRFPAnalyzer
from app.tools.proposal_writer.structure_workplan.service import (
    StructureWorkplanService,
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


# ==================== DYNAMODB STATUS UPDATES ====================


def _set_processing_status(
    proposal_id: str,
    analysis_type: str,
) -> None:
    """
    Set proposal analysis status to 'processing' with timestamp.

    Args:
        proposal_id: Proposal identifier
        analysis_type: Type of analysis ('rfp', 'concept', 'concept_document', 'reference_proposals', 'structure_workplan')

    Raises:
        Exception: If DynamoDB update fails
    """
    if analysis_type == "rfp":
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="SET analysis_status_rfp = :status, rfp_analysis_started_at = :started",
            expression_attribute_values={
                ":status": "processing",
                ":started": datetime.utcnow().isoformat(),
            },
        )
    elif analysis_type == "concept":
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="SET analysis_status_concept = :status, concept_analysis_started_at = :started",
            expression_attribute_values={
                ":status": "processing",
                ":started": datetime.utcnow().isoformat(),
            },
        )
    elif analysis_type == "concept_document":
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="SET concept_document_status = :status, concept_document_started_at = :started",
            expression_attribute_values={
                ":status": "processing",
                ":started": datetime.utcnow().isoformat(),
            },
        )
    elif analysis_type == "reference_proposals":
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="SET analysis_status_reference_proposals = :status, reference_proposals_started_at = :started",
            expression_attribute_values={
                ":status": "processing",
                ":started": datetime.utcnow().isoformat(),
            },
        )
    elif analysis_type == "existing_work":
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="SET analysis_status_existing_work = :status, existing_work_started_at = :started",
            expression_attribute_values={
                ":status": "processing",
                ":started": datetime.utcnow().isoformat(),
            },
        )
    elif analysis_type == "structure_workplan":
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="SET analysis_status_structure_workplan = :status, structure_workplan_started_at = :started",
            expression_attribute_values={
                ":status": "processing",
                ":started": datetime.utcnow().isoformat(),
            },
        )
    elif analysis_type == "draft_feedback":
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="SET analysis_status_draft_feedback = :status, draft_feedback_started_at = :started",
            expression_attribute_values={
                ":status": "processing",
                ":started": datetime.utcnow().isoformat(),
            },
        )
    elif analysis_type == "proposal_template":
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="SET proposal_template_status = :status, proposal_template_started_at = :started",
            expression_attribute_values={
                ":status": "processing",
                ":started": datetime.utcnow().isoformat(),
            },
        )
    elif analysis_type == "vectorize_document":
        # Vectorization status is tracked per-file in vectorization_status map
        pass  # Status is handled in _handle_document_vectorization


def _set_completed_status(
    proposal_id: str,
    analysis_type: str,
    result: Dict[str, Any],
) -> None:
    """
    Set proposal analysis status to 'completed' and save result.

    Args:
        proposal_id: Proposal identifier
        analysis_type: Type of analysis ('rfp', 'concept', 'concept_document', 'reference_proposals', 'structure_workplan')
        result: Analysis result to save

    Raises:
        Exception: If DynamoDB update fails
    """
    if analysis_type == "rfp":
        # Log result size for debugging
        result_json = json.dumps(result)
        result_size_kb = len(result_json.encode("utf-8")) / 1024
        print(f"📊 RFP analysis result size: {result_size_kb:.2f} KB")

        if result_size_kb > 350:
            print(
                f"⚠️  WARNING: Result size ({result_size_kb:.2f} KB) is close to DynamoDB 400KB limit!"
            )

        try:
            db_client.update_item_sync(
                pk=f"PROPOSAL#{proposal_id}",
                sk="METADATA",
                update_expression="""
                    SET rfp_analysis = :analysis,
                        analysis_status_rfp = :status,
                        rfp_analysis_completed_at = :completed,
                        updated_at = :updated
                """,
                expression_attribute_values={
                    ":analysis": result,
                    ":status": "completed",
                    ":completed": datetime.utcnow().isoformat(),
                    ":updated": datetime.utcnow().isoformat(),
                },
            )
            print("✅ Successfully saved RFP analysis to DynamoDB")
        except Exception as e:
            print("❌ CRITICAL: Failed to save RFP analysis to DynamoDB!")
            print(f"   Error: {str(e)}")
            print(f"   Result size: {result_size_kb:.2f} KB")
            print(f"   Result keys: {list(result.keys())}")
            raise
    elif analysis_type == "concept":
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="""
                SET concept_analysis = :analysis,
                    analysis_status_concept = :status,
                    concept_analysis_completed_at = :completed,
                    updated_at = :updated
            """,
            expression_attribute_values={
                ":analysis": result,
                ":status": "completed",
                ":completed": datetime.utcnow().isoformat(),
                ":updated": datetime.utcnow().isoformat(),
            },
        )
    elif analysis_type == "concept_document":
        concept_evaluation = result.get("concept_evaluation", {})
        document = result.get("document", {})
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="""
                SET concept_evaluation = :evaluation,
                    concept_document_v2 = :document,
                    concept_document_status = :status,
                    concept_document_completed_at = :completed,
                    updated_at = :updated
            """,
            expression_attribute_values={
                ":evaluation": concept_evaluation,
                ":document": document,
                ":status": "completed",
                ":completed": datetime.utcnow().isoformat(),
                ":updated": datetime.utcnow().isoformat(),
            },
        )
    elif analysis_type == "reference_proposals":
        # Extract just the analysis content (avoid duplication)
        analysis_data = result.get("reference_proposal_analysis", {})
        documents_analyzed = result.get("documents_analyzed", 0)

        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="""
                SET reference_proposal_analysis = :analysis,
                    reference_documents_analyzed = :docs_count,
                    analysis_status_reference_proposals = :status,
                    reference_proposals_completed_at = :completed,
                    updated_at = :updated
            """,
            expression_attribute_values={
                ":analysis": analysis_data,
                ":docs_count": documents_analyzed,
                ":status": "completed",
                ":completed": datetime.utcnow().isoformat(),
                ":updated": datetime.utcnow().isoformat(),
            },
        )
    elif analysis_type == "existing_work":
        # Extract just the analysis content (avoid duplication)
        analysis_data = result.get("existing_work_analysis", {})
        documents_analyzed = result.get("documents_analyzed", 0)

        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="""
                SET existing_work_analysis = :analysis,
                    existing_work_documents_analyzed = :docs_count,
                    analysis_status_existing_work = :status,
                    existing_work_completed_at = :completed,
                    updated_at = :updated
            """,
            expression_attribute_values={
                ":analysis": analysis_data,
                ":docs_count": documents_analyzed,
                ":status": "completed",
                ":completed": datetime.utcnow().isoformat(),
                ":updated": datetime.utcnow().isoformat(),
            },
        )
    elif analysis_type == "structure_workplan":
        # Extract just the analysis content (avoid duplication)
        analysis_data = result.get("structure_workplan_analysis", {})

        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="""
                SET structure_workplan_analysis = :analysis,
                    analysis_status_structure_workplan = :status,
                    structure_workplan_completed_at = :completed,
                    updated_at = :updated
            """,
            expression_attribute_values={
                ":analysis": analysis_data,
                ":status": "completed",
                ":completed": datetime.utcnow().isoformat(),
                ":updated": datetime.utcnow().isoformat(),
            },
        )
    elif analysis_type == "draft_feedback":
        # Extract just the analysis content (avoid duplication)
        analysis_data = result.get("draft_feedback_analysis", {})

        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="""
                SET draft_feedback_analysis = :analysis,
                    analysis_status_draft_feedback = :status,
                    draft_feedback_completed_at = :completed,
                    updated_at = :updated
            """,
            expression_attribute_values={
                ":analysis": analysis_data,
                ":status": "completed",
                ":completed": datetime.utcnow().isoformat(),
                ":updated": datetime.utcnow().isoformat(),
            },
        )
    elif analysis_type == "proposal_template":
        # Extract the generated proposal content
        proposal_content = result.get("generated_proposal", "")
        sections = result.get("sections", {})
        metadata = result.get("metadata", {})
        s3_url = result.get("s3_url", "")

        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="""
                SET proposal_template_content = :content,
                    proposal_template_sections = :sections,
                    proposal_template_metadata = :metadata,
                    proposal_template_s3_url = :s3_url,
                    proposal_template_status = :status,
                    proposal_template_completed_at = :completed,
                    updated_at = :updated
            """,
            expression_attribute_values={
                ":content": proposal_content,
                ":sections": sections,
                ":metadata": metadata,
                ":s3_url": s3_url,
                ":status": "completed",
                ":completed": datetime.utcnow().isoformat(),
                ":updated": datetime.utcnow().isoformat(),
            },
        )


def _set_failed_status(
    proposal_id: str,
    analysis_type: str,
    error_msg: str,
) -> None:
    """
    Set proposal analysis status to 'failed' and save error details.

    Args:
        proposal_id: Proposal identifier
        analysis_type: Type of analysis ('rfp', 'concept', 'concept_document', 'reference_proposals', 'structure_workplan')
        error_msg: Error message to save

    Raises:
        Exception: If DynamoDB update fails
    """
    if analysis_type == "rfp":
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="""
                SET analysis_status_rfp = :status,
                    rfp_analysis_error = :error,
                    rfp_analysis_failed_at = :failed,
                    updated_at = :updated
            """,
            expression_attribute_values={
                ":status": "failed",
                ":error": error_msg,
                ":failed": datetime.utcnow().isoformat(),
                ":updated": datetime.utcnow().isoformat(),
            },
        )
    elif analysis_type == "concept":
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="""
                SET analysis_status_concept = :status,
                    concept_analysis_error = :error,
                    concept_analysis_failed_at = :failed,
                    updated_at = :updated
            """,
            expression_attribute_values={
                ":status": "failed",
                ":error": error_msg,
                ":failed": datetime.utcnow().isoformat(),
                ":updated": datetime.utcnow().isoformat(),
            },
        )
    elif analysis_type == "concept_document":
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="""
                SET concept_document_status = :status,
                    concept_document_error = :error,
                    concept_document_failed_at = :failed,
                    updated_at = :updated
            """,
            expression_attribute_values={
                ":status": "failed",
                ":error": error_msg,
                ":failed": datetime.utcnow().isoformat(),
                ":updated": datetime.utcnow().isoformat(),
            },
        )
    elif analysis_type == "reference_proposals":
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="""
                SET analysis_status_reference_proposals = :status,
                    reference_proposals_error = :error,
                    reference_proposals_failed_at = :failed,
                    updated_at = :updated
            """,
            expression_attribute_values={
                ":status": "failed",
                ":error": error_msg,
                ":failed": datetime.utcnow().isoformat(),
                ":updated": datetime.utcnow().isoformat(),
            },
        )
    elif analysis_type == "existing_work":
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="""
                SET analysis_status_existing_work = :status,
                    existing_work_error = :error,
                    existing_work_failed_at = :failed,
                    updated_at = :updated
            """,
            expression_attribute_values={
                ":status": "failed",
                ":error": error_msg,
                ":failed": datetime.utcnow().isoformat(),
                ":updated": datetime.utcnow().isoformat(),
            },
        )
    elif analysis_type == "structure_workplan":
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="""
                SET analysis_status_structure_workplan = :status,
                    structure_workplan_error = :error,
                    structure_workplan_failed_at = :failed,
                    updated_at = :updated
            """,
            expression_attribute_values={
                ":status": "failed",
                ":error": error_msg,
                ":failed": datetime.utcnow().isoformat(),
                ":updated": datetime.utcnow().isoformat(),
            },
        )
    elif analysis_type == "draft_feedback":
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="""
                SET analysis_status_draft_feedback = :status,
                    draft_feedback_error = :error,
                    draft_feedback_failed_at = :failed,
                    updated_at = :updated
            """,
            expression_attribute_values={
                ":status": "failed",
                ":error": error_msg,
                ":failed": datetime.utcnow().isoformat(),
                ":updated": datetime.utcnow().isoformat(),
            },
        )
    elif analysis_type == "proposal_template":
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="""
                SET proposal_template_status = :status,
                    proposal_template_error = :error,
                    proposal_template_failed_at = :failed,
                    updated_at = :updated
            """,
            expression_attribute_values={
                ":status": "failed",
                ":error": error_msg,
                ":failed": datetime.utcnow().isoformat(),
                ":updated": datetime.utcnow().isoformat(),
            },
        )


def _update_retry_status(
    proposal_id: str,
    attempt: int,
    error_msg: str,
) -> None:
    """
    Update proposal status during document generation retry.

    Args:
        proposal_id: Proposal identifier
        attempt: Current attempt number
        error_msg: Error message from failed attempt

    Raises:
        Exception: If DynamoDB update fails
    """
    db_client.update_item_sync(
        pk=f"PROPOSAL#{proposal_id}",
        sk="METADATA",
        update_expression="SET concept_document_status = :status, last_error = :error",
        expression_attribute_values={
            ":status": f"retrying_attempt_{attempt}",
            ":error": f"Attempt {attempt} failed: {error_msg[:200]}",
        },
    )


# ==================== RFP ANALYSIS ====================


def _handle_rfp_analysis(proposal_id: str) -> Dict[str, Any]:
    """
    Execute RFP document analysis.

    Args:
        proposal_id: Proposal identifier

    Returns:
        Analysis result from SimpleRFPAnalyzer

    Raises:
        Exception: If analysis fails
    """
    logger.info(f"📋 Processing RFP analysis for: {proposal_id}")
    _set_processing_status(proposal_id, "rfp")

    logger.info("🔍 Starting RFP analysis...")
    analyzer = SimpleRFPAnalyzer()
    result = analyzer.analyze_rfp(proposal_id)

    logger.info("✅ RFP analysis completed successfully")
    logger.info(f"📊 Result keys: {list(result.keys())}")

    # Extract just the analysis data (not the status wrapper)
    analysis_data = result.get("rfp_analysis", result)
    logger.info(f"📊 Analysis data keys: {list(analysis_data.keys())}")

    _set_completed_status(proposal_id, "rfp", analysis_data)
    logger.info("💾 RFP result saved to DynamoDB")

    return result


# ==================== REFERENCE PROPOSALS ANALYSIS ====================


def _handle_reference_proposals_analysis(proposal_id: str) -> Dict[str, Any]:
    """
    Execute reference proposals analysis from S3 Vectors.

    Analyzes uploaded reference proposals to extract:
    - Structural patterns
    - Narrative techniques
    - Writing style
    - Donor alignment strategies

    Args:
        proposal_id: Proposal identifier

    Returns:
        Analysis result from ReferenceProposalsAnalyzer

    Raises:
        Exception: If analysis fails
    """
    logger.info(f"📋 Processing reference proposals analysis for: {proposal_id}")
    _set_processing_status(proposal_id, "reference_proposals")

    logger.info("🔍 Starting reference proposals analysis...")
    analyzer = ReferenceProposalsAnalyzer()
    result = analyzer.analyze_reference_proposals(proposal_id)

    logger.info("✅ Reference proposals analysis completed successfully")
    logger.info(f"📊 Documents analyzed: {result.get('documents_analyzed', 0)}")

    _set_completed_status(proposal_id, "reference_proposals", result)
    logger.info("💾 Reference proposals result saved to DynamoDB")

    return result


# ==================== EXISTING WORK ANALYSIS ====================


def _handle_existing_work_analysis(proposal_id: str) -> Dict[str, Any]:
    """
    Execute existing work and experience analysis from S3 Vectors.

    Analyzes uploaded existing work documents/text to extract:
    - Project implementation patterns
    - Technical approaches and methodologies
    - Organizational capabilities
    - Lessons learned and best practices

    Args:
        proposal_id: Proposal identifier

    Returns:
        Analysis result from ExistingWorkAnalyzer

    Raises:
        Exception: If analysis fails
    """
    logger.info(f"📋 Processing existing work analysis for: {proposal_id}")
    _set_processing_status(proposal_id, "existing_work")

    logger.info("🔍 Starting existing work analysis...")
    from app.tools.proposal_writer.existing_work_analysis.service import (
        ExistingWorkAnalyzer,
    )

    analyzer = ExistingWorkAnalyzer()
    result = analyzer.analyze_existing_work(proposal_id)

    logger.info("✅ Existing work analysis completed successfully")
    logger.info(f"📊 Documents analyzed: {result.get('documents_analyzed', 0)}")

    _set_completed_status(proposal_id, "existing_work", result)
    logger.info("💾 Existing work result saved to DynamoDB")

    return result


# ==================== CONCEPT ANALYSIS ====================


def _handle_concept_analysis(proposal_id: str) -> Dict[str, Any]:
    """
    Execute concept evaluation analysis.

    Args:
        proposal_id: Proposal identifier

    Returns:
        Analysis result from SimpleConceptAnalyzer

    Raises:
        Exception: If proposal/RFP not found or analysis fails
    """
    logger.info(f"📋 Processing concept analysis for: {proposal_id}")

    # Retrieve proposal and validate RFP analysis exists
    proposal = db_client.get_item_sync(pk=f"PROPOSAL#{proposal_id}", sk="METADATA")

    if not proposal:
        raise Exception(f"Proposal {proposal_id} not found")

    rfp_analysis = proposal.get("rfp_analysis")
    if not rfp_analysis:
        raise Exception("RFP analysis must be completed first")

    # Get Step 2 analyses (optional - may not be completed yet)
    reference_proposals_analysis = proposal.get("reference_proposals_analysis")
    existing_work_analysis = proposal.get("existing_work_analysis")

    if reference_proposals_analysis:
        logger.info("✅ Reference proposals analysis available for context")
    else:
        logger.info(
            "⚠️  Reference proposals analysis not available (will proceed without it)"
        )

    if existing_work_analysis:
        logger.info("✅ Existing work analysis available for context")
    else:
        logger.info("⚠️  Existing work analysis not available (will proceed without it)")

    _set_processing_status(proposal_id, "concept")

    logger.info("🔍 Starting concept analysis...")
    analyzer = SimpleConceptAnalyzer()
    result = analyzer.analyze_concept(
        proposal_id, rfp_analysis, reference_proposals_analysis, existing_work_analysis
    )

    logger.info("✅ Concept analysis completed successfully")
    logger.info(f"📊 Result keys: {list(result.keys())}")

    _set_completed_status(proposal_id, "concept", result)
    logger.info("💾 Concept result saved to DynamoDB")

    return result


# ==================== STRUCTURE WORKPLAN ANALYSIS ====================


def _handle_structure_workplan_analysis(proposal_id: str) -> Dict[str, Any]:
    """
    Execute structure and workplan analysis.

    Args:
        proposal_id: Proposal identifier

    Returns:
        Analysis result from StructureWorkplanService

    Raises:
        Exception: If proposal/RFP/concept not found or analysis fails
    """
    logger.info(f"📋 Processing structure workplan analysis for: {proposal_id}")

    # Retrieve proposal and validate dependencies (same as concept analysis)
    proposal = db_client.get_item_sync(pk=f"PROPOSAL#{proposal_id}", sk="METADATA")

    if not proposal:
        raise Exception(f"Proposal {proposal_id} not found")

    rfp_analysis = proposal.get("rfp_analysis")
    if not rfp_analysis:
        raise Exception("RFP analysis must be completed first")

    # Check for concept_evaluation or concept_analysis
    concept_eval = proposal.get("concept_evaluation") or proposal.get(
        "concept_analysis"
    )
    if not concept_eval:
        raise Exception("Concept evaluation must be completed first")

    logger.info("✅ Prerequisites validated")

    # Note: Processing status already set by routes.py before invoking worker

    logger.info("🔍 Starting structure workplan analysis...")
    service = StructureWorkplanService()
    result = service.analyze_structure_workplan(proposal_id)

    logger.info("✅ Structure workplan analysis completed successfully")
    logger.info(f"📊 Result keys: {list(result.keys())}")

    _set_completed_status(proposal_id, "structure_workplan", result)
    logger.info("💾 Structure workplan result saved to DynamoDB")

    return result


# ==================== PROPOSAL TEMPLATE GENERATION ====================


def _handle_proposal_template_generation(
    proposal_id: str, event: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Execute proposal template generation using AI.

    Generates a full draft proposal based on:
    - Selected sections from structure workplan
    - Concept document
    - RFP analysis
    - Reference proposals analysis (optional)
    - Existing work analysis (optional)

    Args:
        proposal_id: Proposal identifier
        event: Event containing selected_sections and user_comments

    Returns:
        Generated proposal template result

    Raises:
        Exception: If prerequisites not met or generation fails
    """
    logger.info(f"📋 Processing proposal template generation for: {proposal_id}")

    # Retrieve proposal and validate dependencies
    proposal = db_client.get_item_sync(pk=f"PROPOSAL#{proposal_id}", sk="METADATA")

    if not proposal:
        raise Exception(f"Proposal {proposal_id} not found")

    rfp_analysis = proposal.get("rfp_analysis")
    if not rfp_analysis:
        raise Exception("RFP analysis must be completed first")

    structure_workplan = proposal.get("structure_workplan_analysis")
    if not structure_workplan:
        raise Exception("Structure and workplan analysis must be completed first")

    concept_document = proposal.get("concept_document_v2")
    if not concept_document:
        raise Exception("Concept document must be generated first")

    # Get optional analyses
    reference_proposals_analysis = proposal.get("reference_proposal_analysis")
    existing_work_analysis = proposal.get("existing_work_analysis")

    # Get selected sections and user comments from event
    selected_sections = event.get("selected_sections", [])
    user_comments = event.get("user_comments", {})

    if not selected_sections:
        raise Exception("At least one section must be selected")

    logger.info("✅ Prerequisites validated")
    logger.info(f"   Selected sections: {len(selected_sections)}")

    _set_processing_status(proposal_id, "proposal_template")

    logger.info("🔍 Starting proposal template generation...")
    result = proposal_template_generator.generate_template(
        proposal_code=proposal_id,
        selected_sections=selected_sections,
        rfp_analysis=rfp_analysis,
        concept_document=concept_document,
        structure_workplan_analysis=structure_workplan,
        reference_proposals_analysis=reference_proposals_analysis,
        existing_work_analysis=existing_work_analysis,
        user_comments=user_comments,
    )

    # Save to S3 if configured
    s3_url = proposal_template_generator.save_to_s3(
        proposal_code=proposal_id,
        content=result.get("generated_proposal", ""),
        filename="draft_proposal.md",
    )
    if s3_url:
        result["s3_url"] = s3_url

    logger.info("✅ Proposal template generation completed successfully")
    logger.info(f"📊 Result keys: {list(result.keys())}")

    _set_completed_status(proposal_id, "proposal_template", result)
    logger.info("💾 Proposal template result saved to DynamoDB")

    return result


# ==================== DRAFT FEEDBACK ANALYSIS ====================


def _handle_draft_feedback_analysis(proposal_id: str) -> Dict[str, Any]:
    """
    Execute draft proposal feedback analysis.

    Analyzes user's draft proposal against RFP requirements to provide:
    - Section-by-section feedback with status ratings (EXCELLENT, GOOD, NEEDS_IMPROVEMENT)
    - Specific improvement suggestions for each section
    - Overall assessment and alignment with RFP requirements

    Args:
        proposal_id: Proposal identifier

    Returns:
        Analysis result from DraftFeedbackService

    Raises:
        Exception: If proposal/RFP/draft not found or analysis fails
    """
    logger.info(f"📋 Processing draft feedback analysis for: {proposal_id}")

    # Retrieve proposal and validate dependencies
    proposal = db_client.get_item_sync(pk=f"PROPOSAL#{proposal_id}", sk="METADATA")

    if not proposal:
        raise Exception(f"Proposal {proposal_id} not found")

    rfp_analysis = proposal.get("rfp_analysis")
    if not rfp_analysis:
        raise Exception("RFP analysis must be completed first")

    draft_documents = proposal.get("uploaded_files", {}).get("draft-proposal", [])
    if not draft_documents:
        raise Exception("Draft proposal must be uploaded first")

    logger.info("✅ Prerequisites validated")

    _set_processing_status(proposal_id, "draft_feedback")

    logger.info("🔍 Starting draft feedback analysis...")
    service = DraftFeedbackService()
    result = service.analyze_draft_feedback(proposal_id)

    logger.info("✅ Draft feedback analysis completed successfully")
    logger.info(f"📊 Result keys: {list(result.keys())}")

    _set_completed_status(proposal_id, "draft_feedback", result)
    logger.info("💾 Draft feedback result saved to DynamoDB")

    return result


# ==================== DOCUMENT VECTORIZATION ====================


def _update_vectorization_status(
    proposal_code: str,
    filename: str,
    status: str,
    error: Optional[str] = None,
    chunks_processed: int = 0,
    total_chunks: int = 0,
) -> None:
    """
    Update vectorization status for a specific file in DynamoDB.

    Status values: 'processing', 'completed', 'failed'
    """
    status_data = {
        "status": status,
        "updated_at": datetime.utcnow().isoformat(),
        "chunks_processed": chunks_processed,
        "total_chunks": total_chunks,
    }

    if error:
        status_data["error"] = error

    if status == "completed":
        status_data["completed_at"] = datetime.utcnow().isoformat()

    # Update the vectorization_status map for this file
    db_client.update_item_sync(
        pk=f"PROPOSAL#{proposal_code}",
        sk="METADATA",
        update_expression="SET vectorization_status.#filename = :status, updated_at = :updated",
        expression_attribute_names={"#filename": filename},
        expression_attribute_values={
            ":status": status_data,
            ":updated": datetime.utcnow().isoformat(),
        },
    )


def _handle_document_vectorization(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle async document vectorization for reference proposals and supporting documents.

    Expected event format:
    {
        "proposal_id": "uuid-string",
        "proposal_code": "PROP-XXXX",
        "analysis_type": "vectorize_document",
        "document_type": "reference" | "supporting",
        "filename": "document.pdf",
        "s3_key": "PROP-XXXX/documents/references/document.pdf",
        "metadata": {
            "donor": "...",  # for reference
            "sector": "...",
            "year": "...",
            "status": "...",
            # OR for supporting:
            "organization": "...",
            "project_type": "...",
            "region": "..."
        }
    }
    """
    import os

    import boto3

    proposal_code = event.get("proposal_code")
    document_type = event.get("document_type")
    filename = event.get("filename")
    s3_key = event.get("s3_key")
    metadata = event.get("metadata", {})

    logger.info(f"📋 Processing vectorization for: {filename}")
    logger.info(f"   Proposal: {proposal_code}")
    logger.info(f"   Document type: {document_type}")
    logger.info(f"   S3 key: {s3_key}")

    try:
        # Update status to processing
        _update_vectorization_status(proposal_code, filename, "processing")

        # Download file from S3
        bucket = os.environ.get("PROPOSALS_BUCKET", "igad-proposals-testing")
        s3_client = boto3.client("s3")

        logger.info(f"📥 Downloading file from S3: {s3_key}")
        response = s3_client.get_object(Bucket=bucket, Key=s3_key)
        file_bytes = response["Body"].read()
        logger.info(f"   Downloaded {len(file_bytes)} bytes")

        # Extract text from file
        from app.utils.document_extraction import chunk_text, extract_text_from_file

        logger.info(f"📄 Extracting text from {filename}...")
        extracted_text = extract_text_from_file(file_bytes, filename)

        # Fallback if extraction failed
        if not extracted_text or len(extracted_text.strip()) < 100:
            logger.warning(f"Text extraction failed or too short for {filename}")
            if document_type == "reference":
                extracted_text = f"Reference proposal: {filename}"
                if metadata.get("donor"):
                    extracted_text += f" from {metadata['donor']}"
                if metadata.get("sector"):
                    extracted_text += f" in {metadata['sector']} sector"
            else:
                extracted_text = f"Existing work document: {filename}"
                if metadata.get("organization"):
                    extracted_text += f" from {metadata['organization']}"

        logger.info(f"   Extracted {len(extracted_text)} characters")

        # Chunk text
        text_chunks = chunk_text(extracted_text, chunk_size=1000, overlap=200)
        total_chunks = len(text_chunks)
        logger.info(f"   Created {total_chunks} chunks")

        # Update status with total chunks
        _update_vectorization_status(
            proposal_code,
            filename,
            "processing",
            chunks_processed=0,
            total_chunks=total_chunks,
        )

        # Vectorize each chunk
        vector_service = VectorEmbeddingsService()

        logger.info(f"🔄 Starting vectorization for {total_chunks} chunks...")

        for idx, chunk in enumerate(text_chunks):
            if document_type == "reference":
                chunk_metadata = {
                    "donor": metadata.get("donor", ""),
                    "sector": metadata.get("sector", ""),
                    "year": metadata.get("year", ""),
                    "status": metadata.get("status", ""),
                    "document_name": filename,
                    "chunk_index": str(idx),
                    "total_chunks": str(total_chunks),
                }
                result = vector_service.insert_reference_proposal(
                    proposal_id=proposal_code, text=chunk, metadata=chunk_metadata
                )
            else:  # supporting
                chunk_metadata = {
                    "organization": metadata.get("organization", ""),
                    "project_type": metadata.get("project_type", ""),
                    "region": metadata.get("region", ""),
                    "document_name": filename,
                    "chunk_index": str(idx),
                    "total_chunks": str(total_chunks),
                }
                result = vector_service.insert_existing_work(
                    proposal_id=proposal_code, text=chunk, metadata=chunk_metadata
                )

            if not result:
                raise Exception(f"Vector storage failed for chunk {idx}")

            logger.info(f"   ✅ Chunk {idx+1}/{total_chunks} vectorized")

            # Update progress every 5 chunks or on last chunk
            if (idx + 1) % 5 == 0 or idx == total_chunks - 1:
                _update_vectorization_status(
                    proposal_code,
                    filename,
                    "processing",
                    chunks_processed=idx + 1,
                    total_chunks=total_chunks,
                )

        # Mark as completed
        _update_vectorization_status(
            proposal_code,
            filename,
            "completed",
            chunks_processed=total_chunks,
            total_chunks=total_chunks,
        )

        logger.info(f"✅ Vectorization completed for {filename}: {total_chunks} chunks")

        return {
            "status": "completed",
            "filename": filename,
            "chunks_vectorized": total_chunks,
        }

    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ Vectorization failed for {filename}: {error_msg}")

        # Update status to failed
        _update_vectorization_status(proposal_code, filename, "failed", error=error_msg)

        raise


# ==================== CONCEPT DOCUMENT GENERATION ====================


def _generate_document_with_retry(
    proposal_code: str,
    rfp_analysis: Dict[str, Any],
    concept_evaluation: Dict[str, Any],
    proposal_outline: Optional[Dict[str, Any]],
    max_retries: int = 3,
    retry_delay: int = 30,
) -> Dict[str, Any]:
    """
    Generate concept document with exponential backoff retry logic.

    Args:
        proposal_code: Proposal code for document generation
        rfp_analysis: RFP analysis data
        concept_evaluation: Concept evaluation data
        proposal_outline: Optional proposal outline for enrichment
        max_retries: Maximum number of retry attempts (default: 3)
        retry_delay: Initial delay in seconds for exponential backoff (default: 30)

    Returns:
        Generated document result

    Raises:
        Exception: If all retry attempts fail
    """
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"📝 ATTEMPT {attempt}/{max_retries}")
            start_time = datetime.utcnow()

            generated_document = concept_generator.generate_document(
                proposal_code=proposal_code,
                rfp_analysis=rfp_analysis,
                concept_evaluation=concept_evaluation,
                proposal_outline=proposal_outline,
            )

            end_time = datetime.utcnow()
            processing_time = (end_time - start_time).total_seconds()
            logger.info(
                f"✅ Concept document generated successfully in {processing_time:.1f} seconds"
            )
            return generated_document

        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ Attempt {attempt}/{max_retries} failed: {error_msg}")

            if attempt < max_retries:
                backoff_delay = retry_delay * (2 ** (attempt - 1))
                logger.warning(
                    f"⏳ Retrying in {backoff_delay} seconds (exponential backoff)..."
                )
                time.sleep(backoff_delay)
            else:
                logger.error(f"❌ All {max_retries} attempts failed")
                raise


def _handle_concept_document_generation(
    proposal_id: str, event: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Execute concept document generation with retry logic.

    Args:
        proposal_id: Proposal identifier
        event: Lambda event containing concept_evaluation data

    Returns:
        Generated document result with concept_evaluation and document

    Raises:
        Exception: If proposal/RFP not found, evaluation missing, or all retries fail
    """
    logger.info(f"📋 Processing document generation for: {proposal_id}")

    # Retrieve proposal and validate dependencies
    proposal = db_client.get_item_sync(pk=f"PROPOSAL#{proposal_id}", sk="METADATA")

    if not proposal:
        raise Exception(f"Proposal {proposal_id} not found")

    rfp_analysis = proposal.get("rfp_analysis")
    if not rfp_analysis:
        raise Exception("RFP analysis must be completed first")

    concept_evaluation = event.get("concept_evaluation")
    if not concept_evaluation:
        raise Exception("Concept evaluation not provided")

    proposal_outline = proposal.get("proposal_outline")
    if proposal_outline:
        logger.info("✅ Found proposal_outline in proposal data")
    else:
        logger.warning(
            "⚠️ No proposal_outline found - will attempt to load from DynamoDB"
        )

    _set_processing_status(proposal_id, "concept_document")

    logger.info("🔍 Starting concept document generation with retry logic...")
    proposal_code = proposal.get("proposalCode", proposal_id)

    generated_document = _generate_document_with_retry(
        proposal_code=proposal_code,
        rfp_analysis=rfp_analysis,
        concept_evaluation=concept_evaluation,
        proposal_outline=proposal_outline,
    )

    logger.info("💾 Saving concept document to DynamoDB...")
    _set_completed_status(
        proposal_id,
        "concept_document",
        {"concept_evaluation": concept_evaluation, "document": generated_document},
    )
    logger.info("💾 Concept document saved to DynamoDB")

    return generated_document


# ==================== LAMBDA HANDLER ====================


def handler(event, context):
    """
    Lambda handler for asynchronous proposal analysis.

    Coordinates seven types of analysis workflows:
    1. RFP Analysis: Extracts structured data from RFP documents
    2. Reference Proposals Analysis: Analyzes reference proposals from S3 Vectors
    3. Existing Work Analysis: Analyzes existing work from S3 Vectors
    4. Concept Analysis: Evaluates concept alignment with RFP
    5. Structure Workplan: Generates proposal structure and workplan
    6. Draft Feedback: Analyzes draft proposal and provides section-by-section feedback
    7. Document Generation: Creates refined concept document

    Expected event format:
    {
        "proposal_id": "uuid-string",
        "analysis_type": "rfp" | "reference_proposals" | "existing_work" | "concept" | "structure_workplan" | "draft_feedback" | "concept_document",
        "concept_evaluation": {...}  # Required for concept_document
    }

    Returns:
        Success response with statusCode 200 or error response with statusCode 500

    Raises:
        ValueError: If proposal_id or analysis_type is invalid
        Exception: If analysis fails (error details saved to DynamoDB)
    """
    try:
        logger.info("🚀 Analysis Worker Started")

        # Extract and validate parameters
        proposal_id = event.get("proposal_id")
        analysis_type = event.get("analysis_type", "rfp")

        if not proposal_id:
            raise ValueError("Missing proposal_id in event")

        logger.info(f"📋 Processing proposal: {proposal_id}")
        logger.info(f"📊 Analysis type: {analysis_type}")

        # Route to appropriate analysis handler
        if analysis_type == "rfp":
            _handle_rfp_analysis(proposal_id)
        elif analysis_type == "reference_proposals":
            _handle_reference_proposals_analysis(proposal_id)
        elif analysis_type == "existing_work":
            _handle_existing_work_analysis(proposal_id)
        elif analysis_type == "concept":
            _handle_concept_analysis(proposal_id)
        elif analysis_type == "structure_workplan":
            _handle_structure_workplan_analysis(proposal_id)
        elif analysis_type == "draft_feedback":
            _handle_draft_feedback_analysis(proposal_id)
        elif analysis_type == "concept_document":
            _handle_concept_document_generation(proposal_id, event)
        elif analysis_type == "proposal_template":
            _handle_proposal_template_generation(proposal_id, event)
        elif analysis_type == "vectorize_document":
            _handle_document_vectorization(event)
        else:
            raise ValueError(f"Invalid analysis_type: {analysis_type}")

        logger.info(f"✅ {analysis_type.upper()} Analysis Completed Successfully")

        return {
            "statusCode": 200,
            "body": json.dumps(
                {
                    "proposal_id": proposal_id,
                    "analysis_type": analysis_type,
                    "status": "completed",
                    "message": f"{analysis_type.upper()} analysis completed successfully",
                }
            ),
        }

    except Exception as e:
        error_msg = str(e)
        error_trace = traceback.format_exc()

        logger.error(
            f"❌ {event.get('analysis_type', 'RFP').upper()} Analysis Worker Failed"
        )
        logger.error(f"Error: {error_msg}")
        logger.error(f"Traceback:\n{error_trace}")

        # Update status to failed based on analysis type
        try:
            analysis_type = event.get("analysis_type", "rfp")
            _set_failed_status(proposal_id, analysis_type, error_msg)
            logger.info("💾 Error status saved to DynamoDB")
        except Exception as db_error:
            logger.error(f"Failed to save error status: {str(db_error)}")

        return {
            "statusCode": 500,
            "body": json.dumps(
                {
                    "proposal_id": proposal_id,
                    "analysis_type": event.get("analysis_type", "rfp"),
                    "status": "failed",
                    "error": error_msg,
                }
            ),
        }
