import json
import logging
from typing import Dict, Any

from ...services.proposal_service import ProposalService

logger = logging.getLogger(__name__)
proposal_service = ProposalService()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Lambda handler for AI operations on proposals"""
    try:
        http_method = event.get("httpMethod")
        path = event.get("path", "")
        path_parameters = event.get("pathParameters") or {}
        
        # Extract user ID from JWT token
        user_id = event.get("requestContext", {}).get("authorizer", {}).get("user_id")
        if not user_id:
            return {
                "statusCode": 401,
                "body": json.dumps({"error": "Unauthorized"})
            }
        
        proposal_id = path_parameters.get("id")
        if not proposal_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Proposal ID is required"})
            }
        
        # Route to appropriate AI handler
        if http_method == "POST" and "/generate" in path:
            return await generate_content_handler(event, proposal_id, user_id)
        elif http_method == "POST" and "/improve" in path:
            return await improve_content_handler(event, proposal_id, user_id)
        elif http_method == "POST" and "/summarize" in path:
            return await generate_summary_handler(event, proposal_id, user_id)
        elif http_method == "GET" and "/suggestions" in path:
            return await get_suggestions_handler(event, proposal_id, user_id)
        else:
            return {
                "statusCode": 404,
                "body": json.dumps({"error": "Not found"})
            }
            
    except Exception as e:
        logger.error(f"AI handler error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Internal server error"})
        }


async def generate_content_handler(
    event: Dict[str, Any], 
    proposal_id: str, 
    user_id: str
) -> Dict[str, Any]:
    """Generate AI content for a proposal section"""
    try:
        body = json.loads(event.get("body", "{}"))
        
        section_id = body.get("section_id")
        if not section_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Section ID is required"})
            }
        
        context_data = body.get("context_data", {})
        
        result = await proposal_service.generate_section_content(
            proposal_id=proposal_id,
            user_id=user_id,
            section_id=section_id,
            context_data=context_data
        )
        
        return {
            "statusCode": 200,
            "body": json.dumps({
                "result": result,
                "message": "Content generated successfully"
            })
        }
        
    except Exception as e:
        logger.error(f"Generate content error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }


async def improve_content_handler(
    event: Dict[str, Any], 
    proposal_id: str, 
    user_id: str
) -> Dict[str, Any]:
    """Improve existing content using AI"""
    try:
        body = json.loads(event.get("body", "{}"))
        
        section_id = body.get("section_id")
        if not section_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Section ID is required"})
            }
        
        improvement_type = body.get("improvement_type", "general")
        
        result = await proposal_service.improve_section_content(
            proposal_id=proposal_id,
            user_id=user_id,
            section_id=section_id,
            improvement_type=improvement_type
        )
        
        return {
            "statusCode": 200,
            "body": json.dumps({
                "result": result,
                "message": "Content improved successfully"
            })
        }
        
    except Exception as e:
        logger.error(f"Improve content error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }


async def generate_summary_handler(
    event: Dict[str, Any], 
    proposal_id: str, 
    user_id: str
) -> Dict[str, Any]:
    """Generate executive summary"""
    try:
        result = await proposal_service.generate_executive_summary(
            proposal_id=proposal_id,
            user_id=user_id
        )
        
        return {
            "statusCode": 200,
            "body": json.dumps({
                "result": result,
                "message": "Executive summary generated successfully"
            })
        }
        
    except Exception as e:
        logger.error(f"Generate summary error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }


async def get_suggestions_handler(
    event: Dict[str, Any], 
    proposal_id: str, 
    user_id: str
) -> Dict[str, Any]:
    """Get AI suggestions for proposal improvement"""
    try:
        # Get the proposal
        proposal = await proposal_service.get_proposal(proposal_id, user_id)
        if not proposal:
            return {
                "statusCode": 404,
                "body": json.dumps({"error": "Proposal not found"})
            }
        
        # Generate suggestions based on current content
        suggestions = []
        
        for section in proposal.sections:
            if not section.content.strip():
                suggestions.append({
                    "type": "missing_content",
                    "section_id": section.id,
                    "section_title": section.title,
                    "message": f"Consider adding content to the '{section.title}' section",
                    "action": "generate"
                })
            elif len(section.content) < 100:
                suggestions.append({
                    "type": "expand_content",
                    "section_id": section.id,
                    "section_title": section.title,
                    "message": f"The '{section.title}' section could be expanded with more details",
                    "action": "improve"
                })
        
        # Check if executive summary exists
        has_summary = any(s.id == "executive-summary" for s in proposal.sections)
        if not has_summary and len(proposal.sections) > 2:
            suggestions.append({
                "type": "add_summary",
                "message": "Consider adding an executive summary to your proposal",
                "action": "summarize"
            })
        
        return {
            "statusCode": 200,
            "body": json.dumps({
                "suggestions": suggestions,
                "count": len(suggestions)
            })
        }
        
    except Exception as e:
        logger.error(f"Get suggestions error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
