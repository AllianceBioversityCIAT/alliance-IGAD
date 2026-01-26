# Sprint 8: Admin Prompt Manager with CRUD + Section Linking

**Principle:** "La simplicidad es la máxima sofisticación."

## Sprint Goal

Deliver an **Admin Prompt Manager** section that enables administrators to:
- Manage prompts with full CRUD operations, versioning, and publish/unpublish workflows
- Link each prompt to specific sections of the Proposal Writer (Problem Statement, Objectives, Methodology, Budget, Theory of Change, etc.)
- Preview prompts using Bedrock without persistence
- Ensure runtime always fetches the latest published prompt per section

**Target Route:** `/admin/prompt-manager`
**Design Alignment:** Reuse existing design system colors, typography, and components

## Key Objectives

### 1. UI Components
- **Admin Navigation:** Add "Prompt Manager" to left navigation (admin-only)
- **List View:** Table with columns: Name, Section, Version, Status, Updated, Actions
- **Filters:** Section dropdown, Status (draft/published), Tags (chips), Text search
- **Editor Drawer:** Create/Edit form with all prompt fields
- **Preview Panel:** Test prompts with sample inputs using Bedrock

### 2. CRUD & Versioning
- **Draft → Publish Flow:** Version control with history tracking
- **Operations:** Create, Read, Update, Delete, Clone, Restore from version
- **Status Management:** Draft vs Published states with clear indicators

### 3. Section Linking
- **Required Field:** Each prompt must be linked to a specific section
- **Section Enum:** Problem Statement, Objectives, Methodology, Budget, Theory of Change, etc.
- **Future-Proof:** Optional subsection field for granular linking

### 4. Security & Access
- **Cognito Admin-Only:** JWT claims verification for admin group
- **Audit Logging:** Track all C/U/D/Publish operations
- **RBAC:** Fine-grained IAM permissions with least privilege

### 5. Simplicity Focus
- **Minimal Schema:** Essential fields only, avoid over-engineering
- **Reusable Components:** Leverage existing design system
- **Clear UX:** Intuitive workflows with proper feedback

## User Stories & Tasks

### A. Frontend Development (React + TypeScript)

#### A1. Admin Route & Navigation
- **Task:** Create `/admin/prompt-manager` route with admin guard
- **Components:**
  - `AdminPromptManagerPage.tsx` - Main container
  - `PromptManagerLayout.tsx` - Layout wrapper
  - Admin navigation item in sidebar
- **Security:** Verify admin role before rendering
- **Estimate:** 4 hours

#### A2. Prompt List View
- **Task:** Build responsive table with filtering and search
- **Components:**
  - `PromptListTable.tsx` - Main table component
  - `PromptFilters.tsx` - Filter controls
  - `PromptStatusBadge.tsx` - Status indicator
- **Features:**
  - Columns: Name, Section, Version, Status, Updated, Actions
  - Sorting by name, section, updated date
  - Pagination for large datasets
  - Bulk actions (future-proof)
- **Estimate:** 8 hours

#### A3. Create/Edit Drawer
- **Task:** Modal/drawer form for prompt management
- **Components:**
  - `PromptEditorDrawer.tsx` - Main form container
  - `PromptFormFields.tsx` - Form field components
  - `VersionHistory.tsx` - Version management
- **Fields:**
  - `name` (required, text input)
  - `section` (required, select from enum)
  - `tags[]` (optional, tag input)
  - `system_prompt` (required, textarea)
  - `user_prompt_template` (required, textarea with variables)
  - `few_shot[]` (optional, JSON editor)
  - `context.persona` (optional, text)
  - `context.tone` (optional, select)
  - `context.sources[]` (optional, array)
  - `constraints` (optional, textarea)
  - `guardrails` (optional, textarea)
- **Actions:** Save Draft, Publish, Delete, Clone as New Version
- **Estimate:** 12 hours

