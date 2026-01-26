# 🏛️ MULTI-TOOL SCREAMING ARCHITECTURE - Implementation Guide

**Fecha:** 2025-11-24  
**Proyecto:** IGAD Alliance Platform  
**Objetivo:** Architecture guide for multi-tool system with feature-based organization

---

## 🎯 SYSTEM OVERVIEW

### Platform Structure

This is a **multi-tool productivity platform** with:

**5 Core Tools:**
1. 📝 **Proposal Writer** (4-step workflow) - *Currently in development*
2. 📰 **Newsletter Generator** - *Future*
3. 📊 **Report Generator** - *Future*
4. 📋 **Policy Analyzer** - *Future*
5. 🌾 **Agribusiness Hub** - *Future*

**Admin Module:**
- ⚙️ Settings Management
- 🎨 Prompts Manager
- 🔐 Authentication & User Management

---

## 🏗️ ARCHITECTURAL PRINCIPLES

### 1. Tools are Top-Level
Each tool represents a distinct product/capability that users can access.

### 2. Features are Vertical Slices
Each feature within a tool contains everything needed for that capability:
- API layer (HTTP routes)
- Domain logic (business rules)
- Infrastructure (DB, AI, external services)

### 3. Tools → Features → Layers
```
Tool (Product)
  └─ Feature (Capability)
      ├─ API (HTTP interface)
      ├─ Domain (Business logic)
      └─ Infrastructure (External integrations)
```

### 4. Minimize Shared Code
- Each tool has its own `shared/` for tool-specific common code
- Global `shared/` only for infrastructure (DB clients, AWS utils)
- **Never share business logic** between tools

---

## 📁 BACKEND ARCHITECTURE

### Complete Structure

