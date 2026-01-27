# 🚀 Screaming Architecture - Migration Execution Steps

**Date:** 2025-11-24  
**Status:** Ready to Execute  
**Estimated Time:** 2-3 hours

---

## 📋 Pre-Migration Checklist

- [ ] Commit all current changes
- [ ] Create migration branch: `git checkout -b feature/screaming-architecture-migration`
- [ ] Backup current code
- [ ] Review migration plan: `planning/setup/SCREAMING_ARCHITECTURE_MIGRATION_PLAN.md`

---

## 🎯 PHASE 1: Backend Structure Creation

### Step 1.1: Create Base Tool Structure

```bash
cd igad-app/backend/app

# Create tools directory
mkdir -p tools/__init__.py

# Create proposal_writer tool structure
mkdir -p tools/proposal_writer/{rfp_analysis,concept_evaluation,document_generation,workflow}

# Create subdirectories for each feature
mkdir -p tools/proposal_writer/rfp_analysis/{routers,services,workers,models}
mkdir -p tools/proposal_writer/concept_evaluation/{routers,services,workers,models}
mkdir -p tools/proposal_writer/document_generation/{routers,services,workers,models}
mkdir -p tools/proposal_writer/workflow/{routers,services,models}

# Create shared directory
mkdir -p tools/proposal_writer/shared/{models,utils,constants}
```

### Step 1.2: Create __init__.py Files

```bash
# Tool level
touch tools/__init__.py
touch tools/proposal_writer/__init__.py

# Feature level
touch tools/proposal_writer/rfp_analysis/__init__.py
touch tools/proposal_writer/concept_evaluation/__init__.py
touch tools/proposal_writer/document_generation/__init__.py
touch tools/proposal_writer/workflow/__init__.py
touch tools/proposal_writer/shared/__init__.py

# Layer level
touch tools/proposal_writer/rfp_analysis/{routers,services,workers,models}/__init__.py
touch tools/proposal_writer/concept_evaluation/{routers,services,workers,models}/__init__.py
touch tools/proposal_writer/document_generation/{routers,services,workers,models}/__init__.py
touch tools/proposal_writer/workflow/{routers,models}/__init__.py
touch tools/proposal_writer/shared/{models,utils,constants}/__init__.py
```

### Step 1.3: Create Placeholder for Future Tools

```bash
# Newsletter Generator (future)
mkdir -p tools/newsletter_generator
touch tools/newsletter_generator/__init__.py
touch tools/newsletter_generator/README.md

# Report Generator (future)
mkdir -p tools/report_generator
touch tools/report_generator/__init__.py
touch tools/report_generator/README.md

# Policy Analyzer (future)
mkdir -p tools/policy_analyzer
touch tools/policy_analyzer/__init__.py
touch tools/policy_analyzer/README.md

# Agribusiness Hub (future)
mkdir -p tools/agribusiness_hub
touch tools/agribusiness_hub/__init__.py
touch tools/agribusiness_hub/README.md
```

---

## 🎯 PHASE 2: Move Files - RFP Analysis Feature

### Step 2.1: Identify Files to Move

**Current Location → New Location:**

```
routers/proposals.py (RFP endpoints)
  → tools/proposal_writer/rfp_analysis/routers/rfp_router.py

services/rfp_analyzer.py
  → tools/proposal_writer/rfp_analysis/services/rfp_analyzer_service.py

workers/analysis_worker.py (RFP part)
  → tools/proposal_writer/rfp_analysis/workers/rfp_analysis_worker.py

models/ (Proposal, RFP related)
  → tools/proposal_writer/shared/models/proposal.py
```

### Step 2.2: Move RFP Router

```bash
# Extract RFP-related endpoints from proposals.py
# Create new file
cat > tools/proposal_writer/rfp_analysis/routers/rfp_router.py << 'EOF'
"""
RFP Analysis Router
Handles all endpoints related to RFP document analysis
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any

router = APIRouter(
    prefix="/proposals/{proposal_id}/rfp-analysis",
    tags=["RFP Analysis"]
)

# TODO: Move endpoints from routers/proposals.py:
# - POST /proposals/{proposal_id}/rfp-analysis/analyze
# - GET /proposals/{proposal_id}/rfp-analysis
# - PUT /proposals/{proposal_id}/rfp-analysis
EOF
```