#### A4. Preview Panel
- **Task:** Test prompts with Bedrock integration
- **Components:**
  - `PromptPreview.tsx` - Preview container
  - `PreviewInputs.tsx` - Variable input form
  - `PreviewOutput.tsx` - Bedrock response display
- **Features:**
  - Variable substitution in templates
  - Real-time Bedrock API calls
  - Token usage estimation
  - Error handling and validation
- **Estimate:** 6 hours

#### A5. Design System Integration
- **Task:** Ensure visual consistency with existing app
- **Requirements:**
  - Use existing color tokens and typography
  - Consistent spacing and layout patterns
  - Dark/light mode support
  - Accessibility compliance (WCAG 2.1 AA)
- **Components:** Reuse existing buttons, inputs, modals, tables
- **Estimate:** 4 hours

#### A6. State Management & API Integration
- **Task:** Connect frontend to backend APIs
- **Implementation:**
  - React Query for data fetching and caching
  - Optimistic updates for better UX
  - Error handling with toast notifications
  - Form validation with clear error messages
- **Estimate:** 6 hours

#### A7. Testing
- **Task:** Comprehensive test coverage
- **Types:**
  - Component tests (Jest + React Testing Library)
  - Integration tests (create→publish→list flow)
  - E2E tests for critical paths
- **Coverage:** Minimum 80% for new components
- **Estimate:** 8 hours

### B. Backend Development (Python + AWS)

#### B1. API Endpoints
- **Task:** Create admin prompt management endpoints
- **Routes:** (Prefix: `/admin/prompts`)
  - `GET /list?section&status&tag&search` - List with filters
  - `GET /{prompt_id}?version=latest|{n}` - Get specific version
  - `POST /create` - Create new prompt (version 1, draft)
  - `PUT /{prompt_id}/update` - Update (new version or edit draft)
  - `POST /{prompt_id}/publish` - Publish version
  - `DELETE /{prompt_id}/{version}` - Delete version
  - `POST /preview` - Test prompt with Bedrock (no persistence)
- **Runtime Endpoint:**
  - `GET /prompts/section/{section}?published=true` - Get latest published
- **Estimate:** 10 hours

#### B2. Data Model (DynamoDB)
- **Task:** Design and implement prompt storage schema
- **Table: `prompts`**
  - **PK:** `prompt#{id}` | **SK:** `version#{n}`
  - **Attributes:**
    ```json
    {
      "name": "string",
      "section": "enum",
      "tags": ["string"],
      "status": "draft|published",
      "system_prompt": "string",
      "user_prompt_template": "string",
      "few_shot": [{"input": "string", "output": "string"}],
      "context": {
        "persona": "string",
        "tone": "string",
        "sources": ["string"],
        "constraints": "string",
        "guardrails": "string"
      },
      "created_by": "string",
      "updated_by": "string",
      "created_at": "ISO8601",
      "updated_at": "ISO8601"
    }
    ```
- **GSIs:**
  - `gsi_section_status`: PK=section, SK=status#updated_at
  - `gsi_tags`: PK=tag, SK=updated_at
- **Helper Items:**
  - `PK=prompt#{id}`, `SK=published#latest` → points to latest published version
- **Estimate:** 6 hours

#### B3. Business Logic Layer
- **Task:** Implement prompt management services
- **Services:**
  - `PromptService` - Core CRUD operations
  - `VersionService` - Version management
  - `PublishService` - Publish/unpublish workflow
  - `PreviewService` - Bedrock integration
- **Features:**
  - Automatic version incrementing
  - Publish state management
  - Data validation and sanitization
- **Estimate:** 8 hours

#### B4. Bedrock Integration
- **Task:** Preview functionality with AWS Bedrock
- **Implementation:**
  - Model configuration (Claude, temperature, max tokens)
  - Variable substitution in prompts
  - Guardrails application
  - Error handling and sanitization
  - Token usage tracking
- **Security:** No persistence of preview outputs
- **Estimate:** 6 hours