```
igad-app/backend/app/
│
├── tools/                                # 🎯 TOOLS (Main products)
│   │
│   ├── proposal_writer/                  # 📝 TOOL 1: Proposal Writer
│   │   │
│   │   ├── features/                     #    Business capabilities
│   │   │   │
│   │   │   ├── proposals/                #    ✓ Manage proposal lifecycle
│   │   │   │   ├── __init__.py
│   │   │   │   ├── domain/
│   │   │   │   │   ├── proposal.py       #      Proposal entity
│   │   │   │   │   ├── proposal_status.py
│   │   │   │   │   └── exceptions.py
│   │   │   │   ├── use_cases/
│   │   │   │   │   ├── create_proposal.py
│   │   │   │   │   ├── get_proposal.py
│   │   │   │   │   ├── update_proposal.py
│   │   │   │   │   └── delete_proposal.py
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── http/
│   │   │   │   │   │   ├── routes.py     #      POST/GET/PUT /proposals
│   │   │   │   │   │   └── schemas.py
│   │   │   │   │   └── persistence/
│   │   │   │   │       └── dynamodb_repository.py
│   │   │   │   └── tests/
│   │   │   │
│   │   │   ├── rfp_analysis/             #    ✓ Analyze RFP documents
│   │   │   │   ├── __init__.py
│   │   │   │   ├── domain/
│   │   │   │   │   ├── rfp_document.py
│   │   │   │   │   ├── analysis_result.py
│   │   │   │   │   └── extraction_criteria.py
│   │   │   │   ├── use_cases/
│   │   │   │   │   ├── analyze_rfp.py
│   │   │   │   │   ├── extract_requirements.py
│   │   │   │   │   └── validate_rfp.py
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── http/
│   │   │   │   │   │   └── routes.py     #      POST /rfp-analysis
│   │   │   │   │   ├── ai/
│   │   │   │   │   │   ├── claude_analyzer.py
│   │   │   │   │   │   └── analyzer_interface.py
│   │   │   │   │   └── persistence/
│   │   │   │   │       └── dynamodb_repository.py
│   │   │   │   └── tests/
│   │   │   │
│   │   │   ├── concept_evaluation/       #    ✓ Evaluate concept fit
│   │   │   │   ├── __init__.py
│   │   │   │   ├── domain/
│   │   │   │   │   ├── concept.py
│   │   │   │   │   ├── evaluation_result.py
│   │   │   │   │   ├── fit_assessment.py
│   │   │   │   │   └── section_suggestion.py
│   │   │   │   ├── use_cases/
│   │   │   │   │   ├── evaluate_concept.py
│   │   │   │   │   ├── assess_alignment.py
│   │   │   │   │   └── update_evaluation.py
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── http/
│   │   │   │   │   │   └── routes.py     #      POST /concept-analysis
│   │   │   │   │   ├── ai/
│   │   │   │   │   │   └── claude_evaluator.py
│   │   │   │   │   └── persistence/
│   │   │   │   │       └── dynamodb_repository.py
│   │   │   │   └── tests/
│   │   │   │
│   │   │   ├── document_generation/      #    ✓ Generate proposal documents
│   │   │   │   ├── __init__.py
│   │   │   │   ├── domain/
│   │   │   │   │   ├── outline.py
│   │   │   │   │   ├── section.py
│   │   │   │   │   ├── document.py
│   │   │   │   │   └── generation_config.py
│   │   │   │   ├── use_cases/
│   │   │   │   │   ├── generate_outline.py
│   │   │   │   │   ├── filter_sections.py
│   │   │   │   │   ├── generate_document.py
│   │   │   │   │   └── render_html.py
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── http/
│   │   │   │   │   │   └── routes.py     #      POST /concept-document
│   │   │   │   │   ├── ai/
│   │   │   │   │   │   └── claude_generator.py
│   │   │   │   │   ├── persistence/
│   │   │   │   │   │   └── dynamodb_repository.py
│   │   │   │   │   └── rendering/
│   │   │   │   │       ├── html_renderer.py
│   │   │   │   │       ├── pdf_renderer.py
│   │   │   │   │       └── docx_renderer.py
│   │   │   │   └── tests/
│   │   │   │
│   │   │   └── workflow/                 #    ✓ Orchestrate 4-step workflow
│   │   │       ├── __init__.py
│   │   │       ├── domain/
│   │   │       │   ├── workflow_state.py
│   │   │       │   ├── step_validator.py
│   │   │       │   └── step_transition.py
│   │   │       ├── use_cases/
│   │   │       │   ├── orchestrate_workflow.py
│   │   │       │   └── validate_step_completion.py
│   │   │       └── adapters/
│   │   │           └── http/
│   │   │               └── routes.py     #      POST /workflow/execute
│   │   │
│   │   └── shared/                       #    Shared within Proposal Writer ONLY
│   │       ├── models.py                 #      ProposalStatus, Step enum
│   │       ├── constants.py              #      MAX_FILE_SIZE, etc.
│   │       └── exceptions.py
│   │
│   ├── newsletter_generator/             # 📰 TOOL 2: Newsletter Generator
│   │   ├── features/
│   │   │   ├── content_creation/
│   │   │   │   ├── domain/
│   │   │   │   ├── use_cases/
│   │   │   │   └── adapters/
│   │   │   ├── template_management/
│   │   │   └── distribution/
│   │   └── shared/
│   │
│   ├── report_generator/                 # 📊 TOOL 3: Report Generator
│   │   ├── features/
│   │   │   ├── data_analysis/
│   │   │   ├── visualization/
│   │   │   └── export/
│   │   └── shared/
│   │
│   ├── policy_analyzer/                  # 📋 TOOL 4: Policy Analyzer
│   │   ├── features/
│   │   │   ├── document_processing/
│   │   │   ├── insights_generation/
│   │   │   └── comparison/
│   │   └── shared/
│   │
│   └── agribusiness_hub/                 # 🌾 TOOL 5: Agribusiness Hub
│       ├── features/
│       │   ├── market_intelligence/
│       │   ├── network_management/
│       │   └── opportunity_matching/
│       └── shared/
│
├── admin/                                # ⚙️ ADMIN MODULE
│   ├── features/
│   │   │
│   │   ├── settings/                     #    System settings
│   │   │   ├── domain/
│   │   │   │   ├── setting.py
│   │   │   │   └── setting_category.py
│   │   │   ├── use_cases/
│   │   │   │   ├── get_settings.py
│   │   │   │   └── update_setting.py
│   │   │   ├── adapters/
│   │   │   │   ├── http/
│   │   │   │   │   └── routes.py         #      GET/PUT /admin/settings
│   │   │   │   └── persistence/
│   │   │   │       └── dynamodb_repository.py
│   │   │   └── tests/
│   │   │
│   │   └── prompts_manager/              #    AI prompts management
│   │       ├── domain/
│   │       │   ├── prompt.py
│   │       │   ├── prompt_version.py
│   │       │   └── prompt_category.py
│   │       ├── use_cases/
│   │       │   ├── get_prompts.py
│   │       │   ├── update_prompt.py
│   │       │   └── version_prompt.py
│   │       ├── adapters/
│   │       │   ├── http/
│   │       │   │   └── routes.py         #      GET/PUT /admin/prompts
│   │       │   └── persistence/
│   │       │       └── dynamodb_repository.py
│   │       └── tests/
│   │
│   └── shared/
│       ├── permissions.py
│       └── audit_log.py
│
├── auth/                                 # 🔐 AUTHENTICATION
│   ├── domain/
│   │   ├── user.py
│   │   ├── session.py
│   │   └── role.py
│   ├── use_cases/
│   │   ├── login.py
│   │   ├── logout.py
│   │   ├── refresh_token.py
│   │   └── validate_session.py
│   ├── adapters/
│   │   ├── http/
│   │   │   └── routes.py                 #      POST /auth/login, /logout
│   │   └── cognito/
│   │       └── cognito_client.py
│   └── tests/
│
├── shared/                               # 🌍 GLOBAL SHARED (Infrastructure ONLY)
│   │
│   ├── infrastructure/                   #    External service clients
│   │   ├── dynamodb.py                   #      DynamoDB client
│   │   ├── s3.py                         #      S3 client
│   │   ├── anthropic_client.py           #      Claude API
│   │   ├── sqs.py                        #      SQS client
│   │   └── aws_utils.py
│   │
│   ├── middleware/                       #    Cross-cutting concerns
│   │   ├── auth.py
│   │   ├── error_handler.py
│   │   ├── logging.py
│   │   ├── cors.py
│   │   └── rate_limiting.py
│   │
│   └── utils/                            #    Pure utilities (NO business logic)
│       ├── validation.py
│       ├── formatting.py
│       ├── date_utils.py
│       └── text_processing.py
│
└── main.py                               # FastAPI app initialization
```

