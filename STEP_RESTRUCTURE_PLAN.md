# 📋 Plan de Reestructuración de Steps - Proposal Writer

**Fecha:** 2025-11-27
**Autor:** GitHub Copilot CLI
**Estado:** ✅ IMPLEMENTADO - Pendiente de Testing

---

## 🎯 OBJETIVO

Reestructurar el flujo de pasos del Proposal Writer para agregar un nuevo Step 4 dedicado a la generación del template estructurado de la propuesta.

---

## 📊 CAMBIOS EN LA ESTRUCTURA

### **ANTES (5 Steps):**

1. **Step 1:** Information Consolidation
2. **Step 2:** Content Generation (Concept Review)
3. **Step 3:** Structure & Validation (muestra concept document)
4. **Step 4:** Review & Refinement
5. **Step 5:** Final Export

### **DESPUÉS (6 Steps):**

1. **Step 1:** Information Consolidation *(sin cambios)*
2. **Step 2:** Content Generation (Concept Review) *(sin cambios)*
3. **Step 3:** Concept Document *(renombrado - muestra el concept document generado)*
4. **Step 4:** Structure & Workplan *(NUEVO - seleccionar secciones para template)*
5. **Step 5:** Review & Refinement *(renumerado desde Step 4)*
6. **Step 6:** Final Export *(renumerado desde Step 5)*

---

## 📁 ARCHIVOS AFECTADOS

### **1. Archivos a RENOMBRAR:**

```
📄 COMPONENTES DE STEPS:
├── Step5FinalExport.tsx          → Step6FinalExport.tsx
├── Step4ReviewRefinement.tsx     → Step5ReviewRefinement.tsx
└── Step3StructureValidation.tsx  → Step3ConceptDocument.tsx

📄 ESTILOS:
├── step4.module.css              → step5.module.css
└── step3.module.css              → step3-concept.module.css
```

### **2. Archivos a CREAR:**

```
📄 NUEVO STEP 4:
├── Step4StructureWorkplan.tsx    (NUEVO)
└── step4-structure.module.css    (NUEVO)
```

### **3. Archivos a MODIFICAR:**

```
📄 CONFIGURACIÓN Y LÓGICA:
├── stepConfig.ts                 (actualizar configuración de 6 steps)
├── ProposalWriterPage.tsx        (actualizar imports, lógica y condiciones)
└── ProposalSidebar.tsx           (automático vía stepConfig)
```

---

## 🔧 IMPLEMENTACIÓN DETALLADA

### **FASE 1: Renombrado de archivos**

#### **1.1 Renombrar Step 5 → Step 6**
```bash
# Archivo principal
mv Step5FinalExport.tsx → Step6FinalExport.tsx

# Actualizar imports internos en el archivo
# Actualizar export default
```

#### **1.2 Renombrar Step 4 → Step 5**
```bash
# Archivo principal
mv Step4ReviewRefinement.tsx → Step5ReviewRefinement.tsx

# Archivo CSS
mv step4.module.css → step5.module.css

# Actualizar imports CSS en el componente
```

#### **1.3 Renombrar Step 3**
```bash
# Archivo principal
mv Step3StructureValidation.tsx → Step3ConceptDocument.tsx

# Archivo CSS
mv step3.module.css → step3-concept.module.css

# Actualizar imports CSS en el componente
```

---

### **FASE 2: Crear nuevo Step 4**

#### **2.1 Crear Step4StructureWorkplan.tsx**

**Contenido base del componente:**

```typescript
import { useState, useEffect } from 'react'
import { Layers, Check, ChevronDown, ChevronUp } from 'lucide-react'
import styles from './step4-structure.module.css'
import step2Styles from './step2.module.css'

interface Section {
  section: string
  description: string
  priority: 'Critical' | 'Recommended' | 'Optional'
  suggestions?: string[]
}

interface Step4Props {
  proposalId?: string
  conceptDocument?: any
  onGenerateTemplate?: (
    selectedSections: string[],
    userComments: { [key: string]: string }
  ) => void
}

export function Step4StructureWorkplan({
  proposalId,
  conceptDocument,
  onGenerateTemplate,
}: Step4Props) {
  // State management
  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [userComments, setUserComments] = useState<{ [key: string]: string }>({})
  const [reviewedCount, setReviewedCount] = useState(0)

  // Secciones de la propuesta
  const proposalSections: Section[] = [
    {
      section: 'Executive Summary',
      description: 'High-level overview of the proposal...',
      priority: 'Critical',
      suggestions: [/* ... */]
    },
    // ... más secciones
  ]

  return (
    <div className={styles.mainContent}>
      {/* Header */}
      <div className={styles.stepHeader}>
        <h1>Step 4: Structure & Workplan</h1>
        <p>Select sections to include in your proposal template</p>
      </div>

      {/* Sections List */}
      {/* Similar to Step 2 UI */}
      
      {/* Generate Button */}
      <button onClick={handleGenerateTemplate}>
        Generate Template
      </button>
    </div>
  )
}
```