#### B5. Authentication & Authorization
- **Task:** Secure admin-only access
- **Implementation:**
  - Cognito JWT verification
  - Admin group claims validation
  - Fine-grained IAM policies
  - Audit logging for all operations
- **Table: `audit_logs`** (Optional)
  - PK: `log#{timestamp}`
  - Attributes: admin_id, action, prompt_id, version, section
- **Estimate:** 4 hours

#### B6. Caching & Performance
- **Task:** Optimize runtime prompt fetching
- **Implementation:**
  - Lambda memory caching (TTL 60-120s)
  - DynamoDB query optimization
  - Response compression
- **Monitoring:** CloudWatch metrics for cache hit/miss rates
- **Estimate:** 3 hours

#### B7. Testing & Validation
- **Task:** Backend test coverage
- **Types:**
  - Unit tests for services and handlers
  - Integration tests for DynamoDB operations
  - API endpoint tests
  - Bedrock integration tests (mocked)
- **Coverage:** Minimum 80% for new code
- **Estimate:** 6 hours

### C. Infrastructure & DevOps

#### C1. DynamoDB Tables
- **Task:** Deploy prompt storage infrastructure
- **Tables:**
  - `igad-prompts` (On-Demand billing)
  - `igad-audit-logs` (Optional, On-Demand)
- **Indexes:** GSIs for efficient querying
- **Backup:** Point-in-time recovery enabled
- **Estimate:** 2 hours

#### C2. API Gateway Routes
- **Task:** Configure admin and runtime endpoints
- **Security:**
  - Cognito authorizer for admin routes
  - Rate limiting and throttling
  - CORS configuration
- **Estimate:** 2 hours

#### C3. IAM Policies
- **Task:** Least privilege access control
- **Policies:**
  - Admin prompt management permissions
  - Bedrock model access
  - DynamoDB table operations
  - CloudWatch logging
- **Estimate:** 2 hours

#### C4. Monitoring & Observability
- **Task:** Comprehensive monitoring setup
- **Implementation:**
  - Structured JSON logging
  - CloudWatch metrics and alarms
  - Performance dashboards
  - Error rate monitoring
- **Estimate:** 3 hours

## Section Enum Definition

```typescript
enum ProposalSection {
  PROBLEM_STATEMENT = 'problem_statement',
  OBJECTIVES = 'objectives',
  METHODOLOGY = 'methodology',
  BUDGET = 'budget',
  THEORY_OF_CHANGE = 'theory_of_change',
  LITERATURE_REVIEW = 'literature_review',
  TIMELINE = 'timeline',
  RISK_ASSESSMENT = 'risk_assessment',
  SUSTAINABILITY = 'sustainability',
  MONITORING_EVALUATION = 'monitoring_evaluation',
  EXECUTIVE_SUMMARY = 'executive_summary',
  APPENDICES = 'appendices'
}
```

## API Specification

### Admin Endpoints

```yaml
/admin/prompts:
  get:
    parameters:
      - section: ProposalSection (optional)
      - status: draft|published (optional)
      - tag: string (optional)
      - search: string (optional)
      - limit: number (default: 20)
      - offset: number (default: 0)
    responses:
      200:
        schema:
          type: object
          properties:
            prompts: array
            total: number
            has_more: boolean

  post:
    requestBody:
      schema:
        type: object
        required: [name, section, system_prompt, user_prompt_template]
    responses:
      201:
        schema:
          type: object
          properties:
            prompt_id: string
            version: number

/admin/prompts/{prompt_id}:
  get:
    parameters:
      - version: latest|number (optional, default: latest)
    responses:
      200:
        schema: PromptVersion

  put:
    requestBody:
      schema: PromptUpdateRequest
    responses:
      200:
        schema: PromptVersion

  delete:
    parameters:
      - version: number (optional, deletes all if not specified)
    responses:
      204: No Content

/admin/prompts/{prompt_id}/publish:
  post:
    requestBody:
      schema:
        type: object
        properties:
          version: number
    responses:
      200:
        schema: PromptVersion

/admin/prompts/preview:
  post:
    requestBody:
      schema:
        type: object
        required: [system_prompt, user_prompt_template]
        properties:
          system_prompt: string
          user_prompt_template: string
          variables: object
          context: object
    responses:
      200:
        schema:
          type: object
          properties:
            output: string
            tokens_used: number
            processing_time: number
```

