# 🚀 INSTRUCCIONES DE MIGRACIÓN PARA KIRO

## FASE 1: BACKEND - Crear Estructura Base

### Paso 1: Crear carpetas de herramientas (tools)

```bash
cd igad-app/backend/app

# Crear estructura de tools
mkdir -p tools/proposal_writer/{rfp_analysis,concept_evaluation,document_generation,workflow}
mkdir -p tools/newsletter_generator
mkdir -p tools/report_generator  
mkdir -p tools/policy_analyzer
mkdir -p tools/agribusiness_hub
mkdir -p tools/admin/{settings,prompts_manager}
mkdir -p tools/auth

# Crear __init__.py en cada carpeta
touch tools/__init__.py
touch tools/proposal_writer/__init__.py
touch tools/proposal_writer/rfp_analysis/__init__.py
touch tools/proposal_writer/concept_evaluation/__init__.py
touch tools/proposal_writer/document_generation/__init__.py
touch tools/proposal_writer/workflow/__init__.py
touch tools/newsletter_generator/__init__.py
touch tools/report_generator/__init__.py
touch tools/policy_analyzer/__init__.py
touch tools/agribusiness_hub/__init__.py
touch tools/admin/__init__.py
touch tools/admin/settings/__init__.py
touch tools/admin/prompts_manager/__init__.py
touch tools/auth/__init__.py
```

### Paso 2: Crear carpeta shared

```bash
cd igad-app/backend/app

# Crear estructura shared
mkdir -p shared/{aws,database,ai,schemas,utils}

# Crear __init__.py
touch shared/__init__.py
touch shared/aws/__init__.py
touch shared/database/__init__.py
touch shared/ai/__init__.py
touch shared/schemas/__init__.py
touch shared/utils/__init__.py
```

### Paso 3: Mover archivos existentes a shared

```bash
cd igad-app/backend/app

# Mover servicios AWS
mv services/s3_service.py shared/aws/
mv services/dynamodb_service.py shared/database/

# Mover AI service
mv services/ai_service.py shared/ai/

# Mover models a schemas
cp -r models/* shared/schemas/
```

### Paso 4: Mover archivos de Proposal Writer

```bash
cd igad-app/backend/app

# Mover routers
mv routers/proposals.py tools/proposal_writer/routes.py

# Mover services
mv services/rfp_analyzer.py tools/proposal_writer/rfp_analysis/service.py
mv services/concept_analyzer.py tools/proposal_writer/concept_evaluation/service.py
mv services/concept_document_generator.py tools/proposal_writer/document_generation/service.py

# Mover workers
mv workers/analysis_worker.py tools/proposal_writer/workflow/worker.py
```

### Paso 5: Crear archivos de configuración en cada feature

```bash
# RFP Analysis
cat > tools/proposal_writer/rfp_analysis/config.py << 'EOF'
"""RFP Analysis configuration"""

RFP_ANALYSIS_SETTINGS = {
    "max_pages": 100,
    "timeout": 300,
    "model": "claude-3-5-sonnet-20241022"
}
EOF

# Concept Evaluation  
cat > tools/proposal_writer/concept_evaluation/config.py << 'EOF'
"""Concept Evaluation configuration"""

CONCEPT_EVALUATION_SETTINGS = {
    "max_sections": 20,
    "timeout": 300,
    "model": "claude-3-5-sonnet-20241022"
}
EOF

# Document Generation
cat > tools/proposal_writer/document_generation/config.py << 'EOF'
"""Document Generation configuration"""

DOCUMENT_GENERATION_SETTINGS = {
    "max_retries": 3,
    "timeout": 300,
    "model": "claude-3-5-sonnet-20241022"
}
EOF
```

### Paso 6: Actualizar imports en main.py

```bash
cat > igad-app/backend/app/main.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

# Import tool routers
from tools.proposal_writer.routes import router as proposal_writer_router
# from tools.newsletter_generator.routes import router as newsletter_router
# from tools.report_generator.routes import router as report_router
# from tools.policy_analyzer.routes import router as policy_router
# from tools.agribusiness_hub.routes import router as agribusiness_router
# from tools.admin.settings.routes import router as settings_router
# from tools.admin.prompts_manager.routes import router as prompts_router
# from tools.auth.routes import router as auth_router

app = FastAPI(title="IGAD Alliance API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register tool routers
app.include_router(proposal_writer_router, prefix="/api/proposal-writer", tags=["Proposal Writer"])
# app.include_router(newsletter_router, prefix="/api/newsletter", tags=["Newsletter"])
# app.include_router(report_router, prefix="/api/report", tags=["Report"])
# app.include_router(policy_router, prefix="/api/policy", tags=["Policy"])
# app.include_router(agribusiness_router, prefix="/api/agribusiness", tags=["Agribusiness"])
# app.include_router(settings_router, prefix="/api/admin/settings", tags=["Settings"])
# app.include_router(prompts_router, prefix="/api/admin/prompts", tags=["Prompts"])
# app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])

@app.get("/health")
def health_check():
    return {"status": "healthy"}

handler = Mangum(app)
EOF
```

---

## FASE 2: FRONTEND - Crear Estructura Base

### Paso 1: Crear carpetas de herramientas

