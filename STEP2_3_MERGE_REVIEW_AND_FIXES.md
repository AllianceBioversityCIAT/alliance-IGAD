# Step 2 & 3 Merge - Revisión y Correcciones Necesarias

**Fecha:** 2024-12-08
**Estado:** Revisión de Implementación de KIRO

---

## 📊 Resumen de lo Implementado

### ✅ **LO QUE YA ESTÁ HECHO (Por KIRO)**

1. **Step2ConceptReview.tsx creado** ✅
   - Archivo existe en: `frontend/src/tools/proposal-writer/pages/Step2ConceptReview.tsx`
   - Incluye importaciones de Document/Packer para DOCX
   - Tiene interfaces correctas con user_comments
   - Fusiona funcionalidad de Step 2 y Step 3

2. **ProposalWriterPage.tsx actualizado parcialmente** ✅
   - Importa `Step2ConceptReview` correctamente (línea 8)
   - NO importa Step3ConceptDocument (correcto)
   - Case 2 usa Step2ConceptReview (líneas 1312-1326)
   - Case 3 muestra "Coming Soon" placeholder (líneas 1327-1337)

3. **Backend verificado** ✅
   - `concept_evaluation/service.py` recibe `reference_proposals_analysis` y `existing_work_analysis` (líneas 64-65)
   - Método `_unwrap_analysis` existe (líneas 288-305)
   - Método `_build_user_prompt` inyecta ambos análisis (líneas 307-373)
   - Placeholders soportados: `{{reference_proposal_analysis}}`, `{{reference_proposals_analysis}}`, `{{existing_work_analysis}}`

---

## ❌ **LO QUE FALTA CORREGIR**

### 1. **stepConfig.ts - Remover Step 3 "Concept Generation"**

**Problema:** El archivo tiene 6 steps, pero Step 3 "Concept Generation" ahora está fusionado con Step 2.

**Archivo:** `frontend/src/tools/proposal-writer/pages/stepConfig.ts`

**Estado Actual:**
```typescript
export const stepConfig = [
  { id: 1, title: 'Information Consolidation', icon: Upload },
  { id: 2, title: 'Concept Review', icon: Edit },
  { id: 3, title: 'Concept Generation', icon: FileText },  // ← DEBE REMOVERSE
  { id: 4, title: 'Structure & Workplan', icon: Layers },
  { id: 5, title: 'Review & Refinement', icon: Eye },
  { id: 6, title: 'Final Export', icon: Download },
]
```

**Estado Deseado:**
```typescript
export const stepConfig = [
  { id: 1, title: 'Information Consolidation', icon: Upload },
  { id: 2, title: 'Concept Review & Generation', icon: Edit },  // ← Título actualizado para reflejar ambas funciones
  { id: 3, title: 'Structure & Workplan', icon: Layers },       // ← Era id 4
  { id: 4, title: 'Review & Refinement', icon: Eye },           // ← Era id 5
  { id: 5, title: 'Final Export', icon: Download },             // ← Era id 6
]
```

**Nota:** Los IDs se mantienen secuenciales (1, 2, 3, 4, 5) después de remover el antiguo Step 3.

---

### 2. **ProposalWriterPage.tsx - Actualizar Referencias a Steps**

**Problema:** El código tiene referencias hardcoded a `currentStep === 3`, `currentStep === 4`, etc. que deben actualizarse.

**Archivo:** `frontend/src/tools/proposal-writer/pages/ProposalWriterPage.tsx`

#### **2.1 Actualizar useEffect para cargar Concept Document**

**Ubicación:** Línea ~441

**Estado Actual:**
```typescript
if (proposalId && currentStep === 3 && !conceptDocument) {
```

**Cambiar a:**
```typescript
if (proposalId && currentStep === 2 && !conceptDocument) {
```

**Razón:** El document ahora se carga en Step 2 (Concept Review & Generation)

---

#### **2.2 Actualizar useEffect para cargar Concept Evaluation**

**Ubicación:** Línea ~505

**Estado Actual:**
```typescript
if (proposalId && currentStep === 3) {
```

**Cambiar a:**
```typescript
if (proposalId && currentStep === 2) {
```