### Runtime Endpoint

```yaml
/prompts/section/{section}:
  get:
    parameters:
      - published: boolean (default: true)
    responses:
      200:
        schema: PromptVersion
      404:
        description: No published prompt found for section
```

## Deliverables & Definition of Done

### Frontend Deliverables
- [ ] `/admin/prompt-manager` page with complete UI
- [ ] Responsive table with filtering and search
- [ ] Create/Edit drawer with all required fields
- [ ] Preview panel with Bedrock integration
- [ ] Version management interface
- [ ] Design system compliance
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] Component test coverage ≥80%

### Backend Deliverables
- [ ] All admin API endpoints functional
- [ ] Runtime prompt fetching endpoint
- [ ] DynamoDB schema deployed
- [ ] Bedrock preview integration
- [ ] Authentication and authorization
- [ ] Audit logging implementation
- [ ] Unit test coverage ≥80%
- [ ] API documentation

### Infrastructure Deliverables
- [ ] DynamoDB tables with GSIs
- [ ] API Gateway routes configured
- [ ] IAM policies implemented
- [ ] CloudWatch monitoring setup
- [ ] Performance optimization

### Documentation Deliverables
- [ ] Admin user guide (`docs/admin/prompt-manager.md`)
- [ ] API documentation with examples
- [ ] Deployment instructions
- [ ] Troubleshooting guide

## Dependencies

### Prerequisites
- ✅ Existing infrastructure (Cognito, API Gateway, Lambda)
- ✅ Frontend design system and components
- ✅ Backend base architecture
- ✅ Bedrock model access configured
- ✅ Admin authentication system

### External Dependencies
- AWS Bedrock service availability
- Cognito admin group configuration
- DynamoDB table creation permissions

## Tools & AWS Services

### Frontend Stack
- **Framework:** React 18 + TypeScript
- **Styling:** Tailwind CSS with design tokens
- **State Management:** React Query + Zustand
- **Testing:** Jest + React Testing Library
- **Build:** Vite

### Backend Stack
- **Runtime:** Python 3.11 + Lambda
- **Framework:** FastAPI
- **Database:** DynamoDB (On-Demand)
- **AI:** Amazon Bedrock (Claude models)
- **Authentication:** AWS Cognito

### Infrastructure
- **API:** API Gateway (HTTP)
- **Storage:** DynamoDB + S3
- **Monitoring:** CloudWatch
- **IaC:** AWS CDK (TypeScript)

## Acceptance Criteria

### Functional Requirements
- [ ] Admin can create new prompts with all required fields
- [ ] Admin can edit existing prompts (creates new version)
- [ ] Admin can delete prompts and specific versions
- [ ] Admin can publish/unpublish prompt versions
- [ ] Admin can clone prompts as new versions
- [ ] Each prompt must be linked to a specific section (required field)
- [ ] Preview functionality works with real Bedrock responses
- [ ] Runtime fetches latest published prompt per section
- [ ] Version history is maintained and accessible

### Non-Functional Requirements
- [ ] UI matches existing design system colors and patterns
- [ ] Page loads within 2 seconds
- [ ] Preview responses within 10 seconds
- [ ] Mobile responsive design
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] Admin-only access enforced
- [ ] All operations logged for audit

### Security Requirements
- [ ] Cognito JWT validation for all admin endpoints
- [ ] Admin group membership verified
- [ ] Input validation and sanitization
- [ ] No sensitive data in logs
- [ ] Least privilege IAM policies

## Expected Output Locations