### Step 2.3: Move RFP Service

```bash
# Copy and refactor rfp_analyzer.py
cp services/rfp_analyzer.py tools/proposal_writer/rfp_analysis/services/rfp_analyzer_service.py

# Update imports in the new file
# FROM: from app.services.X import Y
# TO: from app.tools.proposal_writer.shared.X import Y
```

### Step 2.4: Move RFP Worker

```bash
# Extract RFP analysis logic from analysis_worker.py
cat > tools/proposal_writer/rfp_analysis/workers/rfp_analysis_worker.py << 'EOF'
"""
RFP Analysis Worker
Background task for analyzing RFP documents with AI
"""
# TODO: Extract process_rfp_analysis() from workers/analysis_worker.py
EOF
```

---

## 🎯 PHASE 3: Move Files - Concept Evaluation Feature

### Step 3.1: Move Concept Router

```bash
cat > tools/proposal_writer/concept_evaluation/routers/concept_router.py << 'EOF'
"""
Concept Evaluation Router
Handles concept note analysis and evaluation
"""
from fastapi import APIRouter

router = APIRouter(
    prefix="/proposals/{proposal_id}/concept-evaluation",
    tags=["Concept Evaluation"]
)

# TODO: Move endpoints:
# - POST /proposals/{proposal_id}/concept-analysis/analyze
# - GET /proposals/{proposal_id}/concept-analysis
# - PUT /proposals/{proposal_id}/concept-evaluation
EOF
```

### Step 3.2: Move Concept Service

```bash
cp services/concept_analyzer.py tools/proposal_writer/concept_evaluation/services/concept_analyzer_service.py
```

### Step 3.3: Move Concept Worker

```bash
cat > tools/proposal_writer/concept_evaluation/workers/concept_analysis_worker.py << 'EOF'
"""
Concept Analysis Worker
Background task for analyzing concept notes
"""
# TODO: Extract process_concept_analysis() from workers/analysis_worker.py
EOF
```

---

## 🎯 PHASE 4: Move Files - Document Generation Feature

### Step 4.1: Move Document Router

```bash
cat > tools/proposal_writer/document_generation/routers/document_router.py << 'EOF'
"""
Document Generation Router
Handles concept document generation
"""
from fastapi import APIRouter

router = APIRouter(
    prefix="/proposals/{proposal_id}/concept-document",
    tags=["Document Generation"]
)

# TODO: Move endpoints:
# - POST /proposals/{proposal_id}/concept-document/generate
# - GET /proposals/{proposal_id}/concept-document
EOF
```

### Step 4.2: Move Document Service

```bash
cp services/concept_document_generator.py tools/proposal_writer/document_generation/services/document_generator_service.py
```

### Step 4.3: Move Document Worker

```bash
cat > tools/proposal_writer/document_generation/workers/document_generation_worker.py << 'EOF'
"""
Document Generation Worker
Background task for generating concept documents
"""
# TODO: Extract generate_concept_document() from workers/analysis_worker.py
EOF
```

---

## 🎯 PHASE 5: Create Shared Models

### Step 5.1: Move Proposal Models

```bash
cat > tools/proposal_writer/shared/models/proposal.py << 'EOF'
"""
Proposal Domain Models
Shared models across all proposal writer features
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class ProposalMetadata(BaseModel):
    proposal_id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    status: str

class RFPAnalysisResult(BaseModel):
    donor_info: Dict[str, Any]
    evaluation_criteria: List[Dict[str, Any]]
    key_requirements: List[str]
    
class ConceptEvaluationResult(BaseModel):
    fit_assessment: Dict[str, Any]
    sections_needing_elaboration: List[Dict[str, Any]]
    strategic_verdict: str

class ConceptDocument(BaseModel):
    proposal_outline: List[Dict[str, Any]]
    hcd_notes: List[Dict[str, Any]]
    
# TODO: Move all proposal-related models from app/models/
EOF
```

### Step 5.2: Create Constants

```bash
cat > tools/proposal_writer/shared/constants/__init__.py << 'EOF'
"""
Proposal Writer Constants
"""

# Analysis statuses
class AnalysisStatus:
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

# Document types
class DocumentType:
    RFP = "rfp"
    CONCEPT_NOTE = "concept_note"
    FULL_PROPOSAL = "full_proposal"

# Step numbers
class ProposalStep:
    RFP_ANALYSIS = 1
    CONCEPT_EVALUATION = 2
    DOCUMENT_GENERATION = 3
    REFINEMENT = 4
EOF
```