**Secciones a incluir (según mockup):**
1. Executive Summary
2. Problem Statement
3. Theory of Change
4. Project Objectives
5. Implementation Methodology
6. Workplan and Timeline
7. Monitoring, Evaluation & Learning
8. Gender and Social Inclusion
9. Sustainability Plan
10. Budget and Budget Narrative
11. Organizational Capacity
12. Risk Management

#### **2.2 Crear step4-structure.module.css**

Reutilizar estilos de `step2.module.css` con ajustes específicos.

---

### **FASE 3: Actualizar configuración**

#### **3.1 Actualizar stepConfig.ts**

```typescript
import { Upload, Edit, FileText, Layers, Eye, Download } from 'lucide-react'

export const stepConfig = [
  { id: 1, title: 'Information Consolidation', icon: Upload },
  { id: 2, title: 'Content Generation', icon: Edit },
  { id: 3, title: 'Concept Document', icon: FileText },        // Renombrado
  { id: 4, title: 'Structure & Workplan', icon: Layers },      // NUEVO
  { id: 5, title: 'Review & Refinement', icon: Eye },          // Renumerado
  { id: 6, title: 'Final Export', icon: Download },            // Renumerado
]
```

#### **3.2 Actualizar ProposalWriterPage.tsx**

**Cambios en imports:**
```typescript
import Step3ConceptDocument from './Step3ConceptDocument'
import Step4StructureWorkplan from './Step4StructureWorkplan'  // NUEVO
import Step5ReviewRefinement from './Step5ReviewRefinement'
import Step6FinalExport from './Step6FinalExport'
```

**Cambios en lógica:**

1. **Estados nuevos:**
```typescript
const [templateGenerated, setTemplateGenerated] = useState(false)
const [structureSelectionData, setStructureSelectionData] = useState<{
  selectedSections: string[]
  userComments: { [key: string]: string }
}>({ selectedSections: [], userComments: {} })
```

2. **Actualizar completedSteps:**
```typescript
// Step 3 completed if concept document exists
if (conceptDocument) completedSteps.push(3)

// Step 4 completed if template generated
if (templateGenerated) completedSteps.push(4)

// Step 5 completed if... (renumerado desde 4)
// Step 6 completed if... (renumerado desde 5)
```

3. **Actualizar renderizado de steps:**
```typescript
{currentStep === 3 && (
  <Step3ConceptDocument
    conceptDocument={conceptDocument}
    onRegenerateDocument={handleRegenerateDocument}
    onNextStep={handleNextStep}
  />
)}
{currentStep === 4 && (
  <Step4StructureWorkplan
    proposalId={proposalId}
    conceptDocument={conceptDocument}
    onGenerateTemplate={handleGenerateTemplate}
  />
)}
{currentStep === 5 && (
  <Step5ReviewRefinement {...props} />
)}
{currentStep === 6 && (
  <Step6FinalExport {...props} />
)}
```

4. **Actualizar botones de navegación:**
```typescript
// Step 3: Continue to Structure & Workplan
currentStep === 3 ? (
  <>Continue to Structure & Workplan</>
)

// Step 4: Generate Template or Continue
currentStep === 4 && !templateGenerated ? (
  <>Generate Template</>
) : currentStep === 4 ? (
  <>Continue to Review</>
)

// Step 5, 6... (renumerados)
```

5. **Nueva función handleGenerateTemplate:**
```typescript
const handleGenerateTemplate = async (
  selectedSections: string[],
  userComments: { [key: string]: string }
) => {
  try {
    setIsGenerating(true)
    
    // Llamar API para generar template
    const response = await generateProposalTemplate(
      proposalId,
      selectedSections,
      userComments
    )
    
    setTemplateGenerated(true)
    // Guardar template generado
    
  } catch (error) {
    console.error('Error generating template:', error)
  } finally {
    setIsGenerating(false)
  }
}
```

---

### **FASE 4: Actualización de ProposalSidebar**

**NO REQUIERE CAMBIOS** - Se actualiza automáticamente al leer `stepConfig.ts`