**Razón:** La evaluación también se carga en Step 2

---

#### **2.3 Actualizar lógica de descarga antes de proceder**

**Ubicación:** Línea ~814

**Estado Actual:**
```typescript
// Step 3: Download document before proceeding
if (currentStep === 3 && conceptDocument) {
  console.log('📥 Step 3: Downloading document before proceeding')
  await handleDownloadConceptDocument()
}
```

**Cambiar a:**
```typescript
// Step 2: Download document before proceeding
if (currentStep === 2 && conceptDocument) {
  console.log('📥 Step 2: Downloading document before proceeding')
  await handleDownloadConceptDocument()
}
```

---

#### **2.4 Actualizar botón "Next" onClick logic**

**Ubicación:** Línea ~1379-1387

**Estado Actual:**
```typescript
if (currentStep === 2) {
  handleGenerateConceptDocument()
} else if (currentStep === 3) {
  console.log('📥 Step 3: Proceeding to next step')
  proceedToNextStep()
} else if (currentStep === 4) {
  console.log('📥 Step 4: Proceeding to next step')
  proceedToNextStep()
} else {
  handleNextStep()
}
```

**Cambiar a:**
```typescript
// Step 2 handles its own document generation via button inside component
// All other steps just proceed
if (currentStep === 3 || currentStep === 4) {
  console.log(`📥 Step ${currentStep}: Proceeding to next step`)
  proceedToNextStep()
} else {
  handleNextStep()
}
```

**Nota:** Step 2 ahora tiene su propio botón "Generate Updated Concept" interno, así que el botón Next debe solo avanzar, no generar.

---

#### **2.5 Actualizar botón "Next" disabled logic**

**Ubicación:** Línea ~1391-1404

**Estado Actual:**
```typescript
disabled={
  currentStep === 6 ||
  currentStep === 4 ||
  currentStep === 5 ||
  isAnalyzingRFP ||
  isGeneratingDocument ||
  (currentStep === 1 && /* validaciones */)
}
```

**Cambiar a:**
```typescript
disabled={
  currentStep === 5 ||  // ← Era 6
  currentStep === 3 ||  // ← Era 4
  currentStep === 4 ||  // ← Era 5
  isAnalyzingRFP ||
  isGeneratingDocument ||
  (currentStep === 1 && /* validaciones */)
}
```

---

#### **2.6 Actualizar texto del botón "Next"**

**Ubicación:** Líneas ~1429-1440

**Estado Actual:**
```typescript
) : currentStep === 6 ? (
  'Complete'
) : currentStep === 5 ? (
  'Finish process'
) : currentStep === 4 ? (
  <>
    Next
    <ChevronRight size={16} />
  </>
) : currentStep === 3 ? (
  <>
    Continue to Structure & Workplan
    <ChevronRight size={16} />
  </>
```

**Cambiar a:**
```typescript
) : currentStep === 5 ? (  // ← Era 6
  'Complete'
) : currentStep === 4 ? (  // ← Era 5
  'Finish process'
) : currentStep === 3 ? (  // ← Era 4
  <>
    Next
    <ChevronRight size={16} />
  </>
) : currentStep === 2 ? (  // ← Nuevo: Step 2 ahora va a Structure & Workplan
  <>
    Continue to Structure & Workplan
    <ChevronRight size={16} />
  </>
```

---

#### **2.7 Actualizar switch case para renderizar steps**

**Ubicación:** Líneas ~1310-1355

**Estado Actual:**
```typescript
switch (currentStep) {
  case 1:
    return <Step1InformationConsolidation {...stepProps} />
  case 2:
    return <Step2ConceptReview {...stepProps} /* ... */ />
  case 3:
    return (
      <ComingSoonPlaceholder
        stepNumber={3}
        stepTitle="Proposal Template Selection"
        /* ... */
      />
    )
  case 4:
    return (
      <ComingSoonPlaceholder
        stepNumber={4}
        stepTitle="Full Proposal Generation"
        /* ... */
      />
    )
  case 5:
    return <ComingSoonPlaceholder stepNumber={5} stepTitle="Review & Refinement" />
  case 6:
    return <ComingSoonPlaceholder stepNumber={6} stepTitle="Final Export" />
  default:
    return <Step1InformationConsolidation {...stepProps} />
}
```