---

## 🎯 PHASE 6: Update Main Router Registration

### Step 6.1: Create Tool Router Aggregator

```bash
cat > tools/proposal_writer/__init__.py << 'EOF'
"""
Proposal Writer Tool
Main module that aggregates all proposal writer features
"""
from fastapi import APIRouter
from .rfp_analysis.routers.rfp_router import router as rfp_router
from .concept_evaluation.routers.concept_router import router as concept_router
from .document_generation.routers.document_router import router as document_router

# Create main tool router
tool_router = APIRouter(prefix="/proposal-writer", tags=["Proposal Writer"])

# Include feature routers
tool_router.include_router(rfp_router)
tool_router.include_router(concept_router)
tool_router.include_router(document_router)

__all__ = ["tool_router"]
EOF
```

### Step 6.2: Update main.py

```python
# In app/main.py

# OLD:
from app.routers import proposals

# NEW:
from app.tools.proposal_writer import tool_router as proposal_writer_router

# OLD:
app.include_router(proposals.router)

# NEW:
app.include_router(proposal_writer_router)
```

---

## 🎯 PHASE 7: Update Imports Throughout Codebase

### Step 7.1: Update Service Imports

```bash
# Find all files importing old services
grep -r "from app.services.rfp_analyzer" app/

# Replace with:
# from app.tools.proposal_writer.rfp_analysis.services.rfp_analyzer_service import RFPAnalyzer
```

### Step 7.2: Update Worker Imports

```bash
# Find all files importing old workers
grep -r "from app.workers.analysis_worker" app/

# Update to new paths
```

### Step 7.3: Update Model Imports

```bash
# Find all model imports
grep -r "from app.models" app/ | grep -i proposal

# Update to:
# from app.tools.proposal_writer.shared.models.proposal import ProposalMetadata
```

---

## 🎯 PHASE 8: Frontend Structure Creation

### Step 8.1: Create Tools Directory

```bash
cd igad-app/frontend/src

mkdir -p tools/proposal-writer/{rfp-analysis,concept-evaluation,document-generation,workflow}
mkdir -p tools/proposal-writer/shared/{components,hooks,types,utils}
```

### Step 8.2: Move RFP Analysis Components

```bash
# Create feature directory
mkdir -p tools/proposal-writer/rfp-analysis/{components,hooks,types}

# Move Step1 component
mv app/proposal-writer/Step1.tsx tools/proposal-writer/rfp-analysis/components/RfpAnalysisStep.tsx

# Create index
cat > tools/proposal-writer/rfp-analysis/index.ts << 'EOF'
export { RfpAnalysisStep } from './components/RfpAnalysisStep';
export * from './types';
export * from './hooks';
EOF
```

### Step 8.3: Move Concept Evaluation Components

```bash
mkdir -p tools/proposal-writer/concept-evaluation/{components,hooks,types}

# Move Step2
mv app/proposal-writer/Step2.tsx tools/proposal-writer/concept-evaluation/components/ConceptEvaluationStep.tsx
```

### Step 8.4: Move Document Generation Components

```bash
mkdir -p tools/proposal-writer/document-generation/{components,hooks,types}

# Move Step3
mv app/proposal-writer/Step3.tsx tools/proposal-writer/document-generation/components/DocumentGenerationStep.tsx
```

---

## 🎯 PHASE 9: Update Frontend Imports

### Step 9.1: Update ProposalWriter.tsx

```typescript
// OLD:
import Step1 from './Step1';
import Step2 from './Step2';
import Step3 from './Step3';

// NEW:
import { RfpAnalysisStep } from '@/tools/proposal-writer/rfp-analysis';
import { ConceptEvaluationStep } from '@/tools/proposal-writer/concept-evaluation';
import { DocumentGenerationStep } from '@/tools/proposal-writer/document-generation';
```

### Step 9.2: Create Shared Types

