import json
import logging
from typing import Dict, Any
from datetime import datetime

from ...services.proposal_service import ProposalService
from ...models.proposal import Proposal, ProposalStatus

logger = logging.getLogger(__name__)
proposal_service = ProposalService()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main Lambda handler for proposal operations"""
    try:
        http_method = event.get("httpMethod")
        path = event.get("path", "")
        path_parameters = event.get("pathParameters") or {}
        query_parameters = event.get("queryStringParameters") or {}
        
        # Extract user ID from JWT token (simplified for MVP)
        user_id = event.get("requestContext", {}).get("authorizer", {}).get("user_id")
        if not user_id:
            return {
                "statusCode": 401,
                "body": json.dumps({"error": "Unauthorized"})
            }
        
        # Route to appropriate handler
        if http_method == "POST" and path == "/proposals":
            return await create_proposal_handler(event, user_id)
        elif http_method == "GET" and path == "/proposals":
            return await list_proposals_handler(event, user_id)
        elif http_method == "GET" and "/proposals/" in path:
            proposal_id = path_parameters.get("id")
            return await get_proposal_handler(proposal_id, user_id)
        elif http_method == "PUT" and "/proposals/" in path:
            proposal_id = path_parameters.get("id")
            return await update_proposal_handler(event, proposal_id, user_id)
        elif http_method == "DELETE" and "/proposals/" in path:
            proposal_id = path_parameters.get("id")
            return await delete_proposal_handler(proposal_id, user_id)
        else:
            return {
                "statusCode": 404,
                "body": json.dumps({"error": "Not found"})
            }
            
    except Exception as e:
        logger.error(f"Handler error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Internal server error"})
        }


async def create_proposal_handler(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Create a new proposal"""
    try:
        body = json.loads(event.get("body", "{}"))
        
        title = body.get("title")
        if not title:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Title is required"})
            }
        
        description = body.get("description", "")
        template_id = body.get("template_id")
        
        proposal = await proposal_service.create_proposal(
            user_id=user_id,
            title=title,
            description=description,
            template_id=template_id
        )
        
        return {
            "statusCode": 201,
            "body": json.dumps({
                "proposal": proposal.dict(),
                "message": "Proposal created successfully"
            })
        }
        
    except Exception as e:
        logger.error(f"Create proposal error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }


async def list_proposals_handler(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """List all proposals for a user"""
    try:
        proposals = await proposal_service.list_proposals(user_id)
        
        return {
            "statusCode": 200,
            "body": json.dumps({
                "proposals": [p.dict() for p in proposals],
                "count": len(proposals)
            })
        }
        
    except Exception as e:
        logger.error(f"List proposals error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }


async def get_proposal_handler(proposal_id: str, user_id: str) -> Dict[str, Any]:
    """Get a specific proposal"""
    try:
        if not proposal_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Proposal ID is required"})
            }
        
        proposal = await proposal_service.get_proposal(proposal_id, user_id)
        
        if not proposal:
            return {
                "statusCode": 404,
                "body": json.dumps({"error": "Proposal not found"})
            }
        
        return {
            "statusCode": 200,
            "body": json.dumps({"proposal": proposal.dict()})
        }
        
    except Exception as e:
        logger.error(f"Get proposal error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }


async def update_proposal_handler(
    event: Dict[str, Any], 
    proposal_id: str, 
    user_id: str
) -> Dict[str, Any]:
    """Update a proposal"""
    try:
        if not proposal_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Proposal ID is required"})
            }
        
        body = json.loads(event.get("body", "{}"))
        
        # Filter allowed update fields
        allowed_fields = [
            "title", "description", "status", "sections", 
            "uploaded_files", "text_inputs", "metadata"
        ]
        
        updates = {k: v for k, v in body.items() if k in allowed_fields}
        
        if not updates:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "No valid fields to update"})
            }
        
        proposal = await proposal_service.update_proposal(
            proposal_id, user_id, updates
        )
        
        return {
            "statusCode": 200,
            "body": json.dumps({
                "proposal": proposal.dict(),
                "message": "Proposal updated successfully"
            })
        }
        
    except Exception as e:
        logger.error(f"Update proposal error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }


async def delete_proposal_handler(proposal_id: str, user_id: str) -> Dict[str, Any]:
    """Delete a proposal"""
    try:
        if not proposal_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Proposal ID is required"})
            }
        
        success = await proposal_service.delete_proposal(proposal_id, user_id)
        
        if success:
            return {
                "statusCode": 200,
                "body": json.dumps({"message": "Proposal deleted successfully"})
            }
        else:
            return {
                "statusCode": 404,
                "body": json.dumps({"error": "Proposal not found"})
            }
        
    except Exception as e:
        logger.error(f"Delete proposal error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