```
Frontend:
├── src/pages/admin/
│   ├── PromptManagerPage.tsx
│   └── components/
│       ├── PromptListTable.tsx
│       ├── PromptEditorDrawer.tsx
│       ├── PromptFilters.tsx
│       ├── PromptPreview.tsx
│       └── VersionHistory.tsx
├── src/services/
│   └── promptService.ts
└── src/types/
    └── prompt.ts

Backend:
├── src/handlers/admin/
│   ├── prompt_handler.py
│   └── preview_handler.py
├── src/services/
│   ├── prompt_service.py
│   ├── version_service.py
│   └── bedrock_service.py
└── src/models/
    └── prompt_model.py

Infrastructure:
├── infra/cdk/
│   ├── prompt-manager-stack.ts
│   └── dynamodb-tables.ts
└── infra/policies/
    └── prompt-manager-policies.json

Documentation:
├── docs/admin/
│   └── prompt-manager.md
└── docs/api/
    └── prompt-endpoints.md
```

## Risk Mitigation

### Technical Risks
- **Bedrock Rate Limits:** Implement exponential backoff and user feedback
- **DynamoDB Hot Partitions:** Use composite keys and distribute load
- **Large Prompt Storage:** Implement size limits and compression

### UX Risks
- **Complex Form:** Progressive disclosure and clear validation
- **Performance:** Implement pagination and lazy loading
- **Mobile Experience:** Responsive design with touch-friendly controls

### Security Risks
- **Admin Access:** Multi-factor authentication and session management
- **Data Exposure:** Input sanitization and output filtering
- **Audit Trail:** Comprehensive logging without sensitive data

## Success Metrics

### Functional Metrics
- [ ] 100% of admin prompt management operations working
- [ ] 100% of section linking functionality operational
- [ ] Preview success rate >95%
- [ ] Runtime prompt fetching <500ms average

### Quality Metrics
- [ ] Test coverage ≥80% (frontend and backend)
- [ ] Zero critical security vulnerabilities
- [ ] Accessibility score ≥95% (Lighthouse)
- [ ] Performance score ≥90% (Lighthouse)

### User Experience Metrics
- [ ] Admin task completion rate >90%
- [ ] Average time to create prompt <5 minutes
- [ ] User satisfaction score ≥4.5/5
- [ ] Zero data loss incidents

## Timeline Estimate

**Total Effort:** 88 hours (11 days for 1 developer)

### Week 1 (40 hours)
- Frontend foundation and list view (16 hours)
- Backend API endpoints and data model (16 hours)
- Infrastructure setup (8 hours)

### Week 2 (40 hours)
- Editor drawer and preview panel (18 hours)
- Bedrock integration and security (10 hours)
- Testing and documentation (12 hours)

### Week 3 (8 hours)
- Integration testing and bug fixes (4 hours)
- Performance optimization (2 hours)
- Final documentation and deployment (2 hours)

---

**Sprint 8 Success:** A fully functional Admin Prompt Manager with CRUD operations, section linking, versioning, and Bedrock preview capabilities, seamlessly integrated with the existing design system and security model.


**REMBER** The logic that we are applying in the other components, the CSS is separated to the tsx.
Please use : awslabsfrontend-mcp-server, awslabscdk-mcp-server

Your point of view here is very important, the section prompt manager debe ser accedida desde el icono the nut in the navbar, in the list appear the Prmopt Manager option, tambien debe ser accedido desde el proposal witer boton Prompt Manger.

Toma esta imagen como referncia para hacer la interfaz grafica specs/mockups/prompt-manager/prompt-manager.png pero aplica la misma linea de colores, letra y estilos de las otras paginas.

Tu debes tener mucha experiencia haciendo este tipo de modulos por que todas las herramientas de AI los tienen entonces tu opinion es muy importante aqui.

Es importante que en el prompt manager podamos indicar la seccion de la aplicacion donde es necesario este prompt, ejemplo /proposal-writer/step-1 

Manten la misma logica de programacion y revisa el contexto antes de hacer cambios.