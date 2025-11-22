# 🔍 DEBUGGING: Frontend envía array vacío en re-generate

**Fecha:** 2025-11-22 22:54 UTC  
**Estado:** 🔍 Investigando

---

## 🎯 PROBLEMA REPORTADO

**Síntoma:**
Usuario selecciona SOLO "Budget & Resources" en Step 3 → Click "Re-generate" → Todas las secciones quedan en `selected: false` en DynamoDB.

**Evidencia de DynamoDB:**
```bash
aws dynamodb get-item ... | jq '...'

{
  "section": "Theory of Change",
  "selected": { "BOOL": false }
}
{
  "section": "Budget & Resources",
  "selected": { "BOOL": false }  # ← Debería ser true
}
```

---

## ✅ VERIFICACIÓN DEL BACKEND

**Backend funciona correctamente:**
- Fix 9 aplicado: Si sección NO está en `user_selections` → marca `selected=False`
- Si `user_selections` está vacío → todas quedan en `False`

**Conclusión:** El backend está trabajando como se esperaba. El problema está en el frontend.

---

## 🔍 ANÁLISIS DEL FLUJO FRONTEND

### Paso 1: Step3StructureValidation.tsx

**Modal "Edit Sections":**
```typescript
const [selectedSections, setSelectedSections] = useState<string[]>([])

// Usuario marca "Budget & Resources"
// selectedSections = ["Budget & Resources"]
```

**Botón "Re-generate":**
```typescript
const handleRegenerateDocument = async () => {
  console.log('🔄 Regenerating document with:')
  console.log(`   Selected sections: ${selectedSections.length}`)  
  console.log(`   Sections:`, selectedSections)  // ["Budget & Resources"]
  console.log(`   Comments:`, userComments)
  
  await onRegenerateDocument(selectedSections, userComments)  // ✅ Envía correctamente
}
```

**Estado:** ✅ Step 3 envía los parámetros correctos

---

### Paso 2: ProposalWriterPage.tsx

**onRegenerateDocument handler:**
```typescript
onRegenerateDocument={async (selectedSections, userComments) => {
  setIsGeneratingDocument(true)
  await handleGenerateConceptDocument({
    selectedSections,  // ["Budget & Resources"]
    userComments
  })
}}
```

**Estado:** ✅ Pasa los parámetros correctos a la función

---

### Paso 3: handleGenerateConceptDocument()

**Con logs añadidos (líneas 547-556):**
```typescript
console.log('🟢 Starting concept document generation...')
console.log('📋 Override data:', overrideData)
console.log('📋 Concept evaluation data:', conceptEvaluationData)

const evaluationData = overrideData || conceptEvaluationData

console.log('📋 Final evaluation data to use:', evaluationData)
console.log(`   Selected sections (${evaluationData?.selectedSections?.length || 0}):`, evaluationData?.selectedSections)
```

**Construcción del payload (líneas 587-591):**
```typescript
const allSectionsWithSelection = allSections.map(section => ({
  ...section,
  selected: evaluationData.selectedSections.includes(section.section),  // Aquí se marca true/false
  user_comment: evaluationData.userComments[section.section] || ''
}))
```

**Estado:** ⚠️ Necesita verificación con logs

---

## 🧪 TESTING NECESARIO

### Instrucciones para el usuario:

1. **Abrir console del browser** (F12)
2. **Ir a Step 3**
3. **Click "Edit Sections"**
4. **Seleccionar SOLO "Budget & Resources"**
5. **Click "Re-generate Concept Document"**
6. **Copiar TODOS los logs que empiecen con:**
   - `🔄 Regenerating document with:`
   - `🟢 Starting concept document generation...`
   - `📋 Override data:`
   - `📋 Final evaluation data to use:`
   - `📊 Total sections:`
   - `📤 Sending concept evaluation:`

---

## 🔎 POSIBLES CAUSAS

### Hipótesis 1: selectedSections llega vacío
**Si los logs muestran:**
```
📋 Override data: { selectedSections: [], userComments: {} }
```

**Causa:** El estado local `selectedSections` en Step3 no se está actualizando correctamente cuando el usuario marca/desmarca checkboxes.

**Fix:** Revisar `toggleSectionSelection()` en Step3StructureValidation.tsx

---

### Hipótesis 2: Nombres de secciones no coinciden
**Si los logs muestran:**
```
📋 Override data: { selectedSections: ["Budget & Resources"], userComments: {} }
📊 Total sections: 6, Selected: 0
```

**Causa:** El nombre de la sección en `selectedSections` no coincide exactamente con `section.section` en `allSections`.

**Ejemplo:**
- `selectedSections`: `["Budget & Resources"]`
- `section.section`: `"Budget and Resources"` (sin ampersand)

**Fix:** Normalizar nombres o usar ID en lugar de strings

---

### Hipótesis 3: conceptAnalysis no tiene las secciones
**Si los logs muestran:**
```
📋 Override data: { selectedSections: ["Budget & Resources"], userComments: {} }
🔍 Unwrapped concept analysis: { fit_assessment: {...}, sections_needing_elaboration: [] }
📊 Total sections: 0, Selected: 0
```

**Causa:** `conceptAnalysis` está vacío o no tiene `sections_needing_elaboration` cuando se regenera.

**Fix:** Recargar `conceptAnalysis` de DynamoDB antes de regenerar

---

## 📊 LOGS ESPERADOS (Correcto)

```
🔄 Regenerating document with:
   Selected sections: 1
   Sections: ["Budget & Resources"]
   Comments: {}

🟢 Starting concept document generation...
📋 Override data: {selectedSections: ["Budget & Resources"], userComments: {}}
📋 Concept evaluation data: {selectedSections: [...6 secciones...], userComments: {}}
📋 Final evaluation data to use: {selectedSections: ["Budget & Resources"], userComments: {}}
   Selected sections (1): ["Budget & Resources"]

🔍 Unwrapped concept analysis: {sections_needing_elaboration: [...6 secciones...]}
📊 Total sections: 6, Selected: 1

📤 Sending concept evaluation: {
  concept_analysis: {
    sections_needing_elaboration: [
      {section: "Theory of Change", selected: false},
      {section: "Budget & Resources", selected: true},  ← Solo esta en true
      {section: "M&E Framework", selected: false},
      ...
    ]
  }
}
```

---

## ✅ ARCHIVO MODIFICADO

**Frontend:**
- `ProposalWriterPage.tsx` (líneas 547-556)
  - Añadidos logs de debugging

---

## 🚀 PRÓXIMO PASO

1. **Deploy frontend** con los nuevos logs
2. **Testing:** Hacer re-generate desde Step 3
3. **Copiar logs completos** de la console
4. **Analizar** qué hipótesis es la correcta
5. **Aplicar fix** según los logs

---

**Estado:** ⏳ Esperando logs del testing

_Documento generado: 2025-11-22 22:54 UTC_