---

## 📱 FRONTEND ARCHITECTURE

### Complete Structure

```
igad-app/frontend/src/
│
├── tools/                                # 🎯 TOOLS (Main products)
│   │
│   ├── proposal-writer/                  # 📝 TOOL 1: Proposal Writer
│   │   │
│   │   ├── features/                     #    Business capabilities
│   │   │   │
│   │   │   ├── proposals/                #    ✓ Manage proposals
│   │   │   │   ├── components/
│   │   │   │   │   ├── ProposalList.tsx
│   │   │   │   │   ├── ProposalCard.tsx
│   │   │   │   │   └── ProposalFilters.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useProposals.ts
│   │   │   │   │   └── useProposalActions.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── proposalApi.ts
│   │   │   │   ├── types/
│   │   │   │   │   └── proposal.ts
│   │   │   │   └── pages/
│   │   │   │       ├── ProposalsPage.tsx
│   │   │   │       └── ProposalDetailPage.tsx
│   │   │   │
│   │   │   ├── rfp-analysis/             #    ✓ Analyze RFPs (Step 1)
│   │   │   │   ├── components/
│   │   │   │   │   ├── RfpUpload.tsx
│   │   │   │   │   ├── ConceptInput.tsx
│   │   │   │   │   ├── AnalysisProgress.tsx
│   │   │   │   │   └── AnalysisResults.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useRfpAnalysis.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── rfpAnalysisApi.ts
│   │   │   │   └── types/
│   │   │   │       └── rfpAnalysis.ts
│   │   │   │
│   │   │   ├── concept-evaluation/       #    ✓ Evaluate concepts (Step 2)
│   │   │   │   ├── components/
│   │   │   │   │   ├── ConceptOverview.tsx
│   │   │   │   │   ├── SectionSelector.tsx
│   │   │   │   │   ├── SectionCard.tsx
│   │   │   │   │   └── CommentEditor.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useConceptEvaluation.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── conceptEvaluationApi.ts
│   │   │   │   └── types/
│   │   │   │       └── conceptEvaluation.ts
│   │   │   │
│   │   │   ├── document-generation/      #    ✓ Generate documents (Step 3)
│   │   │   │   ├── components/
│   │   │   │   │   ├── OutlineView.tsx
│   │   │   │   │   ├── SectionEditor.tsx
│   │   │   │   │   ├── EditSectionsModal.tsx
│   │   │   │   │   └── DocumentPreview.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useDocumentGeneration.ts
│   │   │   │   │   └── useDocumentDownload.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── documentGenerationApi.ts
│   │   │   │   └── types/
│   │   │   │       └── conceptDocument.ts
│   │   │   │
│   │   │   └── workflow/                 #    ✓ Workflow orchestration
│   │   │       ├── components/
│   │   │       │   ├── StepIndicator.tsx
│   │   │       │   ├── StepNavigation.tsx
│   │   │       │   └── ProgressTracker.tsx
│   │   │       ├── hooks/
│   │   │       │   ├── useWorkflow.ts
│   │   │       │   └── useStepValidation.ts
│   │   │       ├── pages/
│   │   │       │   ├── ProposalWriterPage.tsx  # Main page
│   │   │       │   ├── Step1Page.tsx
│   │   │       │   ├── Step2Page.tsx
│   │   │       │   ├── Step3Page.tsx
│   │   │       │   └── Step4Page.tsx
│   │   │       └── types/
│   │   │           └── workflow.ts
│   │   │
│   │   └── shared/                       #    Shared within Proposal Writer ONLY
│   │       ├── components/
│   │       │   ├── LoadingSpinner.tsx
│   │       │   └── ErrorBoundary.tsx
│   │       ├── hooks/
│   │       │   └── useProposalContext.ts
│   │       ├── types/
│   │       │   └── common.ts
│   │       └── constants.ts
│   │
│   ├── newsletter-generator/             # 📰 TOOL 2
│   │   ├── features/
│   │   └── shared/
│   │
│   ├── report-generator/                 # 📊 TOOL 3
│   │   ├── features/
│   │   └── shared/
│   │
│   ├── policy-analyzer/                  # 📋 TOOL 4
│   │   ├── features/
│   │   └── shared/
│   │
│   └── agribusiness-hub/                 # 🌾 TOOL 5
│       ├── features/
│       └── shared/
│
├── admin/                                # ⚙️ ADMIN MODULE
│   ├── features/
│   │   ├── settings/
│   │   │   ├── components/
│   │   │   │   ├── SettingsPage.tsx
│   │   │   │   └── SettingForm.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useSettings.ts
│   │   │   └── services/
│   │   │       └── settingsApi.ts
│   │   │
│   │   └── prompts-manager/
│   │       ├── components/
│   │       │   ├── PromptsPage.tsx
│   │       │   ├── PromptEditor.tsx
│   │       │   └── PromptHistory.tsx
│   │       ├── hooks/
│   │       │   └── usePrompts.ts
│   │       └── services/
│   │           └── promptsApi.ts
│   │
│   └── shared/
│       └── components/
│           └── AdminLayout.tsx
│
├── auth/                                 # 🔐 AUTHENTICATION
│   ├── components/
│   │   ├── LoginPage.tsx
│   │   ├── LoginForm.tsx
│   │   └── ProtectedRoute.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useSession.ts
│   ├── services/
│   │   └── authApi.ts
│   └── types/
│       └── auth.ts
│
├── shared/                               # 🌍 GLOBAL SHARED
│   ├── components/                       #    Only UI components
│   │   ├── Layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Card.tsx
│   │   └── feedback/
│   │       ├── Toast.tsx
│   │       └── LoadingBar.tsx
│   │
│   ├── hooks/                            #    Generic hooks
│   │   ├── useApi.ts
│   │   ├── useLocalStorage.ts
│   │   └── useDebounce.ts
│   │
│   ├── services/                         #    HTTP client, error handling
│   │   ├── apiClient.ts
│   │   ├── errorHandler.ts
│   │   └── wsClient.ts
│   │
│   ├── utils/                            #    Pure utilities
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   └── dateUtils.ts
│   │
│   └── types/                            #    Global types ONLY
│       ├── api.ts
│       └── common.ts
│
├── routes/                               # App routing
│   └── AppRoutes.tsx
│
└── App.tsx                               # Main app component
```

