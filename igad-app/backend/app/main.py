from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import asyncio
import json
import uuid
from datetime import datetime

# Mock data storage (replace with DynamoDB in production)
proposals_db = {}
security = HTTPBearer()

app = FastAPI(title="IGAD Proposal Writer API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class ProposalCreate(BaseModel):
    title: str
    description: str = ""
    template_id: Optional[str] = None

class ProposalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    uploaded_files: Optional[Dict[str, List[str]]] = None
    text_inputs: Optional[Dict[str, str]] = None
    metadata: Optional[Dict[str, Any]] = None

class AIGenerateRequest(BaseModel):
    section_id: str
    context_data: Optional[Dict[str, Any]] = None

class AIImproveRequest(BaseModel):
    section_id: str
    improvement_type: str = "general"

# Mock auth
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # Mock user - in production, validate JWT token
    return {"user_id": "mock-user-123", "email": "user@example.com"}

# Mock Bedrock client
class MockBedrockClient:
    async def generate_content(self, prompt: str, **kwargs):
        # Simulate AI processing delay
        await asyncio.sleep(2)
        
        return {
            "content": f"AI-generated content based on: {prompt[:100]}...\n\nThis is a mock response that would normally come from Amazon Bedrock Claude 3. The content would be contextually relevant to the proposal section and include professional language suitable for funding proposals.",
            "tokens_used": 150,
            "generation_time": 2.0,
            "model_id": "anthropic.claude-3-sonnet-20240229-v1:0"
        }

bedrock_client = MockBedrockClient()

# Routes
@app.get("/")
async def root():
    return {
        "message": "IGAD Proposal Writer API",
        "version": "1.0.0",
        "description": "AI-powered proposal generation platform for IGAD Innovation Hub",
        "docs_url": "/docs",
        "health_url": "/health",
        "api_prefix": "/api"
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "igad-proposal-writer"}

@app.post("/api/proposals")
async def create_proposal(
    proposal: ProposalCreate,
    current_user: dict = Depends(get_current_user)
):
    proposal_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    new_proposal = {
        "id": proposal_id,
        "user_id": current_user["user_id"],
        "title": proposal.title,
        "description": proposal.description,
        "template_id": proposal.template_id,
        "status": "draft",
        "sections": [],
        "metadata": {},
        "uploaded_files": {},
        "text_inputs": {},
        "ai_context": {},
        "created_at": now,
        "updated_at": now,
        "version": 1
    }
    
    proposals_db[proposal_id] = new_proposal
    
    return {"proposal": new_proposal, "message": "Proposal created successfully"}

@app.get("/api/proposals")
async def list_proposals(current_user: dict = Depends(get_current_user)):
    user_proposals = [
        p for p in proposals_db.values() 
        if p["user_id"] == current_user["user_id"]
    ]
    
    # Sort by updated_at descending
    user_proposals.sort(key=lambda x: x["updated_at"], reverse=True)
    
    return {"proposals": user_proposals, "count": len(user_proposals)}

@app.get("/api/proposals/{proposal_id}")
async def get_proposal(
    proposal_id: str,
    current_user: dict = Depends(get_current_user)
):
    if proposal_id not in proposals_db:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    proposal = proposals_db[proposal_id]
    
    if proposal["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {"proposal": proposal}

@app.put("/api/proposals/{proposal_id}")
async def update_proposal(
    proposal_id: str,
    updates: ProposalUpdate,
    current_user: dict = Depends(get_current_user)
):
    if proposal_id not in proposals_db:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    proposal = proposals_db[proposal_id]
    
    if proposal["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update fields
    update_data = updates.dict(exclude_unset=True)
    for key, value in update_data.items():
        proposal[key] = value
    
    proposal["updated_at"] = datetime.utcnow().isoformat()
    proposal["version"] += 1
    
    return {"proposal": proposal, "message": "Proposal updated successfully"}

@app.delete("/api/proposals/{proposal_id}")
async def delete_proposal(
    proposal_id: str,
    current_user: dict = Depends(get_current_user)
):
    if proposal_id not in proposals_db:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    proposal = proposals_db[proposal_id]
    
    if proposal["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    del proposals_db[proposal_id]
    
    return {"message": "Proposal deleted successfully"}

@app.post("/api/proposals/{proposal_id}/generate")
async def generate_content(
    proposal_id: str,
    request: AIGenerateRequest,
    current_user: dict = Depends(get_current_user)
):
    if proposal_id not in proposals_db:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    proposal = proposals_db[proposal_id]
    
    if proposal["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Generate content using mock Bedrock
    context_str = json.dumps(request.context_data or {}, indent=2)
    prompt = f"Generate content for section '{request.section_id}' with context: {context_str}"
    
    result = await bedrock_client.generate_content(prompt)
    
    return {
        "result": {
            "content": result["content"],
            "tokens_used": result["tokens_used"],
            "generation_time": result["generation_time"],
            "section_id": request.section_id
        },
        "message": "Content generated successfully"
    }

@app.post("/api/proposals/{proposal_id}/improve")
async def improve_content(
    proposal_id: str,
    request: AIImproveRequest,
    current_user: dict = Depends(get_current_user)
):
    if proposal_id not in proposals_db:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    proposal = proposals_db[proposal_id]
    
    if proposal["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Improve content using mock Bedrock
    prompt = f"Improve content for section '{request.section_id}' with improvement type: {request.improvement_type}"
    
    result = await bedrock_client.generate_content(prompt)
    
    return {
        "result": {
            "content": result["content"],
            "tokens_used": result["tokens_used"],
            "generation_time": result["generation_time"],
            "improvement_type": request.improvement_type
        },
        "message": "Content improved successfully"
    }

@app.post("/api/proposals/{proposal_id}/summarize")
async def generate_summary(
    proposal_id: str,
    current_user: dict = Depends(get_current_user)
):
    if proposal_id not in proposals_db:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    proposal = proposals_db[proposal_id]
    
    if proposal["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Generate summary using mock Bedrock
    prompt = f"Generate executive summary for proposal: {proposal['title']}"
    
    result = await bedrock_client.generate_content(prompt)
    
    return {
        "result": {
            "content": result["content"],
            "tokens_used": result["tokens_used"],
            "generation_time": result["generation_time"]
        },
        "message": "Executive summary generated successfully"
    }

@app.get("/api/proposals/{proposal_id}/suggestions")
async def get_suggestions(
    proposal_id: str,
    current_user: dict = Depends(get_current_user)
):
    if proposal_id not in proposals_db:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    proposal = proposals_db[proposal_id]
    
    if proposal["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Generate mock suggestions
    suggestions = []
    
    if not proposal.get("text_inputs", {}).get("initial-concept"):
        suggestions.append({
            "type": "missing_content",
            "message": "Consider adding your initial concept to improve AI analysis",
            "action": "add_content"
        })
    
    if not proposal.get("uploaded_files", {}).get("rfp-document"):
        suggestions.append({
            "type": "missing_document",
            "message": "Upload the RFP document for better alignment analysis",
            "action": "upload_file"
        })
    
    suggestions.append({
        "type": "add_summary",
        "message": "Consider adding an executive summary to your proposal",
        "action": "summarize"
    })
    
    return {"suggestions": suggestions, "count": len(suggestions)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
