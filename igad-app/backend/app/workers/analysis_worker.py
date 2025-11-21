"""
Analysis Worker Lambda
Handles long-running RFP and Concept analysis tasks asynchronously.
"""
import json
import logging
import traceback
from datetime import datetime

from ..services.simple_rfp_analyzer import SimpleRFPAnalyzer
from ..services.simple_concept_analyzer import SimpleConceptAnalyzer
from ..services.concept_document_generator import concept_generator
from ..database.client import db_client

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

def handler(event, context):
    """
    Lambda handler for async analysis.
    
    Expected event format:
    {
        "proposal_id": "uuid-string",
        "analysis_type": "rfp" | "concept"
    }
    """
    try:
        logger.info("=" * 80)
        logger.info("🚀 Analysis Worker Started")
        logger.info("=" * 80)
        
        # Extract parameters from event
        proposal_id = event.get("proposal_id")
        analysis_type = event.get("analysis_type", "rfp")
        
        if not proposal_id:
            raise ValueError("Missing proposal_id in event")
        
        logger.info(f"📋 Processing proposal: {proposal_id}")
        logger.info(f"📊 Analysis type: {analysis_type}")
        
        if analysis_type == "rfp":
            # Update status to processing with timestamp
            db_client.update_item_sync(
                pk=f"PROPOSAL#{proposal_id}",
                sk="METADATA",
                update_expression="SET analysis_status_rfp = :status, rfp_analysis_started_at = :started",
                expression_attribute_values={
                    ":status": "processing",
                    ":started": datetime.utcnow().isoformat()
                }
            )
            
            # Run the RFP analysis
            logger.info("🔍 Starting RFP analysis...")
            analyzer = SimpleRFPAnalyzer()
            result = analyzer.analyze_rfp(proposal_id)
            
            logger.info("✅ RFP analysis completed successfully")
            logger.info(f"📊 Result keys: {list(result.keys())}")
            
            # Save the result to DynamoDB
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
                    ":updated": datetime.utcnow().isoformat()
                }
            )
            
            logger.info("💾 RFP result saved to DynamoDB")
        
        elif analysis_type == "concept":
            # Get proposal to check RFP analysis exists
            proposal = db_client.get_item_sync(
                pk=f"PROPOSAL#{proposal_id}",
                sk="METADATA"
            )
            
            if not proposal:
                raise Exception(f"Proposal {proposal_id} not found")
            
            rfp_analysis = proposal.get("rfp_analysis")
            if not rfp_analysis:
                raise Exception("RFP analysis must be completed first")
            
            # Update status to processing
            db_client.update_item_sync(
                pk=f"PROPOSAL#{proposal_id}",
                sk="METADATA",
                update_expression="SET analysis_status_concept = :status, concept_analysis_started_at = :started",
                expression_attribute_values={
                    ":status": "processing",
                    ":started": datetime.utcnow().isoformat()
                }
            )
            
            # Run the Concept analysis
            logger.info("🔍 Starting Concept analysis...")
            analyzer = SimpleConceptAnalyzer()
            result = analyzer.analyze_concept(proposal_id, rfp_analysis)
            
            logger.info("✅ Concept analysis completed successfully")
            logger.info(f"📊 Result keys: {list(result.keys())}")
            
            # Save the result to DynamoDB
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
                    ":updated": datetime.utcnow().isoformat()
                }
            )
            
            logger.info("💾 Concept result saved to DynamoDB")
        
        elif analysis_type == "concept_document":
            # Get proposal
            proposal = db_client.get_item_sync(
                pk=f"PROPOSAL#{proposal_id}",
                sk="METADATA"
            )
            
            if not proposal:
                raise Exception(f"Proposal {proposal_id} not found")
            
            rfp_analysis = proposal.get("rfp_analysis")
            if not rfp_analysis:
                raise Exception("RFP analysis must be completed first")
            
            # Get concept evaluation from event
            concept_evaluation = event.get("concept_evaluation")
            if not concept_evaluation:
                raise Exception("Concept evaluation not provided")
            
            # Update status to processing
            db_client.update_item_sync(
                pk=f"PROPOSAL#{proposal_id}",
                sk="METADATA",
                update_expression="SET concept_document_status = :status, concept_document_started_at = :started",
                expression_attribute_values={
                    ":status": "processing",
                    ":started": datetime.utcnow().isoformat()
                }
            )
            
            # Generate document
            logger.info("🔍 Starting concept document generation...")
            proposal_code = proposal.get("proposalCode", proposal_id)
            
            generated_document = concept_generator.generate_document(
                proposal_code=proposal_code,
                rfp_analysis=rfp_analysis,
                concept_evaluation=concept_evaluation
            )
            
            logger.info("✅ Concept document generated successfully")
            
            # Save to DynamoDB
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
                    ":document": generated_document,
                    ":status": "completed",
                    ":completed": datetime.utcnow().isoformat(),
                    ":updated": datetime.utcnow().isoformat()
                }
            )
            
            logger.info("💾 Concept document saved to DynamoDB")
        
        else:
            raise ValueError(f"Invalid analysis_type: {analysis_type}")
        
        logger.info("=" * 80)
        logger.info(f"✅ {analysis_type.upper()} Analysis Worker Completed Successfully")
        logger.info("=" * 80)
        
        return {
            "statusCode": 200,
            "body": json.dumps({
                "proposal_id": proposal_id,
                "analysis_type": analysis_type,
                "status": "completed",
                "message": f"{analysis_type.upper()} analysis completed successfully"
            })
        }
        
    except Exception as e:
        error_msg = str(e)
        error_trace = traceback.format_exc()
        
        logger.error("=" * 80)
        logger.error(f"❌ {event.get('analysis_type', 'RFP').upper()} Analysis Worker Failed")
        logger.error("=" * 80)
        logger.error(f"Error: {error_msg}")
        logger.error(f"Traceback:\n{error_trace}")
        
        # Update status to failed based on analysis type
        try:
            analysis_type = event.get("analysis_type", "rfp")
            
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
                        ":updated": datetime.utcnow().isoformat()
                    }
                )
            else:  # concept
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
                        ":updated": datetime.utcnow().isoformat()
                    }
                )
            
            if analysis_type == "concept_document":
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
                        ":updated": datetime.utcnow().isoformat()
                    }
                )
            
            logger.info("💾 Error status saved to DynamoDB")
        except Exception as db_error:
            logger.error(f"Failed to save error status: {str(db_error)}")
        
        return {
            "statusCode": 500,
            "body": json.dumps({
                "proposal_id": proposal_id,
                "analysis_type": event.get("analysis_type", "rfp"),
                "status": "failed",
                "error": error_msg
            })
        }
