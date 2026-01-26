# Newsletter Generator - Technical Specifications (CRAS)

**Version:** 1.0  
**Last Updated:** 2026-01-26  
**Status:** Draft  
**Figma Reference:** <https://www.figma.com/design/mUmeInkEfKNUMpWKYcOv11/IGAD?node-id=955-4044&m=dev>

---

## CONTEXT

### Project Background

El proyecto IGAD Platform cuenta con una herramienta **Proposal Writer** completamente funcional que implementa patrones reutilizables:

- Wizard multi-step con navegación controlada
- Secondary Navbar con status badge y código único
- Sidebar con progress bar y step indicators
- Procesamiento asíncrono con Lambda workers
- Persistencia en DynamoDB con localStorage fallback
- Integración con Amazon Bedrock (Claude) para generación de contenido

El **Newsletter Generator** reutilizará estos patrones para crear una herramienta de generación de newsletters automatizada.

### Technical Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | FastAPI (Python) + AWS Lambda |
| Database | DynamoDB (single-table design) |
| AI | Amazon Bedrock (Claude 3.7 Sonnet) |
| Storage | S3 para archivos |
| Styling | CSS Modules |

### Existing Patterns to Reuse (from Proposal Writer)

| Component | Location | Purpose |
|-----------|----------|---------|
| `ProposalLayout.tsx` | `frontend/src/tools/proposal-writer/components/` | Layout wrapper con sidebar y navigation |
| `ProposalSecondaryNavbar.tsx` | `frontend/src/tools/proposal-writer/components/` | Navbar secundario con breadcrumb y status |
| `ProposalSidebar.tsx` | `frontend/src/tools/proposal-writer/components/` | Sidebar con steps y progress indicators |
| `stepConfig.ts` | `frontend/src/tools/proposal-writer/pages/` | Configuración de steps |
| `proposalService.ts` | `frontend/src/tools/proposal-writer/services/` | Service layer para API calls |
| `useProposal.ts` | `frontend/src/tools/proposal-writer/hooks/` | Custom hooks para state management |
| `worker.py` | `backend/app/tools/proposal_writer/workflow/` | Lambda worker para procesamiento asíncrono |
| `routes.py` | `backend/app/tools/proposal_writer/` | API endpoints pattern |

### 6-Step Wizard Structure

| Step | Title | Purpose |
|------|-------|---------|
| 1 | Configuration | Configurar audiencia, tono, formato, frecuencia, área geográfica |
| 2 | Content Planning | Seleccionar tipos de información y proveer contexto adicional |
| 3 | Outline Review | Revisar y modificar el outline generado por AI |
| 4 | Drafting | Generar el draft completo del newsletter |
| 5 | Preview | Previsualizar el newsletter en diferentes formatos |
| 6 | Automation | Configurar automatización y programación de envío |

---

## ROLE

### Primary Users

| User Type | Description | Primary Goals |
|-----------|-------------|---------------|
| Research Communications Officers | Generan newsletters periódicos sobre avances en agricultura e investigación para la región IGAD | Eficiencia en creación, consistencia de marca |
| Knowledge Management Specialists | Consolidan información de múltiples fuentes en formatos digestibles | Agregación de contenido, calidad editorial |
| Project Managers | Comunican actualizaciones de proyectos a stakeholders | Comunicación clara, reportes regulares |

### User Goals

1. **Configurar una sola vez** - Definir audiencia, tono, formato y frecuencia como plantilla reutilizable
2. **Automatizar selección de contenido** - AI sugiere topics relevantes basados en fuentes configuradas
3. **Generar contenido de alta calidad** - Drafts profesionales con asistencia de AI
4. **Revisar antes de publicar** - Edición completa antes de distribución
5. **Mantener consistencia** - Tono y branding coherentes en cada edición

### AI Agent Role

El sistema actúa como un **Newsletter Editor Assistant** que:

- Analiza configuración de audiencia y tono para ajustar estilo
- Busca y agrega información relevante de fuentes configuradas
- Genera drafts de secciones respetando el formato definido
- Sugiere mejoras editoriales y de estructura
- Mantiene coherencia con newsletters anteriores (si se proporcionan ejemplos)

---

