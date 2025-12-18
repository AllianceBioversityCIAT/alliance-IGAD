# Recomendaciones de Seguridad - IGAD Innovation Hub

## 🔴 Gaps de Seguridad Identificados

### 1. **CORS Muy Permisivo (CRÍTICO)**
**Problema**: `allow_origins=["*"]` con `allow_credentials=True` permite que cualquier sitio web haga requests autenticados.

**Riesgo**: 
- Ataques CSRF
- Robo de tokens de autenticación
- Acceso no autorizado a datos de usuarios

**Solución**: Restringir a dominios específicos
```python
allow_origins=[
    "https://igad-innovation-hub.com",
    "https://www.igad-innovation-hub.com",
    "http://localhost:3000",  # Solo para desarrollo
]
```

### 2. **Falta de Rate Limiting (ALTO)**
**Problema**: No hay protección contra:
- Ataques de fuerza bruta en login
- DDoS
- Abuso de API

**Riesgo**: 
- Sobrecarga del servidor
- Denegación de servicio
- Consumo excesivo de recursos AWS

**Solución**: Implementar rate limiting (ver `security_middleware.py`)

### 3. **Falta de Headers de Seguridad (MEDIO)**
**Problema**: No se envían headers de seguridad estándar.

**Riesgo**:
- Clickjacking
- MIME type sniffing
- XSS attacks

**Solución**: Agregar middleware de seguridad (ver `security_middleware.py`)

### 4. **JWT Sin Verificación en Desarrollo (MEDIO)**
**Problema**: En `auth_middleware.py` línea 71, se decodifica sin verificar firma:
```python
payload = jwt.decode(token, "", options={"verify_signature": False, "verify_aud": False})
```

**Riesgo**: Tokens falsificados podrían ser aceptados.

**Solución**: Usar verificación condicional basada en entorno:
```python
if os.getenv("ENVIRONMENT") == "development":
    # Solo en desarrollo permitir sin verificación
    payload = jwt.decode(token, "", options={"verify_signature": False})
else:
    # En producción, verificar siempre
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
```

### 5. **Documentación Pública (BAJO)**
**Problema**: `/docs` y `/redoc` están disponibles públicamente.

**Riesgo**: Exposición de estructura de API y endpoints.

**Solución**: Proteger en producción o deshabilitar:
```python
app = FastAPI(
    docs_url="/docs" if os.getenv("ENVIRONMENT") == "development" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") == "development" else None,
)
```

### 6. **Secrets Hardcodeados (ALTO)**
**Problema**: `JWT_SECRET = "mock-jwt-secret-for-local-development"` está hardcodeado.

**Riesgo**: Si se usa en producción, cualquier token puede ser falsificado.

**Solución**: Usar variables de entorno siempre:
```python
JWT_SECRET = os.getenv("JWT_SECRET", "mock-jwt-secret-for-local-development")
if os.getenv("ENVIRONMENT") == "production" and JWT_SECRET == "mock-jwt-secret-for-local-development":
    raise ValueError("JWT_SECRET must be set in production!")
```

### 7. **Falta de Logging de Seguridad (MEDIO)**
**Problema**: No se registran intentos de acceso no autorizados.

**Riesgo**: Difícil detectar ataques o actividad sospechosa.

**Solución**: Agregar logging de:
- Intentos de login fallidos
- Accesos no autorizados
- Rate limit excedido
- Errores de autenticación

### 8. **Validación de Tamaño de Archivos (MEDIO)**
**Problema**: No hay límites claros en uploads de archivos.

**Riesgo**: 
- Consumo excesivo de almacenamiento
- Ataques de DoS por archivos grandes

**Solución**: Implementar límites por tipo de archivo (ver `security_middleware.py`)

### 9. **Falta de Validación de Input (BAJO)**
**Problema**: Aunque FastAPI valida con Pydantic, algunos endpoints aceptan `dict` directamente.

**Riesgo**: Inyección de datos maliciosos.

**Solución**: Usar modelos Pydantic estrictos en todos los endpoints.

### 10. **No Hay Protección CSRF Explícita (BAJO)**
**Problema**: Aunque FastAPI tiene protección básica, no hay tokens CSRF explícitos.

**Riesgo**: Ataques CSRF en operaciones críticas.

**Solución**: Implementar tokens CSRF para operaciones de escritura.

## ✅ Implementación Recomendada

### Paso 1: Actualizar `main.py`

