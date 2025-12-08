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

from app.tools.proposal_writer.rfp_analysis.service import SimpleRFPAnalyzer
from app.tools.proposal_writer.concept_evaluation.service import SimpleConceptAnalyzer
from app.tools.proposal_writer.document_generation.service import concept_generator
from app.tools.proposal_writer.reference_proposals_analysis.service import ReferenceProposalsAnalyzer
from app.database.client import db_client

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
        analysis_type: Type of analysis ('rfp', 'concept', 'concept_document', 'reference_proposals')

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


def _set_completed_status(
    proposal_id: str,
    analysis_type: str,
    result: Dict[str, Any],
) -> None:
    """
    Set proposal analysis status to 'completed' and save result.

    Args:
        proposal_id: Proposal identifier
        analysis_type: Type of analysis ('rfp', 'concept', 'concept_document', 'reference_proposals')
        result: Analysis result to save

    Raises:
        Exception: If DynamoDB update fails
    """
    if analysis_type == "rfp":
        # Log result size for debugging
        result_json = json.dumps(result)
        result_size_kb = len(result_json.encode('utf-8')) / 1024
        print(f"📊 RFP analysis result size: {result_size_kb:.2f} KB")

        if result_size_kb > 350:
            print(f"⚠️  WARNING: Result size ({result_size_kb:.2f} KB) is close to DynamoDB 400KB limit!")

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
            print(f"✅ Successfully saved RFP analysis to DynamoDB")
        except Exception as e:
            print(f"❌ CRITICAL: Failed to save RFP analysis to DynamoDB!")
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


def _set_failed_status(
    proposal_id: str,
    analysis_type: str,
    error_msg: str,
) -> None:
    """
    Set proposal analysis status to 'failed' and save error details.

    Args:
        proposal_id: Proposal identifier
        analysis_type: Type of analysis ('rfp', 'concept', 'concept_document', 'reference_proposals')
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
    from app.tools.proposal_writer.existing_work_analysis.service import ExistingWorkAnalyzer
    analyzer = ExistingWorkAnalyzer()
    result = analyzer.analyze_existing_work(proposal_id)

    logger.info("✅ Existing work analysis completed successfully")
    logger.info(f"📊 Documents analyzed: {result.get('documents_analyzed', 0)}")

    # Extract just the analysis content (avoid duplication)
    analysis_data = result.get("existing_work_analysis", {})

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
    proposal = db_client.get_item_sync(
        pk=f"PROPOSAL#{proposal_id}", sk="METADATA"
    )

    if not proposal:
        raise Exception(f"Proposal {proposal_id} not found")

    rfp_analysis = proposal.get("rfp_analysis")
    if not rfp_analysis:
        raise Exception("RFP analysis must be completed first")

    _set_processing_status(proposal_id, "concept")

    logger.info("🔍 Starting concept analysis...")
    analyzer = SimpleConceptAnalyzer()
    result = analyzer.analyze_concept(proposal_id, rfp_analysis)

    logger.info("✅ Concept analysis completed successfully")
    logger.info(f"📊 Result keys: {list(result.keys())}")

    _set_completed_status(proposal_id, "concept", result)
    logger.info("💾 Concept result saved to DynamoDB")

    return result


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
    proposal = db_client.get_item_sync(
        pk=f"PROPOSAL#{proposal_id}", sk="METADATA"
    )

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
        logger.warning("⚠️ No proposal_outline found - will attempt to load from DynamoDB")

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

    Coordinates four types of analysis workflows:
    1. RFP Analysis: Extracts structured data from RFP documents
    2. Reference Proposals Analysis: Analyzes reference proposals from S3 Vectors
    3. Concept Analysis: Evaluates concept alignment with RFP
    4. Document Generation: Creates refined concept document

    Expected event format:
    {
        "proposal_id": "uuid-string",
        "analysis_type": "rfp" | "reference_proposals" | "concept" | "concept_document",
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
        elif analysis_type == "concept_document":
            _handle_concept_document_generation(proposal_id, event)
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

        logger.error(f"❌ {event.get('analysis_type', 'RFP').upper()} Analysis Worker Failed")
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
