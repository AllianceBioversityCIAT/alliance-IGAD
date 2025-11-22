# 🎨 FIX: Modal de Loading Contextual

**Fecha:** 2025-11-22 22:52 UTC  
**Problema:** Modal muestra el mismo mensaje para todos los steps

---

## 🎯 PROBLEMA IDENTIFICADO

**Antes:**
Todos los steps mostraban el mismo modal:
```
Generating Updated Concept Document...
Our AI is analyzing your RFP and initial concept...

1. Analyzing RFP Document
2. Analyzing Initial Concept

Step 1 of 1
```

**Por qué estaba mal:**
- Step 1: ✅ Correcto (analiza RFP y concept)
- Step 2: ❌ Incorrecto (NO está analizando, está GENERANDO)
- Step 3 (Re-generate): ❌ Incorrecto (NO está analizando, está RE-GENERANDO)

---

## 🔧 SOLUCIÓN IMPLEMENTADA

### Cambio 1: Modal dinámico

**Archivo:** `AnalysisProgressModal.tsx`

**Antes (hardcoded):**
```typescript
<p className={styles.description}>
  Our AI is analyzing your RFP...
</p>
<div className={styles.steps}>
  <div>Analyzing RFP Document</div>
  <div>Analyzing Initial Concept</div>
</div>
```

**Después (dinámico):**
```typescript
interface AnalysisProgressModalProps {
  progress?: {
    step: number
    total: number
    message: string
    description?: string  // ← Custom description
    steps?: string[]      // ← Custom step labels
  }
}

const defaultDescription = 'Our AI is analyzing...'
const defaultSteps = ['Analyzing RFP', 'Analyzing Concept']

const description = progress?.description || defaultDescription
const steps = progress?.steps || defaultSteps

<p className={styles.description}>{description}</p>
<div className={styles.steps}>
  {steps.map((stepText, index) => (
    <div key={index}>{stepText}</div>
  ))}
</div>
```

---

### Cambio 2: Mensajes contextuales

**Archivo:** `ProposalWriterPage.tsx` (línea 973-988)

**Step 1 (RFP Analysis):**
```typescript
progress: analysisProgress  // Default
// Message: "Analyzing Documents..."
// Steps: ["Analyzing RFP Document", "Analyzing Initial Concept"]
```

**Step 2 (Generate Document):**
```typescript
progress: { 
  step: 1, 
  total: 3, 
  message: 'Generating Concept Document...',
  description: 'Our AI is creating a structured proposal outline based on your selections. This may take 1-2 minutes.',
  steps: [
    'Processing selected sections',
    'Generating proposal structure',
    'Creating guiding questions'
  ]
}
```

**Step 3 (Re-generate):**
El mismo mensaje que Step 2 (porque usa `isGeneratingDocument`)

---

## 📋 RESULTADO ESPERADO

### Step 1: Analyzing Documents ✅
```
┌─────────────────────────────────────────────┐
│         Analyzing Documents...              │
├─────────────────────────────────────────────┤
│ Our AI is analyzing your RFP and initial   │
│ concept to provide strategic insights.     │
│ This may take 1-3 minutes.                 │
│                                            │
│ [====================] 100%                │
│                                            │
│ ✓ 1. Analyzing RFP Document               │
│ ✓ 2. Analyzing Initial Concept            │
│                                            │
│ Step 2 of 2                                │
└─────────────────────────────────────────────┘
```

### Step 2: Generating Concept Document ✅
```
┌─────────────────────────────────────────────┐
│      Generating Concept Document...         │
├─────────────────────────────────────────────┤
│ Our AI is creating a structured proposal   │
│ outline based on your selections.          │
│ This may take 1-2 minutes.                 │
│                                            │
│ [======                ] 33%               │
│                                            │
│ ✓ 1. Processing selected sections         │
│   2. Generating proposal structure         │
│   3. Creating guiding questions            │
│                                            │
│ Step 1 of 3                                │
└─────────────────────────────────────────────┘
```

