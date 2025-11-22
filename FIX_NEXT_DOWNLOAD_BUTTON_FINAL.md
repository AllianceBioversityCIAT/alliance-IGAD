# ✅ FIX: Next & Download dispara modal ANTES del download

**Fecha:** 2025-11-22 23:22 UTC  
**Problema:** Modal aparece ANTES de que el download ocurra

---

## 🎯 DIAGNÓSTICO

**Síntoma:** Usuario hace click en "Next & Download" → Modal aparece INMEDIATAMENTE (download nunca ocurre)

**Causa:** El click del botón dispara `handleNavigateAway()` ANTES de ejecutar el `onClick` handler.

**Por qué:** Posibles causas:
1. Event bubbling/capturing intercepta el click
2. Algún listener global detecta el cambio de navegación
3. Race condition con `allowNavigation.current`

---

## 🔧 CAMBIOS APLICADOS

### Cambio 1: Botón onClick con preventDefault y stopPropagation

**Archivo:** `ProposalWriterPage.tsx` (líneas 902-928)

**Antes:**
```typescript
onClick={async () => {
  if (currentStep === 3) {
    await handleDownloadConceptDocument()
    proceedToNextStep()
  }
}}
```

**Después:**
```typescript
onClick={async (e) => {
  e.preventDefault()        // ← Previene comportamiento default
  e.stopPropagation()       // ← Detiene event bubbling
  
  console.log('🔘 Next button clicked - Step:', currentStep)
  
  if (currentStep === 3) {
    console.log('📥 Step 3: Starting download & navigation sequence')
    
    // Set allowNavigation FIRST, before anything else
    allowNavigation.current = true
    console.log('✅ allowNavigation set to TRUE')
    
    await handleDownloadConceptDocument()
    
    console.log('⏭️ Proceeding to next step...')
    proceedToNextStep()
  }
}}
```

**Beneficios:**
- `preventDefault()`: Evita cualquier comportamiento default del botón
- `stopPropagation()`: Evita que el evento suba al DOM y dispare otros listeners
- `allowNavigation.current = true` ANTES del download: Protege contra cualquier interceptación temprana

---

### Cambio 2: handleDownloadConceptDocument sin setTimeout

**Archivo:** `ProposalWriterPage.tsx` (línea 757 y 835-837)

**Antes:**
```typescript
const handleDownloadConceptDocument = async () => {
  allowNavigation.current = true  // ← Aquí
  
  try {
    // ... download ...
    
    setTimeout(() => {
      allowNavigation.current = false  // ← Resetea después de 100ms
    }, 100)
  }
}
```

**Después:**
```typescript
const handleDownloadConceptDocument = async () => {
  // NOTE: allowNavigation is now set by the caller, not here
  
  try {
    // ... download ...
    
    // NOTE: allowNavigation will be reset by the caller after navigation
  } catch (error) {
    allowNavigation.current = false  // ← Solo resetea en error
  }
}
```

**Beneficios:**
- No hay race condition con múltiples `setTimeout`
- El flag solo se resetea cuando la navegación termina, no arbitrariamente después de 100ms

---

### Cambio 3: proceedToNextStep con delay aumentado

**Archivo:** `ProposalWriterPage.tsx` (líneas 373-387)

