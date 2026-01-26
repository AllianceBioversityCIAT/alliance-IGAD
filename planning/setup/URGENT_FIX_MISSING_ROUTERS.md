# 🚨 URGENT FIX - Missing Routers

## ❌ PROBLEMA

Después del cleanup, `main.py` importa módulos que ya no existen:

```python
from .routers import admin, auth, health, prompts, documents
```

Pero el directorio `routers/` fue eliminado.

## 🔍 ANÁLISIS

### Archivos que necesitamos recuperar del backup:

1. `routers/admin.py` → `tools/admin/settings/routes.py`
2. `routers/auth.py` → `tools/auth/routes.py`  
3. `routers/health.py` → `shared/health/routes.py`
4. `routers/prompts.py` → `tools/admin/prompts_manager/routes.py`
5. `routers/documents.py` → `shared/documents/routes.py`

## 📋 INSTRUCCIONES PARA KIRO

### Paso 1: Extraer archivos del backup

```bash
cd ~/backups
tar -xzf old_structure_backup_20251124_192400.tar.gz -C /tmp/restore
```

### Paso 2: Identificar qué archivos necesitamos

```bash
ls /tmp/restore/routers/
# Esperamos ver: admin.py, auth.py, health.py, prompts.py, documents.py, __init__.py
```

### Paso 3: Mover archivos a nueva estructura

```bash
# Admin/Settings
mkdir -p igad-app/backend/app/tools/admin/settings
cp /tmp/restore/routers/admin.py igad-app/backend/app/tools/admin/settings/routes.py

# Auth
mkdir -p igad-app/backend/app/tools/auth
cp /tmp/restore/routers/auth.py igad-app/backend/app/tools/auth/routes.py

# Health (shared)
mkdir -p igad-app/backend/app/shared/health
cp /tmp/restore/routers/health.py igad-app/backend/app/shared/health/routes.py

# Documents (shared)
mkdir -p igad-app/backend/app/shared/documents
cp /tmp/restore/routers/documents.py igad-app/backend/app/shared/documents/routes.py

# Prompts ya existe en: tools/admin/prompts_manager/
# Verificar si necesita routes.py
ls igad-app/backend/app/tools/admin/prompts_manager/
```

### Paso 4: Crear __init__.py files

```bash
touch igad-app/backend/app/tools/admin/settings/__init__.py
touch igad-app/backend/app/shared/health/__init__.py
touch igad-app/backend/app/shared/documents/__init__.py
```

### Paso 5: Actualizar main.py

Reemplazar:
```python
from .routers import admin, auth, health, prompts, documents
```

Con:
```python
from .tools.admin.settings import routes as admin_routes
from .tools.auth import routes as auth_routes
from .shared.health import routes as health_routes
from .tools.admin.prompts_manager import routes as prompts_routes
from .shared.documents import routes as documents_routes
```

Y actualizar los `include_router`:
```python
app.include_router(health_routes.router)
app.include_router(auth_routes.router)
app.include_router(proposal_writer_routes.router)
app.include_router(documents_routes.router)
app.include_router(admin_routes.router)
app.include_router(prompts_routes.router)
app.include_router(admin_prompts_router)
```

### Paso 6: Verificar imports en los archivos movidos

Cada archivo `routes.py` puede tener imports que necesitan actualizarse.

Por ejemplo, si `admin.py` tenía:
```python
from ..services.cognito_service import CognitoService
```

Debe cambiarse a:
```python
from ...shared.auth.cognito_service import CognitoService
```

### Paso 7: Build y test

```bash
cd igad-app/backend
sam build --use-container
```

### Paso 8: Limpiar archivos temporales

```bash
rm -rf /tmp/restore
```

## ✅ CHECKLIST

- [ ] Backup extraído
- [ ] Archivos identificados
- [ ] admin.py → tools/admin/settings/routes.py
- [ ] auth.py → tools/auth/routes.py
- [ ] health.py → shared/health/routes.py
- [ ] documents.py → shared/documents/routes.py
- [ ] prompts.py verificado
- [ ] __init__.py creados
- [ ] main.py actualizado
- [ ] Imports internos actualizados
- [ ] SAM build exitoso
- [ ] Pruebas de endpoints

## 📊 RESULTADO ESPERADO

```
app/
├── tools/
│   ├── proposal_writer/
│   │   └── routes.py ✅
│   ├── auth/
│   │   └── routes.py ✅ (restaurado)
│   └── admin/
│       ├── settings/
│       │   └── routes.py ✅ (restaurado)
│       └── prompts_manager/
│           └── routes.py ✅
├── shared/
│   ├── health/
│   │   └── routes.py ✅ (restaurado)
│   └── documents/
│       └── routes.py ✅ (restaurado)
└── main.py ✅ (actualizado)
```
