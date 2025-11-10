# Email Templates de Cognito - IGAD Innovation Hub

## Resumen

Este documento describe la configuración completa de templates de email para AWS Cognito User Pool del IGAD Innovation Hub.

## Templates Configurados

### 1. AdminCreateUser Template ✅
**Propósito**: Email enviado cuando un administrador crea un usuario
- **Subject**: "Bienvenido a IGAD Innovation Hub - Credenciales de Acceso"
- **Formato**: HTML con branding de IGAD
- **Variables**: `{username}`, `{####}` (contraseña temporal)
- **Configuración**: `AdminCreateUserConfig.InviteMessageTemplate`

### 2. Verification Template ✅
**Propósito**: Email de verificación para nuevos usuarios auto-registrados
- **Subject**: "Bienvenido a IGAD Innovation Hub - Verifica tu Cuenta"
- **Formato**: HTML con branding de IGAD
- **Variables**: `{##Verify Email##}` (enlace de verificación)
- **Configuración**: `VerificationMessageTemplate.EmailMessageByLink`

### 3. ForgotPassword Template ⏳
**Propósito**: Email para recuperación de contraseña
- **Subject**: "IGAD Innovation Hub - Código de Recuperación de Contraseña"
- **Estado**: Requiere Lambda trigger (CustomMessage)
- **Variables**: `{####}` (código de verificación)

### 4. ResendConfirmation Template ⏳
**Propósito**: Reenvío de código de confirmación
- **Subject**: "IGAD Innovation Hub - Confirma tu Email"
- **Estado**: Requiere Lambda trigger (CustomMessage)
- **Variables**: `{####}` (código de confirmación)

## Configuración Actual

```json
{
  "user_pool_id": "us-east-1_IMi3kSuB8",
  "email_configuration": {
    "EmailSendingAccount": "COGNITO_DEFAULT"
  },
  "templates_configured": {
    "admin_create_user": true,
    "verification": true,
    "forgot_password": false,
    "resend_confirmation": false
  }
}
```

## Scripts Disponibles

### 1. Configuración Completa
```bash
python3 scripts/deployment/configure_all_email_templates.py
```
Configura todos los templates HTML con branding de IGAD.

### 2. Verificación de Estado
```bash
python3 scripts/deployment/verify_email_templates.py
```
Verifica el estado actual de todos los templates.

### 3. Configuración JSON
```bash
cat scripts/deployment/email_templates.json
```
Contiene la definición de todos los templates y configuración.

## Branding y Estilos

### Colores IGAD
- **Primario**: `#2c5530` (Verde oscuro)
- **Secundario**: `#7cb342` (Verde claro)
- **Fondo**: `#f8f9fa` (Gris claro)
- **Texto**: `#333333` (Gris oscuro)

### Elementos de Branding
- Logo/Título: "IGAD Innovation Hub"
- Tagline: "Impulsando la innovación en agricultura"
- Colores corporativos consistentes
- Diseño responsive para móviles

## Próximos Pasos

### Para completar la configuración:

1. **Crear Lambda Function** para CustomMessage trigger
2. **Configurar triggers** en Cognito User Pool
3. **Probar todos los flujos** de email
4. **Monitorear entregas** y tasas de apertura

### Lambda Function Requerida

```python
def lambda_handler(event, context):
    trigger_source = event['triggerSource']
    
    if trigger_source == 'CustomMessage_ForgotPassword':
        # Template para forgot password
        event['response']['emailSubject'] = 'IGAD - Código de Recuperación'
        event['response']['emailMessage'] = get_forgot_password_template(event)
    
    elif trigger_source == 'CustomMessage_ResendCode':
        # Template para resend confirmation
        event['response']['emailSubject'] = 'IGAD - Confirma tu Email'
        event['response']['emailMessage'] = get_resend_confirmation_template(event)
    
    return event
```

## Testing

### Flujos a Probar
1. ✅ **Admin crea usuario** → Recibe email HTML con credenciales
2. ✅ **Usuario se registra** → Recibe email HTML de verificación
3. ⏳ **Usuario olvida contraseña** → Recibe email HTML con código
4. ⏳ **Reenvío de confirmación** → Recibe email HTML con código

### Comandos de Prueba
```bash
# Verificar configuración actual
aws cognito-idp describe-user-pool --user-pool-id us-east-1_IMi3kSuB8 --profile IBD-DEV

# Crear usuario de prueba (requiere token admin válido)
curl -X POST "https://api-endpoint/admin/users" \
  -H "Authorization: Bearer <token>" \
  -d '{"email": "test@example.com", "temporary_password": "Test123!"}'
```

## Mantenimiento

### Actualizar Templates
1. Modificar `scripts/deployment/configure_all_email_templates.py`
2. Ejecutar script de configuración
3. Verificar con script de verificación
4. Probar flujos afectados

### Monitoreo
- Revisar logs de CloudWatch para entregas
- Monitorear métricas de Cognito
- Verificar quejas de spam/bounces

## Troubleshooting

### Problemas Comunes
1. **Email no llega**: Verificar configuración COGNITO_DEFAULT
2. **Template no se aplica**: Verificar configuración específica del trigger
3. **Variables no se reemplazan**: Verificar sintaxis de variables Cognito

### Logs Útiles
```bash
# Logs de Lambda (si se implementa CustomMessage)
aws logs filter-log-events --log-group-name /aws/lambda/cognito-custom-message

# Verificar user pool
aws cognito-idp describe-user-pool --user-pool-id us-east-1_IMi3kSuB8
```
