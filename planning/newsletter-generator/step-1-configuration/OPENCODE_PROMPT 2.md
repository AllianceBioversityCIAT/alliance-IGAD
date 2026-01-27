# OpenCode Implementation Prompt: Newsletter Generator Step 1

> **Fecha:** 2026-01-26
> **Scope:** Implementar Step 1 (Configuration) completo del Newsletter Generator
> **Figma:** https://www.figma.com/design/mUmeInkEfKNUMpWKYcOv11/IGAD?node-id=955-4044

---

## CONTEXTO DEL PROYECTO

Este proyecto es una aplicación monorepo con:
- **Frontend:** React 18 + TypeScript + Vite + CSS Modules
- **Backend:** FastAPI + Python + AWS Lambda
- **Database:** DynamoDB (single-table design)
- **Referencia:** El Proposal Writer ya existe y usamos sus patrones

### Estructura del Proyecto
```
igad-app/
├── frontend/src/tools/
│   ├── proposal-writer/     # ← REFERENCIA (copiar patrones de aquí)
│   └── newsletter-generator/ # ← IMPLEMENTAR AQUÍ
└── backend/app/tools/
    ├── proposal_writer/     # ← REFERENCIA
    └── newsletter_generator/ # ← IMPLEMENTAR AQUÍ
```

---

## TAREA: IMPLEMENTAR STEP 1 COMPLETO

### Archivos a Crear

#### Backend (5 archivos)
```
igad-app/backend/app/tools/newsletter_generator/
├── __init__.py
├── routes.py              # API endpoints
├── models.py              # Pydantic models (opcional, puede estar en routes)
├── service.py             # Business logic
└── config.py              # Constants
```

#### Frontend (12+ archivos)
```
igad-app/frontend/src/tools/newsletter-generator/
├── index.tsx
├── components/
│   ├── NewsletterLayout.tsx
│   ├── NewsletterSecondaryNavbar.tsx
│   ├── NewsletterSidebar.tsx
│   ├── AudienceCheckboxGroup.tsx
│   ├── DualToneSlider.tsx
│   ├── DiscreteSlider.tsx          # NUEVO
│   └── ExampleUploadSection.tsx    # NUEVO
├── pages/
│   ├── NewsletterGeneratorPage.tsx
│   ├── Step1Configuration.tsx
│   ├── newsletterStepConfig.ts
│   └── newsletterGenerator.module.css
├── hooks/
│   └── useNewsletter.ts
├── services/
│   └── newsletterService.ts
└── types/
    └── newsletter.ts
```

---

## ESPECIFICACIONES DETALLADAS

### 1. BACKEND - routes.py

Lee el archivo completo: `planning/newsletter-generator/step-1-configuration/step1-backend.md`

**Endpoints requeridos:**
| Method | Path | Descripción |
|--------|------|-------------|
| POST | `/api/newsletters` | Crear newsletter |
| GET | `/api/newsletters/{code}` | Obtener por código |
| PUT | `/api/newsletters/{code}` | Actualizar config |
| GET | `/api/newsletters` | Listar del usuario |
| DELETE | `/api/newsletters/{code}` | Eliminar |

**Generación de código (consistente con Proposal Writer):**
```python
def generate_newsletter_code() -> str:
    """Generate unique code: NL-YYYYMMDD-XXXX"""
    now = datetime.utcnow()
    date_str = now.strftime("%Y%m%d")
    random_suffix = str(uuid.uuid4())[:4].upper()
    return f"NL-{date_str}-{random_suffix}"
# Resultado: NL-20260126-A1B2
```

**Registrar router en main.py:**
```python
from app.tools.newsletter_generator.routes import router as newsletter_router
app.include_router(newsletter_router)
```

---

### 2. FRONTEND - Componentes Base

#### Copiar y Adaptar de Proposal Writer:

**NewsletterLayout.tsx**
- Source: `proposal-writer/components/ProposalLayout.tsx`
- Cambios:
  - `ProposalLayout` → `NewsletterLayout`
  - `proposalCode` → `newsletterCode`
  - `proposalId` → `newsletterId`
  - `totalSteps={4}` (MVP tiene 4 steps, no 6)
  - CSS module: `newsletterGenerator.module.css`