```bash
cat > tools/proposal-writer/shared/types/index.ts << 'EOF'
export interface ProposalMetadata {
  proposalId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  status: string;
}

export interface RfpAnalysis {
  donorInfo: any;
  evaluationCriteria: any[];
  keyRequirements: string[];
}

export interface ConceptEvaluation {
  fitAssessment: any;
  sectionsNeedingElaboration: any[];
  strategicVerdict: string;
}

export interface ConceptDocument {
  proposalOutline: any[];
  hcdNotes: any[];
}
EOF
```

---

## 🎯 PHASE 10: Testing & Validation

### Step 10.1: Backend Testing

```bash
cd igad-app/backend

# Run tests
pytest tests/

# Check import errors
python -m app.main

# Test each endpoint
curl http://localhost:8000/proposal-writer/proposals/{id}/rfp-analysis
```

### Step 10.2: Frontend Testing

```bash
cd igad-app/frontend

# Check build
npm run build

# Run dev server
npm run dev

# Test each step navigation
```

### Step 10.3: Integration Testing

```bash
# Test full flow:
# 1. Upload RFP
# 2. Analyze
# 3. Upload Concept
# 4. Evaluate
# 5. Generate Document
```

---

## 🎯 PHASE 11: Cleanup Old Files

### Step 11.1: Remove Old Backend Files

```bash
# ONLY after all tests pass!

# Remove old routers (keep backups)
mv routers/proposals.py routers/proposals.py.backup

# Remove old services
mv services/rfp_analyzer.py services/rfp_analyzer.py.backup
mv services/concept_analyzer.py services/concept_analyzer.py.backup
mv services/concept_document_generator.py services/concept_document_generator.py.backup

# Remove old workers (after extracting logic)
mv workers/analysis_worker.py workers/analysis_worker.py.backup
```

### Step 11.2: Remove Old Frontend Files

```bash
# ONLY after all tests pass!

mv app/proposal-writer/Step1.tsx app/proposal-writer/Step1.tsx.backup
mv app/proposal-writer/Step2.tsx app/proposal-writer/Step2.tsx.backup
mv app/proposal-writer/Step3.tsx app/proposal-writer/Step3.tsx.backup
```

---

## 🎯 PHASE 12: Documentation

### Step 12.1: Update README Files

```bash
# Create tool README
cat > tools/proposal_writer/README.md << 'EOF'
# Proposal Writer Tool

## Features

1. **RFP Analysis** - Analyze RFP documents
2. **Concept Evaluation** - Evaluate concept notes
3. **Document Generation** - Generate proposal documents
4. **Workflow** - Manage proposal workflow

## Structure

\`\`\`
proposal_writer/
├── rfp_analysis/         # Feature: RFP Analysis
├── concept_evaluation/   # Feature: Concept Evaluation
├── document_generation/  # Feature: Document Generation
├── workflow/             # Feature: Workflow Management
└── shared/               # Shared resources
\`\`\`
EOF
```

### Step 12.2: Create Architecture Documentation

```bash
cat > planning/setup/ARCHITECTURE_OVERVIEW.md << 'EOF'
# IGAD Platform - Screaming Architecture Overview

## Backend Structure

\`\`\`
app/
├── tools/
│   ├── proposal_writer/     # TOOL: Proposal Writer
│   ├── newsletter_generator/ # TOOL: Newsletter (future)
│   ├── report_generator/    # TOOL: Report (future)
│   ├── policy_analyzer/     # TOOL: Policy (future)
│   └── agribusiness_hub/    # TOOL: Agribusiness (future)
├── routers/                 # Cross-cutting routers
├── services/                # Cross-cutting services
└── models/                  # Cross-cutting models
\`\`\`

## Frontend Structure

\`\`\`
src/
├── tools/
│   ├── proposal-writer/
│   ├── newsletter-generator/
│   └── ...
├── app/                     # Routes
└── components/              # Shared components
\`\`\`
EOF
```

---

## ✅ Migration Completion Checklist

- [ ] All backend files moved to new structure
- [ ] All frontend files moved to new structure
- [ ] All imports updated
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Old files backed up
- [ ] Git commit created
- [ ] PR created for review

---

## 🚨 Rollback Plan

If migration fails:

```bash
git checkout main
git branch -D feature/screaming-architecture-migration
# Restore from backup
```

---

## 📝 Notes

- Keep old files as `.backup` until migration is fully validated
- Test each phase before moving to next
- Update tests as you migrate files
- Document any issues encountered