**Cambiar a:**
```typescript
switch (currentStep) {
  case 1:
    return <Step1InformationConsolidation {...stepProps} />
  case 2:
    return <Step2ConceptReview {...stepProps} /* ... */ />
  case 3:
    return (
      <ComingSoonPlaceholder
        stepNumber={3}
        stepTitle="Structure & Workplan"  // ← Actualizado
        expectedFeatures={[
          'Define proposal structure',
          'Create work plan and timeline',
          'Set milestones and deliverables',
        ]}
      />
    )
  case 4:
    return (
      <ComingSoonPlaceholder
        stepNumber={4}
        stepTitle="Review & Refinement"  // ← Actualizado
        expectedFeatures={[
          'Review complete proposal',
          'AI-powered quality check',
          'Refinement suggestions',
        ]}
      />
    )
  case 5:
    return (
      <ComingSoonPlaceholder
        stepNumber={5}
        stepTitle="Final Export"  // ← Actualizado
        expectedFeatures={[
          'Export to multiple formats',
          'Download complete proposal package',
          'Generate submission checklist',
        ]}
      />
    )
  default:
    return <Step1InformationConsolidation {...stepProps} />
}
```

---

### 3. **ProposalSidebar.tsx - Verificar Lógica de Completitud**

**Archivo:** `frontend/src/tools/proposal-writer/components/ProposalSidebar.tsx`

**Acción:** Leer y verificar que funcione correctamente con 5 steps en lugar de 6.

La lógica del sidebar debe:
- Mostrar 5 steps (no 6)
- Marcar Step 2 como completado cuando hay conceptDocument
- Calcular progreso basado en 5 steps total

**Verificación Necesaria:**
- [ ] Leer ProposalSidebar.tsx líneas 0-81 (ya leído anteriormente)
- [ ] Verificar que usa `stepConfig.length` dinámicamente
- [ ] Si hay hardcoded `6` steps, cambiar a `5` o usar `stepConfig.length`

---

### 4. **Step2ConceptReview.tsx - Verificar Implementación Completa**

**Archivo:** `frontend/src/tools/proposal-writer/pages/Step2ConceptReview.tsx`

**Verificaciones Necesarias:**

#### 4.1 Verificar que incluye user_comments textarea

**Buscar en el componente:**
- [ ] SectionItem debe tener prop `userComment`
- [ ] SectionItem debe tener prop `onCommentChange`
- [ ] Debe renderizar `<textarea>` dentro de expanded section
- [ ] Textarea debe tener placeholder y value bindings

#### 4.2 Verificar que muestra el documento cuando existe

**Buscar:**
- [ ] Componente `UpdatedConceptDocumentCard` existe
- [ ] Se renderiza cuando `conceptDocument` está presente
- [ ] Incluye botones: Download, Re-upload, Regenerate

#### 4.3 Verificar botón "Generate Updated Concept"

**Buscar:**
- [ ] Botón se muestra cuando NO hay documento y hay secciones seleccionadas
- [ ] Botón llama `onRegenerateDocument(selectedSections, userComments)`

---

## 🔧 **PLAN DE CORRECCIÓN DETALLADO**

### PASO 1: Actualizar stepConfig.ts

```bash
# Archivo: frontend/src/tools/proposal-writer/pages/stepConfig.ts
```

**Acción:** Editar el array stepConfig

**Cambio:**
```typescript
import { Upload, Edit, Layers, Eye, Download } from 'lucide-react'  // Remover FileText

export const stepConfig = [
  { id: 1, title: 'Information Consolidation', icon: Upload },
  { id: 2, title: 'Concept Review & Generation', icon: Edit },
  { id: 3, title: 'Structure & Workplan', icon: Layers },
  { id: 4, title: 'Review & Refinement', icon: Eye },
  { id: 5, title: 'Final Export', icon: Download },
]
```

**Verificación:**
- [ ] Array tiene 5 elementos
- [ ] IDs son secuenciales 1-5
- [ ] Títulos reflejan nueva estructura
- [ ] Import FileText removido (ya no se usa)

---

### PASO 2: Actualizar ProposalWriterPage.tsx