**NewsletterSecondaryNavbar.tsx**
- Source: `proposal-writer/components/ProposalSecondaryNavbar.tsx`
- Cambios:
  - Breadcrumb: "Newsletter Generator"
  - Status types: `'draft' | 'processing' | 'completed' | 'exported'`

**NewsletterSidebar.tsx**
- Source: `proposal-writer/components/ProposalSidebar.tsx`
- Cambios:
  - 4 steps (no 6):
    1. Configuration
    2. Content Planning
    3. Outline Review
    4. Drafting & Export

---

### 3. FRONTEND - Step1Configuration.tsx

Lee el archivo completo: `planning/newsletter-generator/step-1-configuration/step1-frontend.md`

**Estructura de la página (7 cards):**

1. **Welcome Info Card** (azul)
   - Background: `#eff6ff`
   - Border: `#bedbff`
   - Texto exacto de Figma

2. **Audience Card** - Checkboxes verticales
   - 7 opciones: Myself, Researchers, Development partners, Policy makers, Ag-tech industry, Field staff, Farmers

3. **Tone Card** - DualToneSlider
   - Professional ←→ Casual (0-100)
   - Technical ←→ Approachable (0-100)

4. **Format Card** - Dropdown
   - Email Newsletter, PDF Document, Web Article, HTML Email

5. **Length Card** - DiscreteSlider (3 stops)
   - Short | Mixed | Long
   - Mostrar "Selected: {value}"

6. **Frequency Card** - DiscreteSlider (4 stops)
   - Every day | Weekly | Monthly | Quarterly
   - Mostrar "Selected: {value}"

7. **Geographic Focus Card** - Text input
   - Placeholder: "e.g., IGAD region, East Africa, specific countries..."

8. **Upload Examples Card** (opcional)
   - Botón: "Upload Example Newsletter Files"
   - Formatos: PDF, DOC, DOCX, HTML, TXT

9. **Navigation Footer**
   - Previous (disabled en step 1)
   - Next (azul `#155dfc`)

---

### 4. COMPONENTES NUEVOS

#### DiscreteSlider.tsx
```typescript
interface DiscreteSliderProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  showSelected?: boolean  // Muestra "Selected: {label}"
}
```
- Slider con stops fijos (no continuo)
- Labels arriba del slider
- Fill verde `#166534`

#### ExampleUploadSection.tsx
```typescript
interface ExampleUploadSectionProps {
  files: string[]
  onUpload: (files: File[]) => void
  onDelete: (fileUrl: string) => void
  supportedFormats: string[]
  disabled?: boolean
}
```
- Botón de upload con ícono
- Lista de archivos subidos
- Botón de eliminar por archivo

---

### 5. COLORES (de Figma)

```css
/* Verdes */
--green-primary: #00a63e;
--green-dark: #166534;
--green-step-active: #00a63e;
--green-light: #dcfce7;

/* Info Card */
--info-bg: #eff6ff;
--info-border: #bedbff;
--info-text: #364153;

/* Inputs */
--input-bg: #f3f3f5;
--input-border: rgba(0, 0, 0, 0.1);

/* Slider */
--slider-track: #ececf0;
--slider-fill: #166534;

/* Buttons */
--btn-primary: #155dfc;
--btn-primary-hover: #1347cc;

/* Text */
--text-primary: #0a0a0a;
--text-secondary: #717182;
--text-muted: #9ca3af;
```

---

### 6. SERVICE LAYER

#### newsletterService.ts
```typescript
const API_BASE = '/api/newsletters'

export const newsletterService = {
  // CRUD
  createNewsletter: (data: { title: string }) => apiClient.post(API_BASE, data),
  getNewsletter: (code: string) => apiClient.get(`${API_BASE}/${code}`),
  updateNewsletter: (code: string, data: Partial<NewsletterConfig>) =>
    apiClient.put(`${API_BASE}/${code}`, data),
  listNewsletters: () => apiClient.get(API_BASE),
  deleteNewsletter: (code: string) => apiClient.delete(`${API_BASE}/${code}`),

  // File upload (Step 1 examples)
  uploadExampleFiles: (code: string, files: File[]) => {
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    return apiClient.post(`${API_BASE}/${code}/examples`, formData)
  },
  deleteExampleFile: (code: string, fileUrl: string) =>
    apiClient.delete(`${API_BASE}/${code}/examples`, { data: { fileUrl } }),
}
```