---

## 🎯 ROUTING STRUCTURE

### URL Pattern: `/tools/{tool}/{feature}`

```
/                                         → Dashboard (all tools)
/auth/login                               → Login page

# Proposal Writer
/tools/proposal-writer                    → Proposals list
/tools/proposal-writer/new                → New proposal (Step 1)
/tools/proposal-writer/:id/step-1         → Step 1: RFP Analysis
/tools/proposal-writer/:id/step-2         → Step 2: Concept Evaluation
/tools/proposal-writer/:id/step-3         → Step 3: Document Generation
/tools/proposal-writer/:id/step-4         → Step 4: Final Review

# Newsletter Generator
/tools/newsletter-generator               → Newsletter dashboard
/tools/newsletter-generator/new           → Create newsletter
/tools/newsletter-generator/:id           → Edit newsletter

# Report Generator
/tools/report-generator                   → Reports dashboard
/tools/report-generator/new               → Create report
/tools/report-generator/:id               → View/edit report

# Policy Analyzer
/tools/policy-analyzer                    → Policy analysis dashboard
/tools/policy-analyzer/new                → New analysis
/tools/policy-analyzer/:id                → View analysis

# Agribusiness Hub
/tools/agribusiness-hub                   → Hub dashboard
/tools/agribusiness-hub/market            → Market intelligence
/tools/agribusiness-hub/network           → Network management

# Admin
/admin/settings                           → System settings
/admin/prompts                            → Prompts manager
```

