# 🔍 ANÁLISIS: Botón "Next & Download" muestra modal de confirmación

**Fecha:** 2025-11-22 23:17 UTC  
**Problema:** Al hacer click en "Next & Download" aparece el modal "You have an unsaved draft"

---

## 🎯 COMPORTAMIENTO ACTUAL

**Usuario:**
1. Está en Step 3
2. Click botón "Next & Download"
3. **Resultado:** Aparece modal "You have an unsaved draft..."

**Comportamiento esperado:**
1. Click "Next & Download"
2. Download del documento
3. Navegar a Step 4
4. NO mostrar modal

---

## 📋 CÓDIGO DEL BOTÓN

**Archivo:** `ProposalWriterPage.tsx` (líneas 902-954)

```typescript
<button
  key="next"
  onClick={async () => {
    if (currentStep === 2) {
      handleGenerateConceptDocument()
    } else if (currentStep === 3) {
      // Download first, then navigate
      await handleDownloadConceptDocument()  // ← Línea 910
      // allowNavigation is already set to true inside handleDownloadConceptDocument
      proceedToNextStep()  // ← Línea 912
    } else {
      handleNextStep()
    }
  }}
>
  {currentStep === 3 ? (
    <>
      Next & Download
      <ChevronRight size={16} />
    </>
  ) : ...}
</button>
```

---

## 🔍 FLUJO DE EJECUCIÓN

### Paso 1: handleDownloadConceptDocument()

**Línea 753-842:**

```typescript
const handleDownloadConceptDocument = async () => {
  console.log('🔽 Downloading concept document...')
  
  // Allow navigation to prevent modal
  allowNavigation.current = true  // ← Línea 757
  
  try {
    // ... construye el HTML ...
    
    // Create blob and download
    const blob = new Blob([fullHtml], { type: 'text/html' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `concept-document-${proposalCode || 'draft'}.html`
    document.body.appendChild(a)
    a.click()  // ← SÍNCRONO - dispara download inmediatamente
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    console.log('✅ Download complete!')
    
    // Reset navigation flag
    setTimeout(() => {
      allowNavigation.current = false  // ← Línea 835
    }, 100)
  } catch (error) {
    allowNavigation.current = false
  }
}
```

**Estado después de ejecutar:**
- `allowNavigation.current = true` ✅
- Download iniciado ✅
- Después de 100ms: `allowNavigation.current = false` ❌

---

### Paso 2: proceedToNextStep()

**Línea 373-384:**

```typescript
const proceedToNextStep = useCallback(() => {
  if (currentStep < 5) {
    const nextStep = currentStep + 1
    setCurrentStep(nextStep)
    navigate(`/proposal-writer/step-${nextStep}`)  // ← Navega a step-4
    window.scrollTo({ top: 0, behavior: 'smooth' })
    // Reset allowNavigation after navigation completes
    setTimeout(() => {
      allowNavigation.current = false  // ← Resetea a false de nuevo
    }, 100)
  }
}, [currentStep, navigate])
```

**Estado después de ejecutar:**
- Navega a `/proposal-writer/step-4`
- Después de 100ms: `allowNavigation.current = false`

---

## 🤔 ¿DÓNDE SE DISPARA EL MODAL?

El modal se muestra en estas situaciones:

### 1. Browser back button (popstate)

**Línea 297-304:**

```typescript
const handlePopState = (e: PopStateEvent) => {
  window.history.pushState(null, '', window.location.pathname)
  setShowExitModal(true)  // ← Muestra modal
  setPendingNavigation(-1 as any)
}
```

**¿Se dispara con "Next & Download"?** NO - `popstate` solo se dispara con back/forward del browser.

---

### 2. Click en link externo (ProposalLayout)

**ProposalLayout.tsx línea 30-48:**

```typescript
const handleNavClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  const link = target.closest('a[href]')
  
  if (link && link instanceof HTMLAnchorElement) {
    const href = link.getAttribute('href')
    
    // Check if navigating away from proposal writer
    if (href && !href.startsWith('/proposal-writer') && onNavigateAway) {
      e.preventDefault()
      onNavigateAway()  // ← Muestra modal
    }
  }
}
```

**¿Se dispara con "Next & Download"?** NO - El botón es `<button>`, no `<a href>`.

---

### 3. Cerrar pestaña/recargar (beforeunload)

**Línea 315-322:**

```typescript
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (proposalId) {
    e.preventDefault()
    e.returnValue = ''  // ← Browser muestra su propio modal
  }
}
```

**¿Se dispara con "Next & Download"?** NO - Solo cuando cierras la pestaña.

---

## ❓ PREGUNTA CRÍTICA

**¿Cuándo exactamente aparece el modal?**

1. **ANTES del download** → Modal bloquea el click
2. **DURANTE el download** → Modal aparece mientras descarga
3. **DESPUÉS del download** → Modal aparece al navegar a Step 4

Por favor confirma cuál es el caso, porque cada uno tiene una solución diferente.

---

## 🔬 DEBUGGING NECESARIO

### Test 1: Verificar si el download ocurre

Abre la consola del browser y haz click en "Next & Download". Busca estos logs:

```
🔽 Downloading concept document...
✅ Download complete!
```

**Si VES estos logs:** El download sí ocurre, el problema es DESPUÉS.  
**Si NO VES estos logs:** El click está siendo bloqueado ANTES.

---

### Test 2: Verificar timing del modal

Añade este log temporal en `proceedToNextStep()`:

```typescript
const proceedToNextStep = useCallback(() => {
  console.log('⏭️ proceedToNextStep called - allowNavigation:', allowNavigation.current)
  
  if (currentStep < 5) {
    const nextStep = currentStep + 1
    setCurrentStep(nextStep)
    navigate(`/proposal-writer/step-${nextStep}`)
    ...
  }
}, [currentStep, navigate])
```

**Si el log muestra `allowNavigation: true`:** El problema NO es el flag.  
**Si el log muestra `allowNavigation: false`:** El flag se resetó antes de tiempo.

---

### Test 3: Verificar qué dispara el modal

Añade log en `handleNavigateAway()`:

```typescript
const handleNavigateAway = () => {
  console.log('🚨 handleNavigateAway called!')
  console.trace()  // ← Muestra stack trace
  
  if (proposalId) {
    setShowExitModal(true)
  }
}
```

**Esto te dirá EXACTAMENTE qué código está disparando el modal.**

---

## 💡 POSIBLES CAUSAS

### Hipótesis 1: Race condition con setTimeout

Los dos `setTimeout(..., 100)` pueden causar una race condition:

1. `handleDownloadConceptDocument()` → `setTimeout(() => allowNavigation.current = false, 100)`
2. `proceedToNextStep()` → `setTimeout(() => allowNavigation.current = false, 100)`

Si `proceedToNextStep()` se ejecuta MUY rápido, ambos timeouts están corriendo y uno puede resetear el flag en mal momento.

**Solución:** No usar `setTimeout`, usar una flag más robusta.

---

### Hipótesis 2: El botón dispara algún evento adicional

El click en el botón puede estar disparando algún event listener global que intercepta la navegación.

**Solución:** Añadir `e.stopPropagation()` al click del botón.

---

### Hipótesis 3: React Router intercepta la navegación

React Router puede tener un "blocker" activo que intercepta todas las navegaciones.

**Solución:** Verificar si hay un `useBlocker()` o `unstable_useBlocker()` en algún lugar del código.

---

## 🔧 SOLUCIONES PROPUESTAS

### Solución 1: Usar una flag más robusta (RECOMENDADA)

**Problema:** `allowNavigation.current` se resetea con `setTimeout`.

**Fix:**

```typescript
// En handleDownloadConceptDocument:
const handleDownloadConceptDocument = async () => {
  console.log('🔽 Downloading concept document...')
  
  try {
    // ... código de download ...
    
    console.log('✅ Download complete!')
    
    // NO resetear el flag aquí
    // El flag se reseteará después de la navegación completa
  } catch (error) {
    console.error('❌ Download failed:', error)
    alert('Failed to download document')
  }
}

// En el botón:
onClick={async () => {
  if (currentStep === 3) {
    allowNavigation.current = true  // ← Activar ANTES del download
    await handleDownloadConceptDocument()
    proceedToNextStep()
    // Resetear después de que la navegación se complete
    setTimeout(() => {
      allowNavigation.current = false
    }, 500)  // ← Más tiempo para asegurar
  }
}}
```

---

### Solución 2: Separar download y navegación (MÁS SIMPLE)

**Cambiar el botón a solo "Next" y que el download sea automático al entrar a Step 4.**

```typescript
// Step 3: Botón solo dice "Next"
else if (currentStep === 3) {
  proceedToNextStep()
}

// Step 4: Hacer download automáticamente al entrar
useEffect(() => {
  if (currentStep === 4 && !hasDownloadedDocument) {
    handleDownloadConceptDocument()
    setHasDownloadedDocument(true)
  }
}, [currentStep])
```

---

### Solución 3: Usar el botón de download existente

**Cambiar UX:** El usuario hace click en "Download Document" primero, LUEGO click en "Next".

Esto es más seguro y evita problemas de timing.

---

## 🧪 TESTING POST-FIX

1. Click "Next & Download"
2. **Verificar:** Download se inicia inmediatamente
3. **Verificar:** NO aparece modal de confirmación
4. **Verificar:** Navega a Step 4 automáticamente
5. **Verificar:** Archivo descargado correctamente

---

## 📊 COMPARACIÓN DE SOLUCIONES

| Solución | Complejidad | UX | Confiabilidad |
|----------|-------------|-----|---------------|
| 1. Flag robusta | Media | ⭐⭐⭐ Excelente | ⭐⭐⭐ Alta |
| 2. Download en Step 4 | Baja | ⭐⭐ Buena | ⭐⭐⭐ Muy alta |
| 3. Dos botones separados | Baja | ⭐ Regular | ⭐⭐⭐ Muy alta |

---

**Recomendación:** Implementar **Solución 1** (flag robusta) porque mantiene el UX deseado de un solo click.

---

**Estado:** ⏳ Esperando confirmación del usuario sobre el timing del modal

_Documento generado: 2025-11-22 23:17 UTC_