**Archivo:** `frontend/src/tools/proposal-writer/pages/ProposalWriterPage.tsx`

**Usar herramienta Edit para cada cambio:**

#### Cambio 2.1: useEffect línea ~441
```typescript
// Antes:
if (proposalId && currentStep === 3 && !conceptDocument) {

// Después:
if (proposalId && currentStep === 2 && !conceptDocument) {
```

#### Cambio 2.2: useEffect línea ~505
```typescript
// Antes:
if (proposalId && currentStep === 3) {

// Después:
if (proposalId && currentStep === 2) {
```

#### Cambio 2.3: Download logic línea ~814
```typescript
// Antes:
// Step 3: Download document before proceeding
if (currentStep === 3 && conceptDocument) {
  console.log('📥 Step 3: Downloading document before proceeding')

// Después:
// Step 2: Download document before proceeding
if (currentStep === 2 && conceptDocument) {
  console.log('📥 Step 2: Downloading document before proceeding')
```

#### Cambio 2.4: Next button onClick línea ~1379
```typescript
// Antes:
if (currentStep === 2) {
  handleGenerateConceptDocument()
} else if (currentStep === 3) {
  console.log('📥 Step 3: Proceeding to next step')
  proceedToNextStep()
} else if (currentStep === 4) {
  console.log('📥 Step 4: Proceeding to next step')
  proceedToNextStep()
} else {
  handleNextStep()
}

// Después:
// Step 2 handles its own generation via internal button
// All other steps just proceed
if (currentStep === 3 || currentStep === 4) {
  console.log(`📥 Step ${currentStep}: Proceeding to next step`)
  proceedToNextStep()
} else {
  handleNextStep()
}
```

#### Cambio 2.5: Button disabled logic línea ~1391
```typescript
// Antes:
disabled={
  currentStep === 6 ||
  currentStep === 4 ||
  currentStep === 5 ||

// Después:
disabled={
  currentStep === 5 ||
  currentStep === 3 ||
  currentStep === 4 ||
```

#### Cambio 2.6: Button text línea ~1429
```typescript
// Antes:
) : currentStep === 6 ? (
  'Complete'
) : currentStep === 5 ? (
  'Finish process'
) : currentStep === 4 ? (
  <>
    Next
    <ChevronRight size={16} />
  </>
) : currentStep === 3 ? (
  <>
    Continue to Structure & Workplan

// Después:
) : currentStep === 5 ? (
  'Complete'
) : currentStep === 4 ? (
  'Finish process'
) : currentStep === 3 ? (
  <>
    Next
    <ChevronRight size={16} />
  </>
) : currentStep === 2 ? (
  <>
    Continue to Structure & Workplan
```

#### Cambio 2.7: Switch cases línea ~1327
```typescript
// Antes:
case 3:
  return (
    <ComingSoonPlaceholder
      stepNumber={3}
      stepTitle="Proposal Template Selection"
      expectedFeatures={[
        'Choose from donor-specific templates',
        'Customize proposal structure',
        'Map concept sections to proposal outline',
      ]}
    />
  )
case 4:
  return (
    <ComingSoonPlaceholder
      stepNumber={4}
      stepTitle="Full Proposal Generation"
      expectedFeatures={[
        'AI-powered full proposal writing',
        'Section-by-section generation',
        'Download complete proposal',
      ]}
    />
  )
case 5:
  return <ComingSoonPlaceholder stepNumber={5} stepTitle="Review & Refinement" />
case 6:
  return <ComingSoonPlaceholder stepNumber={6} stepTitle="Final Export" />

// Después:
case 3:
  return (
    <ComingSoonPlaceholder
      stepNumber={3}
      stepTitle="Structure & Workplan"
      expectedFeatures={[
        'Define proposal structure',
        'Create work plan and timeline',
        'Set milestones and deliverables',
      ]}
    />
  )
case 4:
  return (
    <ComingSoonPlaceholder
      stepNumber={4}
      stepTitle="Review & Refinement"
      expectedFeatures={[
        'Review complete proposal',
        'AI-powered quality check',
        'Refinement suggestions',
      ]}
    />
  )
case 5:
  return (
    <ComingSoonPlaceholder
      stepNumber={5}
      stepTitle="Final Export"
      expectedFeatures={[
        'Export to multiple formats',
        'Download complete proposal package',
        'Generate submission checklist',
      ]}
    />
  )
```