El sidebar mostrará:
- Step 3: Concept Document
- Step 4: Structure & Workplan (NUEVO)
- Step 5: Review & Refinement
- Step 6: Final Export

---

## 🎨 DETALLES DE UI/UX

### **Step 3: Concept Document (renombrado)**

**Título en Sidebar:** "Concept Document"

**Funcionalidad:**
- Visualizar concept document generado
- Botón de descarga
- Botón "Edit Sections & Regenerate"
- Botón "Continue to Structure & Workplan"

### **Step 4: Structure & Workplan (NUEVO)**

**Título en Sidebar:** "Structure & Workplan"

**Página principal:**
- **Header:** 
  - Título: "Step 4: Structure & Workplan"
  - Descripción: "Select sections to include in your proposal template"

- **Contador:** "0/12 sections reviewed"

- **Lista de secciones:** (estilo similar a Step 2)
  - Checkbox para seleccionar
  - Nombre de la sección
  - Badge de prioridad (Critical/Recommended/Optional)
  - Botón "See more/See less"
  
  **Al expandir:**
  - Details and Guidance
  - Suggestions (lista)
  - **Comments field** (textarea)

- **Botón final:** "Generate Template"

**Estados del botón:**
- Si no hay template: "Generate Template"
- Si ya existe template: "Continue to Review"

---

## 🔄 FLUJO DE NAVEGACIÓN

```
Step 1 → Step 2 → Step 3 → Step 4 → Step 5 → Step 6
  ↓        ↓        ↓        ↓        ↓        ↓
 Info → Concept → View   → Select → Review → Export
       Review   Document  Sections
                           ↓
                      Generate
                      Template
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### **Renombrado de archivos:**
- [x] Renombrar Step5FinalExport.tsx → Step6FinalExport.tsx
- [x] Renombrar Step4ReviewRefinement.tsx → Step5ReviewRefinement.tsx
- [x] Renombrar step4.module.css → step5.module.css
- [x] Renombrar Step3StructureValidation.tsx → Step3ConceptDocument.tsx
- [x] Renombrar step3.module.css → step3-concept.module.css
- [x] Actualizar imports CSS en componentes renombrados

### **Creación de archivos:**
- [x] Crear Step4StructureWorkplan.tsx
- [x] Crear step4-structure.module.css
- [x] Implementar lista de 12 secciones
- [x] Implementar UI de selección (checkboxes)
- [x] Implementar expandir/contraer secciones
- [x] Implementar comments fields
- [x] Implementar contador de secciones revisadas

### **Actualización de configuración:**
- [x] Actualizar stepConfig.ts (6 steps)
- [x] Actualizar imports en ProposalWriterPage.tsx
- [x] Actualizar renderizado de steps
- [x] Actualizar lógica de completedSteps
- [x] Actualizar botones de navegación
- [x] Crear handleGenerateTemplate function
- [x] Actualizar condiciones de paso entre steps

### **Testing:**
- [ ] Probar navegación Step 1 → 2
- [ ] Probar navegación Step 2 → 3
- [ ] Probar navegación Step 3 → 4
- [ ] Probar selección de secciones en Step 4
- [ ] Probar generación de template
- [ ] Probar navegación Step 4 → 5
- [ ] Probar navegación Step 5 → 6
- [ ] Probar sidebar (6 steps)
- [ ] Probar progreso (%)
- [ ] Verificar estilos en todos los steps

---

## 🚨 CONSIDERACIONES IMPORTANTES

1. **Backend API:** Verificar si existe endpoint para generar template o crear uno nuevo
2. **Data persistence:** Asegurar que selección de secciones se guarde en DynamoDB
3. **Regeneración:** Permitir editar selección y regenerar template
4. **Validación:** Requerir al menos 1 sección seleccionada para continuar
5. **Loading states:** Mostrar spinner durante generación de template
6. **Error handling:** Manejar errores de generación gracefully

---

## 📝 NOTAS ADICIONALES

- El Step 4 reutiliza estilos de Step 2 para mantener consistencia visual
- Las 12 secciones son estándar para propuestas de desarrollo internacional
- El campo de comentarios permite contexto adicional para la IA
- La prioridad de secciones guía al usuario sobre qué es más importante

---

## 🎯 PRÓXIMOS PASOS

1. Confirmar plan con el equipo
2. Ejecutar renombrado de archivos
3. Crear nuevo Step 4
4. Actualizar configuración y lógica
5. Testing completo del flujo
6. Deploy a testing environment

---

**Fin del documento**
