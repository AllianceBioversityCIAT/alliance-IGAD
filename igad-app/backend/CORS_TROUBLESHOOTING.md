# Troubleshooting CORS Error

## Problema Actual
```
Access to fetch at 'https://c37x0xp38k.execute-api.us-east-1.amazonaws.com/prod/api/auth/login' 
from origin 'https://test-igad-hub.alliance.cgiar.org' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Diagnóstico

### 1. Verificar Variables de Entorno en Lambda

Ejecuta este comando para verificar que las variables estén configuradas:

```bash
# Obtener el nombre de la función Lambda
FUNCTION_NAME=$(aws cloudformation describe-stack-resources \
  --stack-name igad-backend-testing \
  --profile IBD-DEV \
  --region us-east-1 \
  --query "StackResources[?ResourceType=='AWS::Lambda::Function'].PhysicalResourceId" \
  --output text | head -1)

# Verificar variables de entorno
aws lambda get-function-configuration \
  --function-name $FUNCTION_NAME \
  --profile IBD-DEV \
  --region us-east-1 \
  --query 'Environment.Variables' \
  --output json
```

Deberías ver:
```json
{
  "ENVIRONMENT": "testing",
  "CORS_ALLOWED_ORIGINS": "https://igad-innovation-hub.com,https://www.igad-innovation-hub.com,https://test-igad-hub.alliance.cgiar.org",
  ...
}
```

### 2. Verificar Configuración de API Gateway

El API Gateway tiene su propia configuración de CORS que puede estar interfiriendo. Verifica en la consola de AWS:

1. Ve a API Gateway Console
2. Busca el API `igad-backend-testing`
3. Verifica la configuración de CORS en el recurso `/api/{proxy+}`

### 3. Problema Común: API Gateway CORS vs FastAPI CORS

**El problema**: API Gateway maneja las requests OPTIONS (preflight) antes de que lleguen a Lambda. Si API Gateway no está configurado correctamente, nunca llegará a FastAPI.

**Solución temporal**: Asegúrate de que API Gateway tenga `AllowOrigin: "'*'"` en `template.yaml` (ya está configurado).

### 4. Verificar Logs de Lambda

Revisa los logs de CloudWatch para ver si hay errores:

```bash
# Ver logs recientes
aws logs tail /aws/lambda/igad-backend-testing-ApiFunction-XXXXX \
  --follow \
  --profile IBD-DEV \
  --region us-east-1
```

Busca mensajes relacionados con CORS o errores de middleware.

### 5. Probar Request Manual

Prueba hacer un request OPTIONS (preflight) manualmente:

```bash
curl -X OPTIONS \
  https://c37x0xp38k.execute-api.us-east-1.amazonaws.com/prod/api/auth/login \
  -H "Origin: https://test-igad-hub.alliance.cgiar.org" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v
```

Deberías ver headers como:
```
Access-Control-Allow-Origin: https://test-igad-hub.alliance.cgiar.org
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS,PATCH
Access-Control-Allow-Headers: Content-Type,Authorization,X-Request-ID
```

## Soluciones Aplicadas

### ✅ Cambio 1: Lógica de CORS en main.py
- Ahora verifica `ENVIRONMENT in ["production", "testing"]` en lugar de solo `== "production"`
- Esto permite que el entorno de testing use los orígenes configurados

### ✅ Cambio 2: Variables en template.yaml
- Agregado `ENVIRONMENT: testing`
- Agregado `CORS_ALLOWED_ORIGINS` con el dominio de test

### ✅ Cambio 3: API Gateway CORS
- `AllowOrigin: "'*'"` (permite todos los orígenes a nivel de API Gateway)
- `AllowCredentials: true`
- Métodos y headers actualizados

## Próximos Pasos

1. **Redesplegar el backend**:
   ```bash
   ./scripts/deploy-fullstack-testing.sh --backend-only
   ```

2. **Verificar que las variables estén configuradas** (usar comando arriba)

3. **Si el problema persiste**, puede ser que:
   - API Gateway esté cacheando la configuración antigua
   - Necesites invalidar/actualizar manualmente la configuración de CORS en API Gateway Console
   - CloudFront esté cacheando las respuestas (aunque esto es menos probable para OPTIONS)

## Debug Adicional

Si después de redesplegar el problema persiste, agrega logging temporal en `main.py`:

```python
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Después de configurar allowed_origins:
logger.info(f"ENVIRONMENT: {ENVIRONMENT}")
logger.info(f"CORS_ALLOWED_ORIGINS env var: {os.getenv('CORS_ALLOWED_ORIGINS')}")
logger.info(f"Final allowed_origins: {allowed_origins}")
```

Esto te ayudará a ver qué valores está usando realmente Lambda.