```bash
cd igad-app/frontend/src

# Crear estructura de tools
mkdir -p tools/proposal-writer/{rfp-analysis,concept-evaluation,document-generation,workflow}
mkdir -p tools/newsletter-generator
mkdir -p tools/report-generator
mkdir -p tools/policy-analyzer
mkdir -p tools/agribusiness-hub
mkdir -p tools/admin/{settings,prompts-manager}
mkdir -p tools/auth

# Crear index.ts en cada carpeta principal
touch tools/proposal-writer/index.ts
touch tools/newsletter-generator/index.ts
touch tools/report-generator/index.ts
touch tools/policy-analyzer/index.ts
touch tools/agribusiness-hub/index.ts
touch tools/admin/index.ts
touch tools/auth/index.ts
```

### Paso 2: Crear carpeta shared

```bash
cd igad-app/frontend/src

# Crear estructura shared
mkdir -p shared/{components,hooks,api,types,utils,contexts}

# Crear index.ts
touch shared/index.ts
touch shared/components/index.ts
touch shared/hooks/index.ts
touch shared/api/index.ts
touch shared/types/index.ts
touch shared/utils/index.ts
touch shared/contexts/index.ts
```

### Paso 3: Mover componentes compartidos a shared

```bash
cd igad-app/frontend/src

# Mover componentes reutilizables
mv components/ui/* shared/components/ 2>/dev/null || true

# Mover hooks globales
mv hooks/* shared/hooks/ 2>/dev/null || true

# Mover utils
mv lib/utils.ts shared/utils/ 2>/dev/null || true
```

### Paso 4: Mover archivos de Proposal Writer

```bash
cd igad-app/frontend/src

# Mover páginas
mv app/proposal-writer/* tools/proposal-writer/ 2>/dev/null || true

# Crear estructura de features dentro de proposal-writer
mkdir -p tools/proposal-writer/rfp-analysis/{components,hooks,types}
mkdir -p tools/proposal-writer/concept-evaluation/{components,hooks,types}
mkdir -p tools/proposal-writer/document-generation/{components,hooks,types}
mkdir -p tools/proposal-writer/workflow/{components,hooks,types}
```

### Paso 5: Actualizar rutas en App.tsx

```bash
cat > igad-app/frontend/src/App.tsx << 'EOF'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProposalWriter from './tools/proposal-writer';
// import NewsletterGenerator from './tools/newsletter-generator';
// import ReportGenerator from './tools/report-generator';
// import PolicyAnalyzer from './tools/policy-analyzer';
// import AgribusinessHub from './tools/agribusiness-hub';
// import Settings from './tools/admin/settings';
// import PromptsManager from './tools/admin/prompts-manager';
// import Login from './tools/auth/Login';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/proposal-writer/*" element={<ProposalWriter />} />
        {/* <Route path="/newsletter/*" element={<NewsletterGenerator />} /> */}
        {/* <Route path="/report/*" element={<ReportGenerator />} /> */}
        {/* <Route path="/policy/*" element={<PolicyAnalyzer />} /> */}
        {/* <Route path="/agribusiness/*" element={<AgribusinessHub />} /> */}
        {/* <Route path="/admin/settings" element={<Settings />} /> */}
        {/* <Route path="/admin/prompts" element={<PromptsManager />} /> */}
        {/* <Route path="/login" element={<Login />} /> */}
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>
    </Router>
  );
}

export default App;
EOF
```

---

## VERIFICACIÓN

### Backend
```bash
cd igad-app/backend/app
tree -L 3 tools/
tree -L 2 shared/
```

### Frontend
```bash
cd igad-app/frontend/src
tree -L 3 tools/
tree -L 2 shared/
```

---

## SIGUIENTE PASO

Una vez completada la estructura:
1. ✅ Verificar que todos los archivos se movieron correctamente
2. ✅ Actualizar imports en los archivos movidos
3. ✅ Correr tests para verificar que nada se rompió
4. ✅ Hacer commit de la nueva estructura

---

## NOTAS IMPORTANTES

- ⚠️ **NO eliminar** las carpetas antiguas todavía (routers/, services/, workers/)
- ⚠️ Los archivos se **copian primero** para mantener backup
- ⚠️ Actualizar imports gradualmente
- ⚠️ Testear después de cada movimiento importante

---

## COMANDOS RESUMIDOS

```bash
# BACKEND
cd igad-app/backend/app && \
mkdir -p tools/proposal_writer/{rfp_analysis,concept_evaluation,document_generation,workflow} && \
mkdir -p tools/{newsletter_generator,report_generator,policy_analyzer,agribusiness_hub} && \
mkdir -p tools/admin/{settings,prompts_manager} && \
mkdir -p tools/auth && \
mkdir -p shared/{aws,database,ai,schemas,utils} && \
find tools -type d -exec touch {}/__init__.py \; && \
find shared -type d -exec touch {}/__init__.py \;

# FRONTEND
cd igad-app/frontend/src && \
mkdir -p tools/proposal-writer/{rfp-analysis,concept-evaluation,document-generation,workflow} && \
mkdir -p tools/{newsletter-generator,report-generator,policy-analyzer,agribusiness-hub} && \
mkdir -p tools/admin/{settings,prompts-manager} && \
mkdir -p tools/auth && \
mkdir -p shared/{components,hooks,api,types,utils,contexts}
```

---

¿Listo para ejecutar con KIRO? 🚀