```python
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .middleware.security_middleware import SecurityMiddleware
from .middleware.auth_middleware import AuthMiddleware
from .middleware.error_middleware import ErrorMiddleware

# ... imports ...

app = FastAPI(
    title="IGAD Innovation Hub API",
    description="API for IGAD Innovation Hub platform",
    version="1.0.0",
    # Deshabilitar docs en producción
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None,
    openapi_url="/openapi.json" if os.getenv("ENVIRONMENT") != "production" else None,
)

# CORS seguro
allowed_origins = os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173"  # Default para desarrollo
).split(",")

if os.getenv("ENVIRONMENT") == "production":
    # En producción, solo dominios específicos
    allowed_origins = [
        "https://igad-innovation-hub.com",
        "https://www.igad-innovation-hub.com",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["X-Request-ID"],
)

# Security middleware (debe ir antes de otros middlewares)
app.add_middleware(
    SecurityMiddleware,
    max_requests_per_minute=60,
    max_requests_per_hour=1000,
    max_request_size=10 * 1024 * 1024,  # 10MB
)

# Error middleware
app.add_middleware(ErrorMiddleware)

# ... resto del código ...
```

### Paso 2: Mejorar `auth_middleware.py`

```python
import os

JWT_SECRET = os.getenv("JWT_SECRET", "mock-jwt-secret-for-local-development")
JWT_ALGORITHM = "HS256"

# Validar que no se use secret de desarrollo en producción
if os.getenv("ENVIRONMENT") == "production":
    if JWT_SECRET == "mock-jwt-secret-for-local-development":
        raise ValueError("JWT_SECRET must be set in production environment!")

def verify_token(self, credentials: HTTPAuthorizationCredentials) -> Dict[str, Any]:
    """Verify JWT token and return user data"""
    try:
        token = credentials.credentials
        environment = os.getenv("ENVIRONMENT", "development")
        
        if environment == "development":
            # En desarrollo, permitir sin verificación para Cognito tokens
            try:
                payload = jwt.decode(
                    token, "", options={"verify_signature": False, "verify_aud": False}
                )
                # ... resto del código ...
            except Exception:
                # Fallback a mock token
                payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        else:
            # En producción, SIEMPRE verificar
            # Primero intentar como token de Cognito (verificar con JWKs)
            # Si falla, intentar como JWT interno
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        # ... resto del código ...
```

### Paso 3: Agregar Logging de Seguridad

Crear `app/middleware/security_logging.py`:

```python
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

security_logger = logging.getLogger("security")

class SecurityLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Log intentos de acceso
        if request.url.path.startswith("/api/auth/login"):
            security_logger.info(f"Login attempt from {request.client.host}")
        
        response = await call_next(request)
        
        # Log accesos no autorizados
        if response.status_code == 401:
            security_logger.warning(
                f"Unauthorized access attempt: {request.method} {request.url.path} from {request.client.host}"
            )
        
        # Log rate limit excedido
        if response.status_code == 429:
            security_logger.warning(
                f"Rate limit exceeded: {request.client.host} for {request.url.path}"
            )
        
        return response
```

### Paso 4: Variables de Entorno

Agregar a `.env`:
```bash
# Seguridad
ENVIRONMENT=production
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
CORS_ALLOWED_ORIGINS=https://igad-innovation-hub.com,https://www.igad-innovation-hub.com

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000
MAX_REQUEST_SIZE=10485760  # 10MB
```

## 🛡️ Protecciones Adicionales Recomendadas

### 1. **WAF (Web Application Firewall)**
- Usar AWS WAF en API Gateway
- Protección contra SQL injection, XSS, etc.
- Rate limiting a nivel de infraestructura

### 2. **DDoS Protection**
- AWS Shield Standard (incluido)
- AWS Shield Advanced (para protección avanzada)

### 3. **Monitoreo y Alertas**
- CloudWatch Alarms para:
  - Múltiples 401 en corto tiempo
  - Rate limit excedido frecuentemente
  - Errores 500 inusuales
  - Tráfico anormal

### 4. **Backup y Recuperación**
- Backups automáticos de DynamoDB
- Plan de recuperación ante desastres

### 5. **Secrets Management**
- Usar AWS Secrets Manager o Parameter Store
- Rotación automática de secrets

## 📊 Priorización

1. **CRÍTICO (Implementar inmediatamente)**:
   - ✅ CORS restrictivo
   - ✅ Rate limiting
   - ✅ Security headers

2. **ALTO (Implementar pronto)**:
   - ✅ JWT verification en producción
   - ✅ Secrets management
   - ✅ Logging de seguridad

3. **MEDIO (Implementar en siguiente sprint)**:
   - ✅ Validación de tamaño de archivos
   - ✅ Protección de documentación
   - ✅ CSRF tokens

4. **BAJO (Mejoras continuas)**:
   - ✅ WAF
   - ✅ Monitoreo avanzado
   - ✅ Validación de input estricta

## 🔍 Testing de Seguridad

Recomendado:
- OWASP ZAP para scanning
- Penetration testing periódico
- Security code reviews
- Dependency scanning (Snyk, Dependabot)