---

### PASO 3: Verificar Step2ConceptReview.tsx

**Archivo:** `frontend/src/tools/proposal-writer/pages/Step2ConceptReview.tsx`

**Lectura Completa Necesaria:**

Usar `Read` tool para verificar:
1. [ ] Líneas 1-100: Imports y type definitions
2. [ ] Buscar `userComments` state
3. [ ] Buscar `textarea` en JSX
4. [ ] Buscar `UpdatedConceptDocumentCard` o document display
5. [ ] Buscar `Generate Updated Concept` button

---

### PASO 4: Verificar ProposalSidebar.tsx

**Archivo:** `frontend/src/tools/proposal-writer/components/ProposalSidebar.tsx`

Ya tenemos líneas 0-81 leídas anteriormente. Verificar:
- [ ] Usa `stepConfig` importado
- [ ] Calcula progreso dinámicamente
- [ ] No tiene hardcoded `6` steps

---

### PASO 5: Testing

**Checklist de Pruebas:**

#### Frontend Testing
- [ ] Sidebar muestra 5 steps (no 6)
- [ ] Step 2 se llama "Concept Review & Generation"
- [ ] Step 3 se llama "Structure & Workplan" (Coming Soon)
- [ ] Step 4 se llama "Review & Refinement" (Coming Soon)
- [ ] Step 5 se llama "Final Export" (Coming Soon)
- [ ] Navegación funciona correctamente entre steps
- [ ] Step 2 muestra todas las secciones (Fit, Strong Aspects, Sections, Document)
- [ ] User comments textarea aparece en secciones expandidas
- [ ] Botón "Generate Updated Concept" funciona
- [ ] Documento se muestra cuando existe
- [ ] Botones Download/Regenerate funcionan

#### Backend Testing
- [ ] Prompt 3 recibe `reference_proposals_analysis`
- [ ] Prompt 3 recibe `existing_work_analysis`
- [ ] Documentos generados reflejan user_comments

---

## 📋 **RESUMEN DE CAMBIOS**

### Archivos que DEBEN modificarse:

1. **`stepConfig.ts`**
   - Remover Step 3 "Concept Generation"
   - Actualizar IDs a 1-5
   - Cambiar Step 2 title a "Concept Review & Generation"

2. **`ProposalWriterPage.tsx`**
   - 7 ubicaciones diferentes que referencian step numbers
   - Actualizar lógica de carga de documento a Step 2
   - Actualizar switch cases para 5 steps

### Archivos que deben VERIFICARSE:

3. **`Step2ConceptReview.tsx`** ✓
   - Verificar user_comments implementación
   - Verificar document display
   - Verificar botón Generate

4. **`ProposalSidebar.tsx`** ✓
   - Verificar que usa stepConfig dinámicamente
   - Verificar progreso

### Backend (Ya Completo):

5. **`concept_evaluation/service.py`** ✅
   - Ya recibe reference_proposals_analysis
   - Ya recibe existing_work_analysis
   - Ya inyecta placeholders

---

## ✅ **CRITERIOS DE ÉXITO**

La implementación estará completa cuando:

- [ ] Sidebar muestra exactamente 5 steps
- [ ] No existe referencia a Step 6
- [ ] Step 2 incluye review Y generation
- [ ] Step 3-5 son Coming Soon con títulos correctos
- [ ] User comments funcionan end-to-end
- [ ] Documentos generados incluyen contexto de Step 2 analyses
- [ ] No hay errores de TypeScript
- [ ] No hay errores en consola del browser
- [ ] Navegación entre steps fluye correctamente

---

## 🚀 **SIGUIENTE PASOS RECOMENDADOS**

1. **Implementar correcciones** siguiendo PASO 1-4 de este documento
2. **Testing local** usando checklist del PASO 5
3. **Deployment a testing environment**
4. **User acceptance testing**
5. **Deployment a producción**

---

**Documento creado para facilitar la revisión y corrección de la fusión Step 2 & 3.**
