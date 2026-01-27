# 🏗️ SCREAMING ARCHITECTURE - DETAILED MIGRATION PLAN

**Date Created:** 2025-01-24  
**Status:** Planning  
**Objective:** Migrate IGAD app from technical-oriented structure to business-domain-driven Screaming Architecture

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Current vs Target Architecture](#current-vs-target-architecture)
3. [Migration Phases](#migration-phases)
4. [Detailed Migration Steps](#detailed-migration-steps)
5. [Testing Strategy](#testing-strategy)
6. [Rollback Plan](#rollback-plan)
7. [Success Metrics](#success-metrics)

---

## 🎯 EXECUTIVE SUMMARY

### What is Screaming Architecture?

**Screaming Architecture** (Uncle Bob Martin) is an architectural approach where the folder structure **screams the business domain**, not the technical framework.

**Before (Technical-First):**
```
routers/     ← "I'm a web framework!"
services/    ← "I use services!"
models/      ← "I have data!"
```

**After (Business-First):**
```
tools/
  proposal_writer/     ← "I help write proposals!"
  newsletter_generator/← "I create newsletters!"
  policy_analyzer/     ← "I analyze policies!"
```

### Why Migrate?

1. **Multi-Tool System:** IGAD will have 5+ tools, current structure doesn't scale
2. **Team Growth:** New developers should understand business immediately
3. **Maintenance:** Changes to one tool shouldn't affect others
4. **Modularity:** Each tool can be deployed/tested independently

### Migration Approach

- **Strategy:** Gradual, feature-by-feature migration
- **Duration:** 4-6 weeks (parallel with feature development)
- **Risk:** Low (incremental, fully reversible)
- **Downtime:** Zero (done in development, deployed atomically)

---

## 🏛️ CURRENT VS TARGET ARCHITECTURE

### BACKEND - Current Structure

```
igad-app/backend/app/
├── routers/
│   ├── proposals.py          # 1200+ lines, mixed concerns
│   ├── newsletter.py
│   ├── auth.py
│   └── admin.py
├── services/
│   ├── rfp_analyzer.py
│   ├── concept_analyzer.py
│   ├── concept_document_generator.py
│   └── newsletter_service.py
├── workers/
│   ├── analysis_worker.py
│   └── newsletter_worker.py
└── models/
    ├── proposal.py
    └── user.py
```

**Problems:**
- ❌ Can't tell what business problems the app solves
- ❌ proposal.py router handles 5 different features (RFP, concept, document, etc.)
- ❌ Services scattered across different concerns
- ❌ Hard to understand proposal workflow

---

### BACKEND - Target Structure

```
igad-app/backend/app/
├── tools/                                    # 🎯 BUSINESS DOMAIN LAYER
│   ├── proposal_writer/                      # Tool 1: Proposal Writer
│   │   ├── __init__.py
│   │   ├── router.py                         # Main tool router
│   │   │
│   │   ├── rfp_analysis/                     # Feature 1: RFP Analysis
│   │   │   ├── __init__.py
│   │   │   ├── service.py                    # Business logic
│   │   │   ├── worker.py                     # Background processing
│   │   │   ├── models.py                     # Data models
│   │   │   └── prompts.py                    # AI prompts
│   │   │
│   │   ├── concept_evaluation/               # Feature 2: Concept Evaluation
│   │   │   ├── __init__.py
│   │   │   ├── service.py
│   │   │   ├── worker.py
│   │   │   ├── models.py
│   │   │   └── prompts.py
│   │   │
│   │   ├── document_generation/              # Feature 3: Document Generation
│   │   │   ├── __init__.py
│   │   │   ├── service.py
│   │   │   ├── worker.py
│   │   │   ├── models.py
│   │   │   └── prompts.py
│   │   │
│   │   ├── proposal_repository.py            # Data access layer
│   │   └── workflow.py                       # Orchestration logic
│   │
│   ├── newsletter_generator/                 # Tool 2: Newsletter Generator
│   │   ├── __init__.py
│   │   ├── router.py
│   │   ├── content_generation/
│   │   ├── email_delivery/
│   │   └── newsletter_repository.py
│   │
│   ├── report_generator/                     # Tool 3: Report Generator (future)
│   ├── policy_analyzer/                      # Tool 4: Policy Analyzer (future)
│   └── agribusiness_hub/                     # Tool 5: Agribusiness Hub (future)
│
├── shared/                                   # 🔧 TECHNICAL INFRASTRUCTURE LAYER
│   ├── ai/                                   # AI utilities
│   │   ├── openai_client.py
│   │   └── prompt_manager.py
│   ├── storage/                              # Storage utilities
│   │   ├── dynamodb.py
│   │   └── s3.py
│   ├── auth/                                 # Authentication
│   │   ├── cognito.py
│   │   └── middleware.py
│   └── monitoring/                           # Observability
│       ├── logger.py
│       └── metrics.py
│
├── admin/                                    # 🎛️ ADMIN MODULE
│   ├── __init__.py
│   ├── router.py
│   ├── settings/
│   │   ├── service.py
│   │   └── models.py
│   └── prompts_manager/
│       ├── service.py
│       └── models.py
│
└── main.py                                   # FastAPI app bootstrap
```

**Benefits:**
- ✅ Screams "I manage proposals, newsletters, reports!"
- ✅ Each tool is self-contained
- ✅ Easy to add new tools
- ✅ Clear separation: business domain vs technical infrastructure

---

### FRONTEND - Current Structure

```
igad-app/frontend/src/
├── components/
│   ├── ProposalWriter/
│   │   ├── Step1Analysis.tsx         # Mixed UI + business logic
│   │   ├── Step2ConceptReview.tsx
│   │   ├── Step3ConceptDocument.tsx
│   │   └── Step4ProposalDraft.tsx
│   ├── Newsletter/
│   └── common/
├── lib/
│   └── api.ts                        # All API calls mixed
├── hooks/
│   └── useProposal.ts
└── pages/
    ├── proposal-writer.tsx
    └── newsletter.tsx
```

**Problems:**
- ❌ Business logic mixed with UI components
- ❌ API calls scattered
- ❌ Hard to reuse proposal workflow logic
- ❌ No clear feature boundaries

---

### FRONTEND - Target Structure

```
igad-app/frontend/src/
├── tools/                                    # 🎯 BUSINESS DOMAIN LAYER
│   ├── proposal-writer/
│   │   ├── features/                         # Features (business capabilities)
│   │   │   ├── rfp-analysis/
│   │   │   │   ├── components/               # UI components
│   │   │   │   │   ├── AnalysisViewer.tsx
│   │   │   │   │   └── UploadForm.tsx
│   │   │   │   ├── hooks/                    # React hooks
│   │   │   │   │   └── useRfpAnalysis.ts
│   │   │   │   ├── api.ts                    # API calls
│   │   │   │   ├── types.ts                  # TypeScript types
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── concept-evaluation/
│   │   │   │   ├── components/
│   │   │   │   │   ├── ConceptReviewer.tsx
│   │   │   │   │   └── SectionSelector.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useConceptEvaluation.ts
│   │   │   │   ├── api.ts
│   │   │   │   ├── types.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── document-generation/
│   │   │   │   ├── components/
│   │   │   │   │   ├── OutlineEditor.tsx
│   │   │   │   │   └── EditSectionsModal.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useDocumentGeneration.ts
│   │   │   │   ├── api.ts
│   │   │   │   ├── types.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── proposal-draft/
│   │   │       └── ... (same structure)
│   │   │
│   │   ├── components/                       # Shared tool components
│   │   │   ├── ProposalWorkflow.tsx
│   │   │   └── ProgressTracker.tsx
│   │   │
│   │   ├── hooks/                            # Shared tool hooks
│   │   │   └── useProposalWorkflow.ts
│   │   │
│   │   ├── lib/                              # Tool utilities
│   │   │   ├── workflow-state.ts
│   │   │   └── validation.ts
│   │   │
│   │   └── pages/                            # Tool pages
│   │       └── ProposalWriterPage.tsx
│   │
│   ├── newsletter-generator/                 # Tool 2
│   │   └── ... (same structure)
│   │
│   ├── report-generator/                     # Tool 3 (future)
│   ├── policy-analyzer/                      # Tool 4 (future)
│   └── agribusiness-hub/                     # Tool 5 (future)
│
├── shared/                                   # 🔧 SHARED INFRASTRUCTURE
│   ├── components/                           # Reusable UI components
│   │   ├── Button/
│   │   ├── Modal/
│   │   ├── FileUpload/
│   │   └── LoadingSpinner/
│   │
│   ├── hooks/                                # Shared React hooks
│   │   ├── useAuth.ts
│   │   ├── useApi.ts
│   │   └── useLocalStorage.ts
│   │
│   ├── lib/                                  # Utilities
│   │   ├── api-client.ts
│   │   ├── error-handler.ts
│   │   └── formatters.ts
│   │
│   └── types/                                # Global types
│       └── common.ts
│
├── admin/                                    # 🎛️ ADMIN MODULE
│   ├── features/
│   │   ├── settings/
│   │   └── prompts-manager/
│   └── pages/
│       └── AdminPage.tsx
│
├── auth/                                     # 🔐 AUTHENTICATION
│   ├── components/
│   │   └── LoginForm.tsx
│   └── pages/
│       └── LoginPage.tsx
│
└── pages/                                    # 📄 NEXT.JS PAGES (routes only)
    ├── index.tsx                             # Landing page
    ├── login.tsx                             # → /auth/pages/LoginPage
    ├── proposal-writer.tsx                   # → /tools/proposal-writer/pages/
    ├── newsletter.tsx                        # → /tools/newsletter-generator/pages/
    └── admin.tsx                             # → /admin/pages/
```

**Benefits:**
- ✅ Each feature is self-contained
- ✅ Business logic separated from UI
- ✅ Easy to find and modify features
- ✅ Reusable across tools
- ✅ Next.js pages become simple routers

---

## 📅 MIGRATION PHASES

### Phase 1: Preparation (Week 1)
**Goal:** Set up new structure without breaking existing code

- [ ] Create new folder structure
- [ ] Set up import aliases
- [ ] Document migration process
- [ ] Create testing baseline

### Phase 2: Backend Migration (Week 2-3)
**Goal:** Move Proposal Writer backend to new structure

- [ ] Migrate RFP Analysis feature
- [ ] Migrate Concept Evaluation feature
- [ ] Migrate Document Generation feature
- [ ] Update routers and dependencies
- [ ] Test thoroughly

### Phase 3: Frontend Migration (Week 4-5)
**Goal:** Move Proposal Writer frontend to new structure

- [ ] Migrate RFP Analysis feature
- [ ] Migrate Concept Evaluation feature
- [ ] Migrate Document Generation feature
- [ ] Update pages and routing
- [ ] Test thoroughly

### Phase 4: Cleanup & Polish (Week 6)
**Goal:** Remove old code, optimize, document

- [ ] Delete old files
- [ ] Update documentation
- [ ] Performance optimization
- [ ] Final testing
- [ ] Deploy to production

---

## 🔧 DETAILED MIGRATION STEPS

### BACKEND MIGRATION - Step by Step

#### Step 1: Create New Structure (Day 1)

```bash
cd igad-app/backend/app/

# Create tools directory
mkdir -p tools/proposal_writer/{rfp_analysis,concept_evaluation,document_generation}

# Create shared directory
mkdir -p shared/{ai,storage,auth,monitoring}

# Create admin directory
mkdir -p admin/{settings,prompts_manager}
```

#### Step 2: Migrate RFP Analysis Feature (Day 2-3)

**2.1. Create Feature Structure**

```bash
cd tools/proposal_writer/rfp_analysis/
touch __init__.py service.py worker.py models.py prompts.py
```

**2.2. Move Service Logic**

```python
# OLD: app/services/rfp_analyzer.py
# NEW: app/tools/proposal_writer/rfp_analysis/service.py

class RfpAnalysisService:
    """Handles RFP document analysis business logic"""
    
    def __init__(self, ai_client, storage_client):
        self.ai = ai_client
        self.storage = storage_client
    
    async def analyze_rfp(self, proposal_id: str, file_data: bytes) -> RfpAnalysisResult:
        """Main business logic for RFP analysis"""
        # ... extracted from old service
```

**2.3. Move Worker Logic**

```python
# OLD: app/workers/analysis_worker.py (partial)
# NEW: app/tools/proposal_writer/rfp_analysis/worker.py

async def process_rfp_analysis(proposal_id: str, file_key: str):
    """Background worker for RFP analysis"""
    # ... extracted from old worker
```

**2.4. Move Models**

```python
# OLD: app/models/proposal.py (partial)
# NEW: app/tools/proposal_writer/rfp_analysis/models.py

from pydantic import BaseModel

class RfpAnalysisRequest(BaseModel):
    proposal_id: str
    file_content: bytes

class RfpAnalysisResult(BaseModel):
    donor_info: dict
    evaluation_criteria: list
    # ...
```

**2.5. Move Prompts**

```python
# NEW: app/tools/proposal_writer/rfp_analysis/prompts.py

RFP_ANALYSIS_SYSTEM_PROMPT = """
You are Agent 1 - RFP Intelligence & Requirements Extraction...
"""

RFP_ANALYSIS_USER_PROMPT = """
Analyze the following RFP document...
"""
```

**2.6. Create Router Endpoint**

```python
# NEW: app/tools/proposal_writer/router.py

from fastapi import APIRouter
from .rfp_analysis import service as rfp_service

router = APIRouter(prefix="/proposal-writer", tags=["proposal-writer"])

@router.post("/rfp-analysis")
async def analyze_rfp(request: RfpAnalysisRequest):
    """Analyze RFP document"""
    service = rfp_service.RfpAnalysisService(ai_client, storage_client)
    return await service.analyze_rfp(request.proposal_id, request.file_content)
```

**2.7. Update Main App**

```python
# app/main.py

from tools.proposal_writer import router as proposal_writer_router

app.include_router(proposal_writer_router)
```

**2.8. Test**

```bash
# Run tests
pytest app/tools/proposal_writer/rfp_analysis/tests/

# Manual test
curl -X POST http://localhost:8000/proposal-writer/rfp-analysis
```

#### Step 3: Migrate Concept Evaluation Feature (Day 4-5)

**Repeat same process:**
- Create feature structure
- Move service.py
- Move worker.py
- Move models.py
- Move prompts.py
- Add router endpoint
- Test

#### Step 4: Migrate Document Generation Feature (Day 6-7)

**Same process as Step 3**

#### Step 5: Create Shared Infrastructure (Day 8-9)

**5.1. Move AI Client**

```python
# OLD: app/services/openai_client.py
# NEW: app/shared/ai/openai_client.py

class OpenAIClient:
    """Shared AI client for all tools"""
    # ... existing code
```

**5.2. Move Storage**

```python
# OLD: app/services/s3_service.py
# NEW: app/shared/storage/s3.py

class S3Storage:
    """Shared S3 storage"""
    # ... existing code
```

**5.3. Move Auth**

```python
# OLD: app/middleware/auth.py
# NEW: app/shared/auth/middleware.py
```

#### Step 6: Update All Imports (Day 10)

```python
# Update all files with new import paths

# OLD
from app.services.rfp_analyzer import RfpAnalyzer

# NEW
from app.tools.proposal_writer.rfp_analysis.service import RfpAnalysisService
```

**Use automated script:**

```bash
# scripts/update_imports.py
import re
import os

def update_imports_in_file(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Replace old imports with new ones
    content = content.replace(
        'from app.services.rfp_analyzer',
        'from app.tools.proposal_writer.rfp_analysis.service'
    )
    # ... more replacements
    
    with open(file_path, 'w') as f:
        f.write(content)

# Run on all Python files
```

#### Step 7: Delete Old Files (Day 11)

```bash
# BACKUP FIRST!
cp -r app/routers app/routers.backup
cp -r app/services app/services.backup
cp -r app/workers app/workers.backup

# Delete old structure
rm -rf app/routers/proposals.py
rm -rf app/services/rfp_analyzer.py
rm -rf app/services/concept_analyzer.py
rm -rf app/services/concept_document_generator.py
rm -rf app/workers/analysis_worker.py
```

---

### FRONTEND MIGRATION - Step by Step

#### Step 1: Create New Structure (Day 12)

```bash
cd igad-app/frontend/src/

# Create tools directory
mkdir -p tools/proposal-writer/features/{rfp-analysis,concept-evaluation,document-generation}

# Create shared directory
mkdir -p shared/{components,hooks,lib,types}
```

#### Step 2: Migrate RFP Analysis Feature (Day 13-14)

**2.1. Create Feature Structure**

```bash
cd tools/proposal-writer/features/rfp-analysis/
mkdir components hooks
touch api.ts types.ts index.ts
```

**2.2. Move Components**

```tsx
// OLD: components/ProposalWriter/Step1Analysis.tsx
// NEW: tools/proposal-writer/features/rfp-analysis/components/AnalysisViewer.tsx

export function AnalysisViewer({ analysis }: Props) {
  // ... UI logic only, no business logic
}
```

**2.3. Extract Business Logic to Hooks**

```typescript
// NEW: tools/proposal-writer/features/rfp-analysis/hooks/useRfpAnalysis.ts

export function useRfpAnalysis(proposalId: string) {
  const [analysis, setAnalysis] = useState<RfpAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  
  const analyzeRfp = async (file: File) => {
    setLoading(true);
    const result = await rfpAnalysisApi.analyze(proposalId, file);
    setAnalysis(result);
    setLoading(false);
  };
  
  return { analysis, loading, analyzeRfp };
}
```

**2.4. Create API Module**

```typescript
// NEW: tools/proposal-writer/features/rfp-analysis/api.ts

import { apiClient } from '@/shared/lib/api-client';
import type { RfpAnalysisRequest, RfpAnalysisResult } from './types';

export const rfpAnalysisApi = {
  async analyze(proposalId: string, file: File): Promise<RfpAnalysisResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiClient.post(`/proposal-writer/rfp-analysis`, formData);
  },
  
  async getAnalysis(proposalId: string): Promise<RfpAnalysisResult> {
    return apiClient.get(`/proposal-writer/rfp-analysis/${proposalId}`);
  }
};
```

**2.5. Define Types**

```typescript
// NEW: tools/proposal-writer/features/rfp-analysis/types.ts

export interface RfpAnalysis {
  donor_info: {
    name: string;
    type: string;
  };
  evaluation_criteria: Array<{
    criterion: string;
    weight: number;
  }>;
  // ...
}

export interface RfpAnalysisRequest {
  proposal_id: string;
  file: File;
}
```

**2.6. Create Feature Index**

```typescript
// NEW: tools/proposal-writer/features/rfp-analysis/index.ts

export { AnalysisViewer } from './components/AnalysisViewer';
export { useRfpAnalysis } from './hooks/useRfpAnalysis';
export { rfpAnalysisApi } from './api';
export type * from './types';
```

**2.7. Update Page to Use Feature**

```tsx
// pages/proposal-writer.tsx

import { AnalysisViewer, useRfpAnalysis } from '@/tools/proposal-writer/features/rfp-analysis';

export default function ProposalWriterPage() {
  const { analysis, loading, analyzeRfp } = useRfpAnalysis(proposalId);
  
  return (
    <div>
      {currentStep === 1 && (
        <AnalysisViewer analysis={analysis} loading={loading} />
      )}
    </div>
  );
}
```

#### Step 3: Migrate Other Features (Day 15-18)

**Repeat for:**
- Concept Evaluation
- Document Generation
- Proposal Draft

#### Step 4: Create Shared Infrastructure (Day 19-20)

**4.1. Extract Shared Components**

```tsx
// NEW: shared/components/Button/Button.tsx

export function Button({ children, variant = 'primary', ...props }: Props) {
  return <button className={styles[variant]} {...props}>{children}</button>;
}
```

**4.2. Extract Shared Hooks**

```typescript
// NEW: shared/hooks/useApi.ts

export function useApi<T>(endpoint: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // ... generic API logic
  
  return { data, loading, error, refetch };
}
```

**4.3. Create API Client**

```typescript
// NEW: shared/lib/api-client.ts

class ApiClient {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL;
  
  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`);
    if (!response.ok) throw new Error('API Error');
    return response.json();
  }
  
  async post<T>(path: string, data: any): Promise<T> {
    // ... implementation
  }
}

export const apiClient = new ApiClient();
```

#### Step 5: Update Import Paths (Day 21)

```typescript
// OLD
import { Button } from '@/components/common/Button';

// NEW
import { Button } from '@/shared/components/Button';
```

**Use automated script:**

```bash
# scripts/update-frontend-imports.ts
```

#### Step 6: Delete Old Files (Day 22)

```bash
# Backup
cp -r src/components src/components.backup

# Delete
rm -rf src/components/ProposalWriter
```

---

## 🧪 TESTING STRATEGY

### Unit Tests

```python
# app/tools/proposal_writer/rfp_analysis/tests/test_service.py

def test_analyze_rfp():
    service = RfpAnalysisService(mock_ai, mock_storage)
    result = await service.analyze_rfp(proposal_id, file_data)
    assert result.donor_info is not None
```

### Integration Tests

```python
# app/tools/proposal_writer/tests/test_integration.py

def test_full_proposal_workflow():
    # Test complete RFP → Concept → Document flow
    pass
```

### E2E Tests

```typescript
// e2e/proposal-writer.spec.ts

test('complete proposal creation flow', async ({ page }) => {
  // Navigate to proposal writer
  await page.goto('/proposal-writer');
  
  // Upload RFP
  await page.setInputFiles('input[type=file]', 'test-rfp.pdf');
  
  // Wait for analysis
  await page.waitForSelector('[data-testid="rfp-analysis-result"]');
  
  // Continue through steps
  // ...
});
```

---

## 🔄 ROLLBACK PLAN

### If Migration Fails

1. **Keep Old Code Until Deployment**
   - Don't delete old files until new code is tested in production
   - Keep backups of all deleted files

2. **Feature Flags**
   ```python
   # Use feature flags to switch between old/new code
   if FEATURE_FLAGS.use_new_architecture:
       from app.tools.proposal_writer import router
   else:
       from app.routers import proposals as router
   ```

3. **Git Strategy**
   - Each phase is a separate branch
   - Can revert to previous branch if needed
   - Use tags for each milestone

4. **Database Compatibility**
   - New structure uses same database schema
   - No database migrations needed
   - Can roll back without data loss

---

## 📊 SUCCESS METRICS

### Code Quality Metrics

- ✅ **Reduced file size:** `proposals.py` from 1200 → 200 lines
- ✅ **Improved cohesion:** Each file has single responsibility
- ✅ **Reduced coupling:** Features don't depend on each other
- ✅ **Test coverage:** >80% coverage on business logic

### Developer Experience Metrics

- ✅ **Onboarding time:** New developer understands structure in <1 hour
- ✅ **Feature location:** Find code for a feature in <30 seconds
- ✅ **Change isolation:** Modify one feature without affecting others
- ✅ **Code reuse:** Share logic across tools easily

### Business Metrics

- ✅ **Deployment frequency:** Can deploy individual tools
- ✅ **Time to market:** Add new tools faster
- ✅ **Bug reduction:** Fewer cross-feature bugs
- ✅ **Scalability:** Easy to add Tools 2-5

---

## 📝 NEXT STEPS

### Immediate (This Week)

1. [ ] Review and approve this migration plan
2. [ ] Create Phase 1 tasks in project management tool
3. [ ] Set up new folder structure in development branch
4. [ ] Create migration checklist

### Short-term (Next 2 Weeks)

1. [ ] Execute Phase 1 & 2 (Backend Migration)
2. [ ] Daily progress reviews
3. [ ] Adjust plan based on discoveries

### Long-term (Next 4-6 Weeks)

1. [ ] Complete all phases
2. [ ] Deploy to production
3. [ ] Document lessons learned
4. [ ] Use new structure for Newsletter Generator

---

## 📚 REFERENCES

- [Screaming Architecture - Uncle Bob](https://blog.cleancoder.com/uncle-bob/2011/09/30/Screaming-Architecture.html)
- [Domain-Driven Design - Eric Evans](https://www.domainlanguage.com/ddd/)
- [Feature-Sliced Design](https://feature-sliced.design/)

---

**Document Owner:** Development Team  
**Last Updated:** 2025-01-24  
**Next Review:** After Phase 1 completion
