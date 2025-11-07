import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
import boto3
from botocore.exceptions import ClientError
import logging

from ..models.proposal import Proposal, ProposalSection, ProposalStatus, AIGenerationRequest
from ..utils.bedrock_client import BedrockClient

logger = logging.getLogger(__name__)


class ProposalService:
    def __init__(self, table_name: str = "igad-proposals", region_name: str = "us-east-1"):
        self.dynamodb = boto3.resource("dynamodb", region_name=region_name)
        self.table = self.dynamodb.Table(table_name)
        self.bedrock_client = BedrockClient(region_name)
    
    async def create_proposal(
        self,
        user_id: str,
        title: str,
        description: str = "",
        template_id: Optional[str] = None
    ) -> Proposal:
        """Create a new proposal"""
        proposal_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        proposal = Proposal(
            id=proposal_id,
            user_id=user_id,
            title=title,
            description=description,
            template_id=template_id,
            status=ProposalStatus.DRAFT,
            created_at=now,
            updated_at=now
        )
        
        try:
            # Save to DynamoDB
            self.table.put_item(Item=proposal.dict())
            logger.info(f"Created proposal {proposal_id} for user {user_id}")
            return proposal
        except ClientError as e:
            logger.error(f"Failed to create proposal: {e}")
            raise Exception(f"Failed to create proposal: {str(e)}")
    
    async def get_proposal(self, proposal_id: str, user_id: str) -> Optional[Proposal]:
        """Get a proposal by ID"""
        try:
            response = self.table.get_item(
                Key={"id": proposal_id}
            )
            
            if "Item" not in response:
                return None
            
            item = response["Item"]
            
            # Check if user has access
            if item["user_id"] != user_id:
                raise Exception("Access denied")
            
            return Proposal(**item)
        except ClientError as e:
            logger.error(f"Failed to get proposal {proposal_id}: {e}")
            raise Exception(f"Failed to retrieve proposal: {str(e)}")
    
    async def update_proposal(
        self,
        proposal_id: str,
        user_id: str,
        updates: Dict[str, Any]
    ) -> Proposal:
        """Update a proposal"""
        try:
            # First get the existing proposal
            proposal = await self.get_proposal(proposal_id, user_id)
            if not proposal:
                raise Exception("Proposal not found")
            
            # Update fields
            updates["updated_at"] = datetime.utcnow()
            updates["version"] = proposal.version + 1
            
            # Build update expression
            update_expression = "SET "
            expression_values = {}
            
            for key, value in updates.items():
                update_expression += f"{key} = :{key}, "
                expression_values[f":{key}"] = value
            
            update_expression = update_expression.rstrip(", ")
            
            # Update in DynamoDB
            response = self.table.update_item(
                Key={"id": proposal_id},
                UpdateExpression=update_expression,
                ExpressionAttributeValues=expression_values,
                ReturnValues="ALL_NEW"
            )
            
            return Proposal(**response["Attributes"])
        except ClientError as e:
            logger.error(f"Failed to update proposal {proposal_id}: {e}")
            raise Exception(f"Failed to update proposal: {str(e)}")
    
    async def list_proposals(self, user_id: str) -> List[Proposal]:
        """List all proposals for a user"""
        try:
            response = self.table.scan(
                FilterExpression="user_id = :user_id",
                ExpressionAttributeValues={":user_id": user_id}
            )
            
            proposals = []
            for item in response.get("Items", []):
                proposals.append(Proposal(**item))
            
            # Sort by updated_at descending
            proposals.sort(key=lambda x: x.updated_at, reverse=True)
            return proposals
        except ClientError as e:
            logger.error(f"Failed to list proposals for user {user_id}: {e}")
            raise Exception(f"Failed to list proposals: {str(e)}")
    
    async def delete_proposal(self, proposal_id: str, user_id: str) -> bool:
        """Delete a proposal"""
        try:
            # Verify ownership
            proposal = await self.get_proposal(proposal_id, user_id)
            if not proposal:
                raise Exception("Proposal not found")
            
            self.table.delete_item(Key={"id": proposal_id})
            logger.info(f"Deleted proposal {proposal_id}")
            return True
        except ClientError as e:
            logger.error(f"Failed to delete proposal {proposal_id}: {e}")
            raise Exception(f"Failed to delete proposal: {str(e)}")
    
    async def generate_section_content(
        self,
        proposal_id: str,
        user_id: str,
        section_id: str,
        context_data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Generate AI content for a proposal section"""
        try:
            # Get the proposal
            proposal = await self.get_proposal(proposal_id, user_id)
            if not proposal:
                raise Exception("Proposal not found")
            
            # Find the section
            section = None
            for s in proposal.sections:
                if s.id == section_id:
                    section = s
                    break
            
            if not section:
                raise Exception("Section not found")
            
            # Prepare context data
            full_context = {
                "proposal_title": proposal.title,
                "proposal_description": proposal.description,
                "uploaded_files": proposal.uploaded_files,
                "text_inputs": proposal.text_inputs,
                **(context_data or {})
            }
            
            # Generate content using Bedrock
            result = self.bedrock_client.generate_proposal_section(
                section_title=section.title,
                context_data=full_context,
                template_content=section.content
            )
            
            # Update the section with generated content
            section.content = result["content"]
            section.ai_generated = True
            section.metadata.update({
                "ai_generation": {
                    "timestamp": datetime.utcnow().isoformat(),
                    "tokens_used": result["tokens_used"],
                    "generation_time": result["generation_time"],
                    "model_id": result["model_id"]
                }
            })
            
            # Save the updated proposal
            await self.update_proposal(
                proposal_id,
                user_id,
                {"sections": [s.dict() for s in proposal.sections]}
            )
            
            return {
                "content": result["content"],
                "tokens_used": result["tokens_used"],
                "generation_time": result["generation_time"],
                "section_id": section_id
            }
            
        except Exception as e:
            logger.error(f"Failed to generate content for section {section_id}: {e}")
            raise Exception(f"Content generation failed: {str(e)}")
    
    async def improve_section_content(
        self,
        proposal_id: str,
        user_id: str,
        section_id: str,
        improvement_type: str = "general"
    ) -> Dict[str, Any]:
        """Improve existing section content using AI"""
        try:
            proposal = await self.get_proposal(proposal_id, user_id)
            if not proposal:
                raise Exception("Proposal not found")
            
            # Find the section
            section = None
            for s in proposal.sections:
                if s.id == section_id:
                    section = s
                    break
            
            if not section or not section.content:
                raise Exception("Section not found or has no content")
            
            # Improve content using Bedrock
            context = {
                "proposal_title": proposal.title,
                "section_title": section.title
            }
            
            result = self.bedrock_client.improve_content(
                existing_content=section.content,
                improvement_type=improvement_type,
                context=context
            )
            
            # Update the section
            section.content = result["content"]
            section.metadata.update({
                "ai_improvement": {
                    "timestamp": datetime.utcnow().isoformat(),
                    "improvement_type": improvement_type,
                    "tokens_used": result["tokens_used"],
                    "generation_time": result["generation_time"]
                }
            })
            
            # Save the updated proposal
            await self.update_proposal(
                proposal_id,
                user_id,
                {"sections": [s.dict() for s in proposal.sections]}
            )
            
            return {
                "content": result["content"],
                "tokens_used": result["tokens_used"],
                "generation_time": result["generation_time"],
                "improvement_type": improvement_type
            }
            
        except Exception as e:
            logger.error(f"Failed to improve content for section {section_id}: {e}")
            raise Exception(f"Content improvement failed: {str(e)}")
    
    async def generate_executive_summary(
        self,
        proposal_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """Generate executive summary from all proposal sections"""
        try:
            proposal = await self.get_proposal(proposal_id, user_id)
            if not proposal:
                raise Exception("Proposal not found")
            
            # Collect all section content
            sections_content = {}
            for section in proposal.sections:
                if section.content.strip():
                    sections_content[section.title] = section.content
            
            if not sections_content:
                raise Exception("No content available to summarize")
            
            # Generate summary using Bedrock
            result = self.bedrock_client.generate_executive_summary(sections_content)
            
            # Add or update executive summary section
            summary_section = ProposalSection(
                id="executive-summary",
                title="Executive Summary",
                content=result["content"],
                ai_generated=True,
                order=0,
                metadata={
                    "ai_generation": {
                        "timestamp": datetime.utcnow().isoformat(),
                        "tokens_used": result["tokens_used"],
                        "generation_time": result["generation_time"],
                        "type": "executive_summary"
                    }
                }
            )
            
            # Update or add the summary section
            existing_sections = [s for s in proposal.sections if s.id != "executive-summary"]
            updated_sections = [summary_section] + existing_sections
            
            await self.update_proposal(
                proposal_id,
                user_id,
                {"sections": [s.dict() for s in updated_sections]}
            )
            
            return {
                "content": result["content"],
                "tokens_used": result["tokens_used"],
                "generation_time": result["generation_time"]
            }
            
        except Exception as e:
            logger.error(f"Failed to generate executive summary for {proposal_id}: {e}")
            raise Exception(f"Executive summary generation failed: {str(e)}")