## SPECS

### Step 1: Newsletter Configuration

#### UI Components

| Component | Type | Dimensions | Description |
|-----------|------|------------|-------------|
| Welcome Card | Card (readonly) | 896px x 96px | Instrucciones para el usuario |
| Audience Checkboxes | Checkbox Group | 896px x 386px | Selección múltiple de audiencias |
| Tone Sliders | Dual RangeSlider | 896px x 229px | Professional<->Casual, Technical<->Approachable |
| Format Dropdown | Select | 846px x 36px | Email, PDF, Web Article, etc. |
| Length Slider | RangeSlider | 896px x 190px | Short <-> Mixed <-> Long |
| Frequency Slider | RangeSlider | 896px x 190px | Daily -> Weekly -> Monthly -> Quarterly |
| Geographic Focus | TextInput | 846px x 36px | Área geográfica específica |
| Example Upload | FileUpload (optional) | 896px x 254px | Para aprender estilo existente |

#### Audience Options

```
[ ] Myself
[ ] Researchers
[ ] Development partners
[ ] Policy makers
[ ] Ag-tech industry
[ ] Field staff
[ ] Farmers
```

#### Backend Data Model

```python
class NewsletterConfig(BaseModel):
    """Step 1 Configuration Data"""
    newsletter_id: str              # NL-YYYYMMDD-XXXX
    user_id: str
    target_audience: List[str]      # ["researchers", "policy_makers", ...]
    tone_professional: int          # 0-100 (professional to casual)
    tone_technical: int             # 0-100 (technical to approachable)
    format_type: str                # "email" | "pdf" | "web" | "social"
    length_preference: str          # "short" | "mixed" | "long"
    frequency: str                  # "daily" | "weekly" | "monthly" | "quarterly"
    geographic_focus: str           # Free text
    example_newsletters: List[str]  # S3 keys
    status: str                     # "draft" | "processing" | "completed"
    created_at: str
    updated_at: str
```

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/newsletters` | Create new newsletter |
| GET | `/api/newsletters/{id}` | Get newsletter details |
| PUT | `/api/newsletters/{id}` | Update configuration |
| POST | `/api/newsletters/{id}/upload-example` | Upload example files |
| DELETE | `/api/newsletters/{id}` | Delete newsletter |

---

### Step 2: Content Planning (Key Topics & Content)

#### UI Components

| Component | Type | Dimensions | Description |
|-----------|------|------------|-------------|
| Information Types Card | Toggle List | 896px x 1420px | Categorías de contenido con toggles |
| Custom Type Input | TextInput + Button | 728px + 74px | Agregar tipos personalizados |
| Context Sections | Expandable Cards | Variable | Contexto adicional por tipo seleccionado |
| Structure Preview | Preview Card | 896px x 422px | Vista previa del newsletter structure |

#### Information Types

| Type | Category | Badge Color |
|------|----------|-------------|
| Breaking News & Updates | News | Blue (#dbeafe) |
| Policy Updates | News | Blue (#dbeafe) |
| Research Findings | Insights | Purple (#f3e8ff) |
| Technology & Innovation Spotlight | Insights | Purple (#f3e8ff) |
| Climate-Smart Agriculture | Insights | Purple (#f3e8ff) |
| Market Access & Trade | Insights | Purple (#f3e8ff) |
| Funding Opportunities | Opportunities | Yellow (#fef3c7) |
| Events & Conferences | Opportunities | Yellow (#fef3c7) |
| Project Updates & Success Stories | Insights | Purple (#f3e8ff) |
| Publications & Resources | Resources | Green (#d1fae5) |
| Food Security Updates | News | Blue (#dbeafe) |
| Livestock & Animal Health | Insights | Purple (#f3e8ff) |

#### Backend Data Model

```python
class NewsletterTopics(BaseModel):
    """Step 2 Topics Selection Data"""
    newsletter_id: str
    selected_types: List[str]           # Information types enabled
    custom_types: List[str]             # User-added custom types
    type_contexts: Dict[str, Dict]      # {type_name: {context, links, documents}}
    structure_preview: List[Dict]       # Generated preview structure
    topics_analysis_status: str         # "pending" | "processing" | "completed"