**Antes:**
```typescript
const proceedToNextStep = useCallback(() => {
  if (currentStep < 5) {
    const nextStep = currentStep + 1
    setCurrentStep(nextStep)
    navigate(`/proposal-writer/step-${nextStep}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    setTimeout(() => {
      allowNavigation.current = false
    }, 100)  // ← 100ms
  }
}, [currentStep, navigate])
```

**Después:**
```typescript
const proceedToNextStep = useCallback(() => {
  console.log('⏭️ proceedToNextStep called - allowNavigation:', allowNavigation.current)
  
  if (currentStep < 5) {
    const nextStep = currentStep + 1
    setCurrentStep(nextStep)
    navigate(`/proposal-writer/step-${nextStep}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    setTimeout(() => {
      console.log('🔒 Resetting allowNavigation to FALSE')
      allowNavigation.current = false
    }, 500)  // ← 500ms - más tiempo para completar navegación
  }
}, [currentStep, navigate])
```

**Beneficios:**
- 500ms da tiempo suficiente para que React Router complete la navegación
- Logs ayudan a debuggear si el problema persiste

---

### Cambio 4: handleNavigateAway con verificación de allowNavigation

**Archivo:** `ProposalWriterPage.tsx` (líneas 367-369)

**Antes:**
```typescript
const handleNavigateAway = () => {
  if (proposalId) {
    setShowExitModal(true)
  }
}
```

**Después:**
```typescript
const handleNavigateAway = () => {
  console.log('🚨 handleNavigateAway called!')
  console.log('   allowNavigation.current:', allowNavigation.current)
  console.log('   proposalId:', proposalId)
  
  // Only show modal if navigation is not explicitly allowed
  if (proposalId && !allowNavigation.current) {
    console.log('   ➡️ Showing exit modal')
    setShowExitModal(true)
  } else {
    console.log('   ➡️ Navigation allowed, not showing modal')
  }
}
```

**Beneficios:**
- Verifica `allowNavigation.current` ANTES de mostrar el modal
- Logs muestran exactamente cuándo y por qué se dispara
- Si `allowNavigation.current = true`, NO muestra el modal

---

## 📋 FLUJO CORREGIDO

```
Usuario click "Next & Download"
  ↓
1. e.preventDefault() - Previene default
  ↓
2. e.stopPropagation() - Detiene bubbling
  ↓
3. allowNavigation.current = true ✅
  ↓
4. await handleDownloadConceptDocument()
   ↓
   - Construye HTML
   - Crea blob
   - Dispara download
   - Return (SIN resetear allowNavigation)
  ↓
5. proceedToNextStep()
   ↓
   - setCurrentStep(4)
   - navigate('/proposal-writer/step-4')
   ↓
   (Si se dispara handleNavigateAway aquí...)
   ↓
   - Verifica: allowNavigation.current === true ✅
   - NO muestra modal ✅
  ↓
6. setTimeout(() => allowNavigation.current = false, 500)
  ↓
✅ Usuario está en Step 4
✅ Documento descargado
✅ NO apareció modal
```

---

## 🧪 TESTING

### Test 1: Verificar logs en consola

Después del deploy, haz click en "Next & Download" y verifica estos logs:

```
🔘 Next button clicked - Step: 3
📥 Step 3: Starting download & navigation sequence
✅ allowNavigation set to TRUE
🔽 Downloading concept document...
✅ Download complete!
⏭️ Proceeding to next step...
⏭️ proceedToNextStep called - allowNavigation: true
```

**Si aparece `handleNavigateAway` en los logs:**
```
🚨 handleNavigateAway called!
   allowNavigation.current: true
   proposalId: PROP-...
   ➡️ Navigation allowed, not showing modal
```

**Esto confirma que el fix funciona correctamente.**

---

### Test 2: Verificar que NO aparece modal

1. Click "Next & Download"
2. **Verificar:** Download se inicia
3. **Verificar:** NO aparece modal de confirmación
4. **Verificar:** Navegación a Step 4 exitosa

---

### Test 3: Verificar que el modal SÍ aparece en otros casos

Para confirmar que no rompimos la funcionalidad del modal:

1. Estando en cualquier step, click en "Home" en la navbar
2. **Verificar:** SÍ debe aparecer el modal

---

## ✅ ARCHIVOS MODIFICADOS

**Frontend:**
- `ProposalWriterPage.tsx` (4 cambios):
  1. Botón onClick (líneas 902-928)
  2. handleDownloadConceptDocument (líneas 757, 835-837)
  3. proceedToNextStep (líneas 373-387)
  4. handleNavigateAway (líneas 367-376)

---

## 🚀 DEPLOY

```bash
cd igad-app/frontend
npm run build
# Deploy a S3/CloudFront
```

---

## 📊 COMPARACIÓN

| Aspecto | Antes | Después |
|---------|-------|---------|
| Event propagation | ❌ Sin control | ✅ preventDefault + stopPropagation |
| allowNavigation timing | ❌ Dentro de handleDownload | ✅ ANTES del download |
| allowNavigation reset | ❌ 100ms (muy rápido) | ✅ 500ms (más seguro) |
| handleNavigateAway | ❌ Siempre muestra modal | ✅ Verifica allowNavigation |
| Race conditions | ❌ 2 setTimeout compitiendo | ✅ 1 solo setTimeout |
| Debugging | ❌ Sin logs | ✅ Logs completos |

---

## 💡 SI EL PROBLEMA PERSISTE

Si después del deploy el modal TODAVÍA aparece, comparte los logs de la consola y sabré exactamente qué está pasando.

Los logs dirán:
- Si el onClick se está ejecutando
- Cuándo se dispara handleNavigateAway
- El valor de allowNavigation.current en cada paso

---

**Estado:** ✅ Fix aplicado - Listo para deploy y testing

_Documento generado: 2025-11-22 23:22 UTC_
