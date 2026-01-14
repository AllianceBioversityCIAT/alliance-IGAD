# DynamoDB History Tracking System

## 📋 Overview

Sistema completo de historial para rastrear todas las operaciones en DynamoDB, especialmente diseñado para evitar la pérdida de datos como los prompts 1.1 y 1.2.

## 🎯 Características

- ✅ **Rastreo automático** de operaciones CREATE, UPDATE, DELETE, READ
- ✅ **Estados antes/después** para auditoría completa
- ✅ **Información de usuario** y timestamp
- ✅ **API REST** para consultar historial
- ✅ **Limpieza automática** de registros antiguos
- ✅ **Decorador simple** para integración fácil

## 🏗️ Estructura de Datos

### Registro de Historial
```json
{
  "PK": "HISTORY#PROMPT#prompt-id",
  "SK": "OPERATION#2025-12-16T20:30:00Z#DELETE",
  "history_id": "2025-12-16T20:30:00Z#DELETE#prompt-id",
  "operation_type": "DELETE",
  "resource_type": "PROMPT",
  "resource_id": "prompt-id",
  "timestamp": "2025-12-16T20:30:00Z",
  "user_id": "admin@igad.org",
  "before_state": {
    "name": "Prompt 1.1",
    "version": "1.1",
    "status": "active"
  },
  "after_state": null,
  "metadata": {
    "function": "delete_prompt",
    "success": true
  }
}
```

## 🚀 Uso Rápido

### 1. Con Decorador (Recomendado)
```python
from app.shared.database.history_decorator import track_history

@track_history(
    resource_type="PROMPT",
    get_resource_id=lambda args, kwargs: args[0],  # primer argumento
    get_user_id=lambda args, kwargs: kwargs.get("user_id", "system")
)
def delete_prompt(prompt_id: str, user_id: str = None):
    # Tu lógica existente aquí
    pass
```

### 2. Manual (Para Control Completo)
```python
from app.shared.database.history_service import history_service

# Antes de la operación
before_state = get_current_prompt_state(prompt_id)

# Realizar operación
result = delete_prompt_from_db(prompt_id)

# Registrar en historial
history_service.log_operation(
    operation_type="DELETE",
    resource_type="PROMPT",
    resource_id=prompt_id,
    user_id="admin@igad.org",
    before_state=before_state,
    metadata={"reason": "cleanup"}
)
```

## 📡 API Endpoints

### Ver Historial de un Recurso
```bash
GET /api/history/resource/PROMPT/prompt-1.1?limit=50
```

### Ver Operaciones Recientes
```bash
GET /api/history/recent?resource_type=PROMPT&limit=100
```

### Estadísticas
```bash
GET /api/history/stats
```

### Limpiar Historial Antiguo
```bash
POST /api/history/cleanup?days_to_keep=90
```

## 🔧 Integración en Servicios Existentes

### Paso 1: Importar el Decorador
```python
from app.shared.database.history_decorator import track_history
```

### Paso 2: Aplicar a Funciones Críticas
```python
@track_history("PROMPT", get_resource_id=lambda args, kwargs: args[0])
def create_prompt(prompt_id, data):
    # Código existente sin cambios
    pass

@track_history("PROMPT", get_resource_id=lambda args, kwargs: args[0])
def update_prompt(prompt_id, updates):
    # Código existente sin cambios
    pass

@track_history("PROMPT", get_resource_id=lambda args, kwargs: args[0])
def delete_prompt(prompt_id):
    # Código existente sin cambios
    pass
```

## 🔍 Casos de Uso

### 1. Investigar Eliminaciones Misteriosas
```python
# Ver historial de un prompt específico
history = history_service.get_resource_history("PROMPT", "prompt-1.1")

for record in history:
    if record["operation_type"] == "DELETE":
        print(f"Eliminado por: {record['user_id']}")
        print(f"Fecha: {record['timestamp']}")
        print(f"Estado antes: {record['before_state']}")
```

### 2. Auditoría de Cambios
```python
# Ver todas las operaciones recientes
recent = history_service.get_recent_operations("PROMPT", limit=100)

for record in recent:
    print(f"{record['timestamp']}: {record['operation_type']} by {record['user_id']}")
```

### 3. Recuperar Datos Perdidos
```python
# Encontrar el último estado antes de eliminación
history = history_service.get_resource_history("PROMPT", "prompt-1.1")
delete_record = next(r for r in history if r["operation_type"] == "DELETE")
last_state = delete_record["before_state"]

# Usar last_state para recrear el prompt
```

## ⚙️ Configuración

### Variables de Entorno
```bash
TABLE_NAME=igad-testing-main-table  # Tabla principal de DynamoDB
```

### Limpieza Automática (Opcional)
```python
# En un cron job o Lambda programado
history_service.cleanup_old_history(days_to_keep=90)
```

## 🛡️ Seguridad

- **Datos sensibles**: Automáticamente redactados (passwords, tokens, etc.)
- **Límite de tamaño**: Textos largos se truncan automáticamente
- **Acceso controlado**: Solo usuarios autorizados pueden ver historial

## 📊 Monitoreo

### Dashboard de Estadísticas
```bash
curl GET /api/history/stats
```

Respuesta:
```json
{
  "total_operations": 1250,
  "operation_types": {
    "CREATE": 400,
    "UPDATE": 600,
    "DELETE": 200,
    "READ": 50
  },
  "resource_types": {
    "PROMPT": 800,
    "PROPOSAL": 450
  },
  "top_users": {
    "admin@igad.org": 500,
    "user@igad.org": 300
  }
}
```

## 🚨 Alertas Recomendadas

1. **Eliminaciones masivas**: > 10 DELETE en 1 hora
2. **Usuario sospechoso**: > 100 operaciones por usuario/día
3. **Fallos frecuentes**: > 5% de operaciones fallidas

## 🔄 Migración

Para servicios existentes:

1. **Instalar**: Copiar archivos del sistema de historial
2. **Importar**: Agregar imports necesarios
3. **Decorar**: Aplicar `@track_history` a funciones críticas
4. **Probar**: Verificar que el historial se registra correctamente
5. **Monitorear**: Usar API para verificar funcionamiento

## 📝 Ejemplo Completo

Ver `service_with_history.py` para un ejemplo completo de integración.

## ❓ Troubleshooting

### Problema: Historial no se registra
- Verificar que `TABLE_NAME` esté configurado
- Verificar permisos de DynamoDB
- Revisar logs de la aplicación

### Problema: Demasiados registros de historial
- Configurar limpieza automática
- Ajustar `days_to_keep` según necesidades
- Considerar archivado a S3 para historial muy antiguo

### Problema: Performance impactado
- El historial se registra de forma asíncrona
- Si hay problemas, el historial falla silenciosamente sin afectar la operación principal
- Considerar usar DynamoDB Streams para historial en tiempo real