```

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/newsletters/{id}/topics` | Save selected topics |
| POST | `/api/newsletters/{id}/upload-context/{type}` | Upload context document |
| POST | `/api/newsletters/{id}/generate-preview` | Generate structure preview |
| GET | `/api/newsletters/{id}/preview-status` | Poll for preview completion |

---

### Step 3: Content Outline Review

#### UI Components

| Component | Type | Dimensions | Description |
|-----------|------|------------|-------------|
| Review Instructions | Card | 896px x 118px | Explicación del proceso de revisión |
| Content Outline | Accordion Card | 896px x 769px | Secciones expandibles con items |
| Add Custom Item | Form Card | 896px x 409px | Agregar items personalizados |
| Ready Status | Status Card | 896px x 190px | Indicadores de completitud |

#### Outline Structure

```
1. Introduction (1 item)
2. Main Content (variable items based on selected types)
3. Updates & Announcements (1 item)
4. Conclusion (1 item)
```

#### Backend Data Model

```python
class NewsletterOutline(BaseModel):
    """Step 3 Outline Data"""
    newsletter_id: str
    sections: List[Dict]            # [{name, items: [{title, description, editable}]}]
    custom_items: List[Dict]        # User-added items
    outline_status: str             # "pending" | "processing" | "completed"
    generated_at: Optional[str]
    user_modifications: Dict        # Track user changes
```

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/newsletters/{id}/generate-outline` | Trigger outline generation |
| GET | `/api/newsletters/{id}/outline-status` | Poll for outline completion |
| PUT | `/api/newsletters/{id}/outline` | Save outline modifications |
| POST | `/api/newsletters/{id}/add-outline-item` | Add custom item to outline |
| DELETE | `/api/newsletters/{id}/outline-item/{item_id}` | Remove outline item |

---

### Step 4: Drafting (Review & Edit Draft)

#### UI Components

| Component | Type | Dimensions | Description |
|-----------|------|------------|-------------|
| Draft Editor | Rich Text Editor | 1504px width | Full-width editable newsletter |
| Section Navigator | Sidebar | Variable | Jump to section links |
| Formatting Toolbar | Toolbar | Full width | Bold, italic, links, lists, etc. |
| AI Suggestions | Inline Popover | Variable | Mejoras sugeridas inline |

#### Backend Data Model

```python
class NewsletterDraft(BaseModel):
    """Step 4 Draft Data"""
    newsletter_id: str
    generated_content: str          # Full markdown/HTML content
    sections: Dict[str, str]        # {section_name: content}
    draft_status: str               # "pending" | "processing" | "completed"
    ai_suggestions: List[Dict]      # [{section, suggestion, applied}]
    user_edits: Optional[str]       # User-modified content
    generated_at: Optional[str]
```

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/newsletters/{id}/generate-draft` | Trigger draft generation |
| GET | `/api/newsletters/{id}/draft-status` | Poll for draft completion |
| PUT | `/api/newsletters/{id}/draft` | Save draft edits |
| POST | `/api/newsletters/{id}/regenerate-section/{section}` | Regenerate specific section |

---

### Step 5: Preview

#### UI Components

| Component | Type | Description |
|-----------|------|-------------|
| Format Tabs | Tab Navigation | Email, PDF, Web preview modes |
| Preview Pane | Rendered View | Newsletter as recipient would see it |
| Device Selector | Dropdown | Desktop, Tablet, Mobile preview |
| Download Button | Action Button | Export current format |

#### Backend Data Model

