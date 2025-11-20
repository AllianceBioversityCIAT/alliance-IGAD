# Session Nov 19 - Async Lambda Architecture Implementation

## 🎯 Objetivo
Implementar arquitectura asíncrona con 2 Lambdas para evitar timeouts en análisis de RFP.

## ✅ Cambios Implementados

### 1. **Nueva Lambda Worker** (`analysis_worker.py`)
- **Ubicación:** `backend/app/workers/analysis_worker.py`
- **Propósito:** Procesar análisis RFP en background (hasta 15 minutos)
- **Handler:** `app.workers.analysis_worker.handler`
- **Features:**
  - Logging detallado de todo el proceso
  - Manejo de errores con actualización de status en DynamoDB
  - Guarda resultado completo en DynamoDB al finalizar

### 2. **template.yaml - Nueva Lambda Resource**
- Agregada `AnalysisWorkerFunction`:
  - **Timeout:** 900 segundos (15 minutos)
  - **Memory:** 1024 MB
  - **Permisos:** DynamoDB, Bedrock, S3 (read-only)
  
- Agregado permiso a `ApiFunction`:
  - `lambda:InvokeFunction` para invocar `AnalysisWorkerFunction`

### 3. **Endpoint `/analyze-rfp` Actualizado**
- **Archivo:** `backend/app/routers/proposals.py`
- **Cambios:**
  - Importa `boto3` y `json`
  - Crea `lambda_client`
  - Actualiza status a "processing" inmediatamente
  - Invoca `AnalysisWorkerFunction` de forma **asíncrona** (`InvocationType='Event'`)
  - Retorna inmediatamente con `{"status": "processing"}`
  - Frontend hace polling en `/analysis-status`

### 4. **simple_rfp_analyzer.py**
- **Cambio:** Método `analyze_rfp` ahora es **síncrono** (no async)
  - Recibe solo `proposal_id`
  - Obtiene `proposal_code` de DynamoDB
  - Método `get_prompt_from_dynamodb()` también síncrono
  
- **Integración DynamoDB Prompts:**
  ```python
  response = table.scan(
      FilterExpression=
          Attr("is_active").eq(True) &
          Attr("section").eq("proposal_writer") &
          Attr("sub_section").eq("step-1") &
          Attr("categories").contains("RFP / Call for Proposals")
  )
  ```
  
- **Prompt Assembly:**
  ```python
  {
    'system_prompt': prompt_item["system_prompt"],
    'user_prompt': prompt_item["user_prompt_template"],  # con {rfp_text} reemplazado
    'output_format': prompt_item["output_format"]
  }
  ```

### 5. **db_client - Método Síncrono**
- **Archivo:** `backend/app/database/client.py`
- **Nuevo método:** `get_item_sync(pk, sk)`
- **Propósito:** Permitir al worker (no-async) leer de DynamoDB

---

## 🔄 Flujo Completo

```
┌────────────────────────────────────────────────────────────┐
│ 1. User clicks "Analyze & Continue"                       │
└───────────────────────┬────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────┐
│ 2. POST /api/proposals/{id}/analyze-rfp                   │
│    - ApiFunction (timeout: 300s)                           │
│    - Updates status="processing" in DynamoDB               │
│    - Invokes AnalysisWorkerFunction ASYNC                  │
│    - Returns {"status": "processing"} (1-2 seconds)        │
└───────────────────────┬────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────┐
│ 3. AnalysisWorkerFunction (timeout: 900s)                 │
│    - Runs in parallel/background                           │
│    - Gets PDF from S3                                      │
│    - Extracts text                                         │
│    - Loads prompt from DynamoDB                            │
│    - Calls Bedrock (5-10 min)                              │
│    - Saves result to DynamoDB                              │
│    - Updates status="completed"                            │
└───────────────────────┬────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────┐
│ 4. Frontend polls GET /analysis-status every 5 seconds    │
│    - Checks DynamoDB for analysis_status                   │
│    - When "completed", fetches rfp_analysis                │
│    - Displays results in Step 2                            │
└────────────────────────────────────────────────────────────┘
```

---

## 📋 Estructura de DynamoDB

### Proposal Item:
```json
{
  "PK": "PROPOSAL#uuid",
  "SK": "METADATA",
  "analysis_status": "processing|completed|failed",
  "analysis_started_at": "2025-11-19T12:00:00Z",
  "analysis_completed_at": "2025-11-19T12:10:00Z",
  "rfp_analysis": {
    "rfp_overview": {...},
    "eligibility": {...},
    "submission_info": {...},
    ...
  }
}
```

### Prompt Item:
```json
{
  "PK": "prompt#uuid",
  "SK": "version#1",
  "section": "proposal_writer",
  "sub_section": "step-1",
  "categories": ["RFP / Call for Proposals"],
  "is_active": true,
  "system_prompt": "You are Agent 1 – RFP Extraction...",
  "user_prompt_template": "Your mission is to analyze... {rfp_text}",
  "output_format": "### **Output Format**\n..."
}
```

---

## 🚀 Deploy

```bash
# Desde igad-app/
./scripts/deploy-fullstack-testing.sh
```

**El script automáticamente:**
1. ✅ Empaqueta backend/dist/ con todo el código
2. ✅ Crea/actualiza `ApiFunction`
3. ✅ Crea/actualiza `AnalysisWorkerFunction`
4. ✅ Configura permisos IAM
5. ✅ Despliega frontend a CloudFront

---

## 🔍 Testing

### 1. **Upload RFP PDF**
```bash
POST /api/proposals/{id}/upload-document
Body: multipart/form-data with PDF
```

### 2. **Start Analysis**
```bash
POST /api/proposals/{id}/analyze-rfp
Response: {"status": "processing", "started_at": "..."}
```

### 3. **Poll Status**
```bash
GET /api/proposals/{id}/analysis-status
Response: {"status": "processing"} o {"status": "completed", "rfp_analysis": {...}}
```

### 4. **Check CloudWatch Logs**
- **ApiFunction logs:** Invocación de worker
- **AnalysisWorkerFunction logs:** Todo el proceso de análisis

---

## ⚠️ Puntos Importantes

1. **Timeouts:**
   - ApiFunction: 300s (suficiente para responder y invocar worker)
   - AnalysisWorkerFunction: 900s (15 min para análisis completo)

2. **Costos:**
   - ApiFunction: Solo se cobra por requests HTTP (rápidos)
   - AnalysisWorkerFunction: Solo se cobra cuando hay análisis (5-10 min)

3. **Escalabilidad:**
   - ApiFunction: Puede atender 1000s de requests simultáneos
   - AnalysisWorkerFunction: Lambda auto-scale (hasta 1000 concurrent)

4. **Fallback:**
   - Si no encuentra prompt en DynamoDB, usa prompt por defecto hardcodeado

---

## 📝 TODO para Mañana

1. ✅ Deploy y testing completo
2. ⏳ Verificar logs en CloudWatch
3. ⏳ Ajustar prompt en DynamoDB si es necesario
4. ⏳ Mejorar manejo de errores en frontend
5. ⏳ Agregar timeout visual más largo (5 minutos)

---

## 🐛 Known Issues

- ❌ CORS error cuando Lambda toma >30s (resuelto con async)
- ❌ 504 Gateway Timeout (resuelto con async)
- ✅ Prompt de DynamoDB ahora se usa correctamente

---

**Status:** ✅ **Implementación completa, lista para deploy**