---

## 📦 KEY BENEFITS

### 1. **Clarity** - New developers immediately understand:
- What tools exist
- What each tool can do
- Where to find specific functionality

### 2. **Scalability** - Easy to add new tools or features:
- Copy folder structure
- Implement layers (domain → use_cases → adapters)
- Register routes

### 3. **Independence** - Each tool/feature can:
- Be developed independently
- Have dedicated team ownership
- Be tested in isolation
- Be deployed separately (future microservices)

### 4. **Maintainability** - Changes are localized:
- Bug in RFP analysis? → Only touch `tools/proposal_writer/features/rfp_analysis/`
- New feature in Newsletter? → Add to `tools/newsletter_generator/features/`

### 5. **Testability** - Clear boundaries:
- Unit tests per use case
- Integration tests per feature
- E2E tests per tool

---

## 🚀 NEXT STEPS

1. ✅ **Document current state** (this file)
2. 📋 Create detailed migration plan for Proposal Writer
3. 🔧 Build migration scripts
4. 🧪 Set up testing infrastructure
5. 🔄 Migrate Proposal Writer feature by feature
6. 📚 Document learnings for future tools

---

## 📖 RELATED DOCUMENTS

- `SCREAMING_ARCHITECTURE_MIGRATION_PLAN.md` - Detailed migration strategy
- `PROPOSAL_WRITER_REFACTOR.md` - Specific refactor plan
- `TESTING_STRATEGY.md` - Test approach for new architecture

---

**Last Updated:** 2025-11-24  
**Status:** 📝 Architecture defined, migration pending