```python
class NewsletterPreview(BaseModel):
    """Step 5 Preview Data"""
    newsletter_id: str
    preview_formats: Dict[str, str]   # {format: rendered_content}
    export_files: List[str]           # S3 keys for generated exports
    preview_generated_at: Optional[str]
```

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/newsletters/{id}/generate-preview` | Generate preview in all formats |
| GET | `/api/newsletters/{id}/preview/{format}` | Get specific format preview |
| POST | `/api/newsletters/{id}/export/{format}` | Generate downloadable export |
| GET | `/api/newsletters/{id}/download/{format}` | Download export file |

---

### Step 6: Automation

#### UI Components

| Component | Type | Description |
|-----------|------|-------------|
| Schedule Picker | DateTime Input | Programar fecha/hora de envío |
| Recurrence Selector | Dropdown | One-time, Weekly, Monthly, etc. |
| Distribution List | Multi-select | Seleccionar listas de distribución |
| API Integration | Config Card | Configurar integración con email services |
| Save as Template | Checkbox | Guardar configuración como plantilla |

#### Backend Data Model

```python
class NewsletterAutomation(BaseModel):
    """Step 6 Automation Data"""
    newsletter_id: str
    schedule_type: str              # "immediate" | "scheduled" | "recurring"
    scheduled_at: Optional[str]     # ISO datetime
    recurrence_pattern: Optional[str]  # "weekly" | "monthly" | "quarterly"
    distribution_lists: List[str]   # Email list IDs
    integration_config: Dict        # API keys, service configs
    is_template: bool               # Save as reusable template
    template_name: Optional[str]
    published_at: Optional[str]
```

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/newsletters/{id}/automation` | Save automation settings |
| POST | `/api/newsletters/{id}/schedule` | Schedule newsletter |
| POST | `/api/newsletters/{id}/publish` | Publish/send immediately |
| POST | `/api/newsletters/{id}/save-template` | Save as template |
| GET | `/api/newsletters/templates` | List saved templates |

---

### DynamoDB Table Design (Single-Table)

```
PK                              | SK                    | GSI1PK           | GSI1SK
--------------------------------|-----------------------|------------------|------------------
NEWSLETTER#NL-20260126-ABCD     | METADATA              | USER#user123     | NEWSLETTER#2026-01-26T...
NEWSLETTER#NL-20260126-ABCD     | TOPICS                | -                | -
NEWSLETTER#NL-20260126-ABCD     | OUTLINE               | -                | -
NEWSLETTER#NL-20260126-ABCD     | DRAFT                 | -                | -
NEWSLETTER#NL-20260126-ABCD     | PREVIEW               | -                | -
NEWSLETTER#NL-20260126-ABCD     | AUTOMATION            | -                | -
TEMPLATE#TPL-WEEKLY-NEWS        | METADATA              | USER#user123     | TEMPLATE#2026-01-26T...
```

---

### Lambda Worker Tasks

| Task | Trigger | Description | Estimated Time |
|------|---------|-------------|----------------|
| `analyze_config` | Step 1 complete | Validate config, extract style from examples | 30-60s |
| `generate_preview_structure` | Step 2 complete | Generate structure preview | 20-40s |
| `generate_outline` | Step 3 start | Generate full outline from topics | 45-90s |
| `generate_draft` | Step 4 start | Generate full newsletter draft | 2-5min |
| `generate_exports` | Step 5 start | Generate PDF, HTML, DOCX exports | 30-60s |
| `schedule_newsletter` | Step 6 schedule | Queue for scheduled delivery | Immediate |

---

### Component Mapping (Proposal Writer -> Newsletter Generator)

| Proposal Writer Component | Newsletter Generator Equivalent | Changes Required |
|---------------------------|--------------------------------|------------------|
| `ProposalLayout.tsx` | `NewsletterLayout.tsx` | Rename, update step count |
| `ProposalSecondaryNavbar.tsx` | `NewsletterSecondaryNavbar.tsx` | Update breadcrumb text |
| `ProposalSidebar.tsx` | `NewsletterSidebar.tsx` | Update step icons/labels |
| `stepConfig.ts` | `newsletterStepConfig.ts` | Define 6 steps |
| `proposalService.ts` | `newsletterService.ts` | New API endpoints |
| `useProposal.ts` | `useNewsletter.ts` | Adapt state management |
| `ProposalWriterPage.tsx` | `NewsletterGeneratorPage.tsx` | New step components |
| `worker.py` | `newsletter_worker.py` | New task handlers |

---

### New Components Required

| Component | Purpose | Priority |
|-----------|---------|----------|
| `AudienceCheckboxGroup.tsx` | Multi-select audience checkboxes | High |
| `DualToneSlider.tsx` | Two-axis tone configuration | High |
| `InformationTypeToggle.tsx` | Toggle with badge for content types | High |
| `OutlineSection.tsx` | Expandable section with editable items | High |
| `NewsletterRichEditor.tsx` | Full-featured text editor | High |
| `PreviewPane.tsx` | Multi-format preview renderer | Medium |
| `SchedulePicker.tsx` | Date/time + recurrence selector | Medium |
| `TemplateSelector.tsx` | Load from saved templates | Low |

