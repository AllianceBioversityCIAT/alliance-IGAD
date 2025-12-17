# Fix para Error de CORS

## Problema
El frontend en `https://test-igad-hub.alliance.cgiar.org` no puede hacer requests al API porque el origen no está permitido en CORS.

## Solución Aplicada

### 1. Backend (FastAPI) - `main.py`
Se actualizó la configuración de CORS para incluir el dominio de testing:
- Agregado `https://test-igad-hub.alliance.cgiar.org` a los orígenes permitidos por defecto
- Mejorado el parsing de `CORS_ALLOWED_ORIGINS` para manejar espacios

### 2. API Gateway - `template.yaml`
Se actualizó la configuración de CORS:
- Agregado `AllowCredentials: true` para permitir cookies/headers de autenticación
- Agregado método `PATCH` a los métodos permitidos
- Agregado header `X-Request-ID` a los headers permitidos

## Configuración de Variables de Entorno

Para producción, asegúrate de configurar la variable de entorno `CORS_ALLOWED_ORIGINS`:

```bash
CORS_ALLOWED_ORIGINS=https://igad-innovation-hub.com,https://www.igad-innovation-hub.com,https://test-igad-hub.alliance.cgiar.org
```

## Verificación

Después de desplegar:
1. Verifica que el API Gateway tenga la configuración de CORS actualizada
2. Verifica que la variable de entorno `CORS_ALLOWED_ORIGINS` esté configurada en Lambda
3. Prueba hacer un request desde el frontend de test

## Nota sobre API Gateway CORS

El API Gateway tiene su propia configuración de CORS que puede sobrescribir la de FastAPI. Si el problema persiste después de desplegar:

1. Verifica la configuración de CORS en API Gateway Console
2. Asegúrate de que `AllowOrigin` incluya el dominio de test o use `'*'` (menos seguro pero funcional)
3. Considera usar CloudFront para manejar CORS a nivel de CDN