---

### 7. TYPES

#### newsletter.ts
```typescript
export interface Newsletter {
  id: string
  newsletterCode: string
  title: string
  status: 'draft' | 'processing' | 'completed' | 'exported'
  user_id: string

  // Step 1 fields
  target_audience: string[]
  tone_professional: number
  tone_technical: number
  format_type: string
  length_preference: string
  frequency: string
  geographic_focus: string
  example_files: string[]

  current_step: number
  created_at: string
  updated_at: string
}

export type NewsletterStatus = Newsletter['status']
```

---

### 8. ROUTING

Agregar a `frontend/src/routes.tsx` o equivalente:
```typescript
// Newsletter Generator routes
{
  path: '/newsletter-generator',
  element: <NewsletterGeneratorPage />,
  children: [
    { path: '', element: <Navigate to="new" replace /> },
    { path: 'new', element: <Step1Configuration /> },
    { path: ':newsletterCode/step-1', element: <Step1Configuration /> },
    { path: ':newsletterCode/step-2', element: <Step2ContentPlanning /> },
    { path: ':newsletterCode/step-3', element: <Step3OutlineReview /> },
    { path: ':newsletterCode/step-4', element: <Step4Drafting /> },
  ]
}
```

---

## ORDEN DE IMPLEMENTACIÓN

### Fase 1: Backend (primero)
1. Crear `newsletter_generator/__init__.py`
2. Crear `newsletter_generator/routes.py` con los 5 endpoints
3. Registrar router en `main.py`
4. Probar con curl/Postman

### Fase 2: Frontend Base
5. Crear estructura de carpetas
6. Copiar y adaptar `NewsletterLayout.tsx`
7. Copiar y adaptar `NewsletterSecondaryNavbar.tsx`
8. Copiar y adaptar `NewsletterSidebar.tsx`
9. Crear `newsletterStepConfig.ts`
10. Crear `newsletterGenerator.module.css` (copiar base de proposalWriter)

### Fase 3: Step 1 Components
11. Crear `AudienceCheckboxGroup.tsx`
12. Crear `DualToneSlider.tsx`
13. Crear `DiscreteSlider.tsx` (nuevo)
14. Crear `ExampleUploadSection.tsx` (nuevo)

### Fase 4: Step 1 Page
15. Crear `newsletterService.ts`
16. Crear `types/newsletter.ts`
17. Crear `useNewsletter.ts` hook
18. Crear `Step1Configuration.tsx`
19. Crear `NewsletterGeneratorPage.tsx`
20. Agregar rutas

### Fase 5: Testing
21. Probar flujo completo
22. Verificar auto-save
23. Verificar navegación
24. Verificar responsive

---

## DOCUMENTACIÓN DE REFERENCIA

| Archivo | Contenido |
|---------|-----------|
| `step1-backend.md` | Código completo del backend |
| `step1-frontend.md` | Código completo del frontend con CSS |
| `step1-acceptance-criteria.md` | Casos de prueba |
| `shared-components.md` | Componentes a copiar de Proposal Writer |
| `dynamodb-schema.md` | Estructura de datos en DynamoDB |

---

## VALIDACIÓN

Al terminar, verificar:

- [ ] Backend responde en `/api/newsletters`
- [ ] Crear newsletter genera código `NL-YYYYMMDD-XXXX`
- [ ] Frontend muestra los 7 cards correctamente
- [ ] Colores coinciden con Figma
- [ ] Auto-save funciona (debounce 500ms)
- [ ] Sliders discretos muestran "Selected: X"
- [ ] Botón Next navega a step-2
- [ ] Botón Previous está deshabilitado
- [ ] Upload de archivos funciona
- [ ] Step stepper muestra 4 pasos (no 6)

---

## NOTAS IMPORTANTES

1. **NO crear 6 steps** - MVP es 4 steps solamente
2. **UUID consistente** - Usar `uuid[:4]` igual que Proposal Writer
3. **Copiar patrones** de Proposal Writer, no reinventar
4. **CSS Modules** - No usar Tailwind, seguir el patrón existente
5. **Figma es la fuente de verdad** para colores y espaciado
