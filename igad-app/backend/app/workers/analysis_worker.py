"""
RFP Analysis Worker Lambda
Handles long-running RFP analysis tasks asynchronously.
"""
import json
import logging
import traceback
from datetime import datetime

from ..services.simple_rfp_analyzer import SimpleRFPAnalyzer
from ..database.client import db_client

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

def handler(event, context):
    """
    Lambda handler for async RFP analysis.
    
    Expected event format:
    {
        "proposal_id": "uuid-string"
    }
    """
    try:
        logger.info("=" * 80)
        logger.info("🚀 RFP Analysis Worker Started")
        logger.info("=" * 80)
        
        # Extract proposal_id from event
        proposal_id = event.get("proposal_id")
        if not proposal_id:
            raise ValueError("Missing proposal_id in event")
        
        logger.info(f"📋 Processing proposal: {proposal_id}")
        
        # Update status to processing with timestamp
        db_client.update_item_sync(
            Key={
                "PK": f"PROPOSAL#{proposal_id}",
                "SK": "METADATA"
            },
            UpdateExpression="SET analysis_status = :status, analysis_started_at = :started",
            ExpressionAttributeValues={
                ":status": "processing",
                ":started": datetime.utcnow().isoformat()
            }
        )
        
        # Run the analysis
        logger.info("🔍 Starting RFP analysis...")
        analyzer = SimpleRFPAnalyzer()
        result = analyzer.analyze_rfp(proposal_id)
        
        logger.info("✅ Analysis completed successfully")
        logger.info(f"📊 Result keys: {list(result.keys())}")
        
        # Save the result to DynamoDB
        db_client.update_item_sync(
            Key={
                "PK": f"PROPOSAL#{proposal_id}",
                "SK": "METADATA"
            },
            UpdateExpression="""
                SET rfp_analysis = :analysis,
                    analysis_status = :status,
                    analysis_completed_at = :completed,
                    updated_at = :updated
            """,
            ExpressionAttributeValues={
                ":analysis": result,
                ":status": "completed",
                ":completed": datetime.utcnow().isoformat(),
                ":updated": datetime.utcnow().isoformat()
            }
        )
        
        logger.info("💾 Result saved to DynamoDB")
        logger.info("=" * 80)
        logger.info("✅ RFP Analysis Worker Completed Successfully")
        logger.info("=" * 80)
        
        return {
            "statusCode": 200,
            "body": json.dumps({
                "proposal_id": proposal_id,
                "status": "completed",
                "message": "Analysis completed successfully"
            })
        }
        
    except Exception as e:
        error_msg = str(e)
        error_trace = traceback.format_exc()
        
        logger.error("=" * 80)
        logger.error("❌ RFP Analysis Worker Failed")
        logger.error("=" * 80)
        logger.error(f"Error: {error_msg}")
        logger.error(f"Traceback:\n{error_trace}")
        
        # Update status to failed
        try:
            db_client.update_item_sync(
                Key={
                    "PK": f"PROPOSAL#{proposal_id}",
                    "SK": "METADATA"
                },
                UpdateExpression="""
                    SET analysis_status = :status,
                        analysis_error = :error,
                        analysis_failed_at = :failed,
                        updated_at = :updated
                """,
                ExpressionAttributeValues={
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
                "status": "failed",
                "error": error_msg
            })
        }