---

## ACTIONS

### Phase 1: Foundation (Week 1)

- [ ] Create folder structure: `frontend/src/tools/newsletter-generator/`
- [ ] Create folder structure: `backend/app/tools/newsletter_generator/`
- [ ] Copy and adapt `ProposalLayout` -> `NewsletterLayout`
- [ ] Copy and adapt `ProposalSecondaryNavbar` -> `NewsletterSecondaryNavbar`
- [ ] Copy and adapt `ProposalSidebar` -> `NewsletterSidebar`
- [ ] Create `newsletterStepConfig.ts` with 6 steps
- [ ] Create `NewsletterGeneratorPage.tsx` (main page component)
- [ ] Add route `/newsletter-generator/*` to router
- [ ] Create basic `newsletterService.ts` with CRUD

### Phase 2: Step 1 - Configuration (Week 2)

- [ ] Create `Step1Configuration.tsx`
- [ ] Implement `AudienceCheckboxGroup` component
- [ ] Implement `DualToneSlider` component
- [ ] Implement format dropdown and length/frequency sliders
- [ ] Implement file upload for example newsletters
- [ ] Create backend: `newsletter_generator/routes.py` (CRUD endpoints)
- [ ] Create backend: `newsletter_generator/config/service.py`
- [ ] Create DynamoDB schema for NEWSLETTER items

### Phase 3: Step 2 - Content Planning (Week 3)

- [ ] Create `Step2ContentPlanning.tsx`
- [ ] Implement `InformationTypeToggle` component
- [ ] Implement custom type addition
- [ ] Implement context sections (expandable per type)
- [ ] Implement structure preview card
- [ ] Create backend: `newsletter_generator/topics/service.py`
- [ ] Create Lambda task: `generate_preview_structure`

### Phase 4: Step 3 - Outline Review (Week 4)

- [ ] Create `Step3OutlineReview.tsx`
- [ ] Implement `OutlineSection` component (expandable with items)
- [ ] Implement add/edit/delete item functionality
- [ ] Implement ready status indicators
- [ ] Create backend: `newsletter_generator/outline/service.py`
- [ ] Create Lambda task: `generate_outline`

### Phase 5: Step 4 - Drafting (Week 5)

- [ ] Create `Step4Drafting.tsx`
- [ ] Implement `NewsletterRichEditor` component
- [ ] Implement section navigation sidebar
- [ ] Implement AI suggestions inline
- [ ] Create backend: `newsletter_generator/draft/service.py`
- [ ] Create Lambda task: `generate_draft`

### Phase 6: Step 5 - Preview (Week 6)

- [ ] Create `Step5Preview.tsx`
- [ ] Implement `PreviewPane` component (multi-format)
- [ ] Implement device selector (responsive preview)
- [ ] Implement export/download functionality
- [ ] Create backend: `newsletter_generator/preview/service.py`
- [ ] Create Lambda task: `generate_exports`

### Phase 7: Step 6 - Automation (Week 7)

- [ ] Create `Step6Automation.tsx`
- [ ] Implement `SchedulePicker` component
- [ ] Implement distribution list selector
- [ ] Implement template save functionality
- [ ] Create backend: `newsletter_generator/automation/service.py`
- [ ] Create Lambda task: `schedule_newsletter`

### Phase 8: Integration & Testing (Week 8)

- [ ] End-to-end testing of full 6-step workflow
- [ ] Error handling and edge cases
- [ ] Loading states and progress indicators
- [ ] LocalStorage persistence for drafts
- [ ] Integration with prompt manager
- [ ] Performance optimization
- [ ] Documentation update

---

## Appendix: Design Specifications Reference

See `/specs/mockups/newsletter-generator/specifications.md` for detailed UI dimensions, colors, and styling specifications.

---

## Change Log

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-01-26 | 1.0 | Claude | Initial CRAS specification |