### Step 3: Re-generating Document ✅
```
┌─────────────────────────────────────────────┐
│      Generating Concept Document...         │
├─────────────────────────────────────────────┤
│ Our AI is creating a structured proposal   │
│ outline based on your selections.          │
│ This may take 1-2 minutes.                 │
│                                            │
│ [======                ] 33%               │
│                                            │
│ ✓ 1. Processing selected sections         │
│   2. Generating proposal structure         │
│   3. Creating guiding questions            │
│                                            │
│ Step 1 of 3                                │
└─────────────────────────────────────────────┘
```

**Nota:** Step 3 usa el mismo mensaje que Step 2 porque ambos usan `isGeneratingDocument`. Si quieres un mensaje diferente para re-generación, necesitarías una flag adicional (ej: `isRegenerating`).

---

## ✅ ARCHIVOS MODIFICADOS

**Frontend (2 archivos):**

1. **`AnalysisProgressModal.tsx`**
   - Añadidos campos opcionales `description` y `steps` al interface
   - Modal ahora renderiza dinámicamente los steps
   - Defaults preservan comportamiento original de Step 1

2. **`ProposalWriterPage.tsx`**
   - Actualizado el objeto `progress` para Step 2/3
   - Mensaje personalizado: "Generating Concept Document..."
   - Descripción personalizada
   - 3 steps personalizados

---

## 🚀 DEPLOY

```bash
cd igad-app/frontend
npm run build
# Deploy a S3/CloudFront
```

---

## 🧪 TESTING

### Test Step 1:
1. Crear nueva propuesta
2. Subir RFP y concepto
3. Click "Analyze & Continue"
4. **Verificar modal:** "Analyzing Documents..." con 2 steps

### Test Step 2:
1. Seleccionar 3 secciones
2. Click "Generate Updated Document"
3. **Verificar modal:** "Generating Concept Document..." con 3 steps

### Test Step 3:
1. Click "Edit Sections"
2. Cambiar selección
3. Click "Re-generate"
4. **Verificar modal:** "Generating Concept Document..." con 3 steps

---

## 💡 MEJORA FUTURA (Opcional)

Si quieres un mensaje diferente para **re-generación** en Step 3:

**Opción 1:** Añadir flag `isRegenerating`

```typescript
const [isRegenerating, setIsRegenerating] = useState(false)

// En handleGenerateConceptDocument:
if (overrideData) {
  setIsRegenerating(true)
} else {
  setIsGeneratingDocument(true)
}

// En el modal:
<AnalysisProgressModal 
  progress={
    isRegenerating 
      ? { 
          message: 'Re-generating Concept Document...',
          description: 'Our AI is updating the proposal with your modified selections...',
          steps: [...]
        }
      : isGeneratingDocument 
        ? { ... }
        : analysisProgress
  }
/>
```

**Opción 2:** Pasar contexto al modal

```typescript
<AnalysisProgressModal 
  isOpen={...}
  progress={...}
  context={currentStep === 3 ? 'regenerating' : 'generating'}  // ← Nuevo
/>
```

Por ahora, ambos usan el mismo mensaje (Step 2 y Step 3).

---

## 📊 COMPARACIÓN

| Aspecto | Antes | Después |
|---------|-------|---------|
| Step 1 modal | ✅ Correcto | ✅ Correcto (sin cambios) |
| Step 2 modal | ❌ "Analyzing..." | ✅ "Generating..." |
| Step 3 modal | ❌ "Analyzing..." | ✅ "Generating..." |
| Steps mostrados | Hardcoded 2 | Dinámico (2 o 3) |
| Descripción | Hardcoded | Dinámica |
| Flexibilidad | ❌ Baja | ✅ Alta |

---

**Estado:** ✅ Listo para deploy

_Documento generado: 2025-11-22 22:52 UTC_
