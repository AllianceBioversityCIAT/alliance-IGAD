#!/usr/bin/env python3
"""
Script para configurar todos los templates de email de Cognito
Configura templates HTML con branding de IGAD para todos los tipos de email
"""

import boto3
import json
import os
from typing import Dict, Any

# Configuración
PROFILE = "IBD-DEV"
REGION = "us-east-1"
USER_POOL_ID = "us-east-1_IMi3kSuB8"

# Colores y estilos de IGAD
COLORS = {
    "primary": "#2c5530",
    "secondary": "#7cb342", 
    "background": "#f8f9fa",
    "white": "#ffffff",
    "text": "#333333",
    "light_text": "#666666",
    "border": "#e0e0e0"
}

def get_cognito_client():
    """Crear cliente de Cognito"""
    session = boto3.Session(profile_name=PROFILE)
    return session.client("cognito-idp", region_name=REGION)

def get_base_template(content: str, title: str = "IGAD Innovation Hub") -> str:
    """Template base HTML para todos los emails"""
    return f"""
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: {COLORS['background']};">
    <div style="background-color: {COLORS['white']}; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: {COLORS['primary']}; margin: 0; font-size: 28px;">{title}</h1>
            <div style="width: 60px; height: 3px; background-color: {COLORS['secondary']}; margin: 15px auto;"></div>
        </div>
        
        <!-- Content -->
        {content}
        
        <!-- Footer -->
        <div style="border-top: 1px solid {COLORS['border']}; padding-top: 20px; margin-top: 30px;">
            <p style="color: {COLORS['light_text']}; font-size: 14px; text-align: center; margin: 0;">
                IGAD Innovation Hub - Impulsando la innovación en agricultura
            </p>
        </div>
    </div>
</div>
"""

def get_email_templates() -> Dict[str, Dict[str, str]]:
    """Definir todos los templates de email"""
    
    # 1. Template para usuarios creados por admin
    admin_create_content = f"""
<p style="color: {COLORS['text']}; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
    ¡Bienvenido al IGAD Innovation Hub! Tu cuenta ha sido creada exitosamente.
</p>

<div style="background-color: #f1f8e9; padding: 20px; border-radius: 6px; margin: 20px 0;">
    <p style="margin: 0; color: {COLORS['primary']}; font-weight: bold;">Información de tu cuenta:</p>
    <p style="margin: 10px 0 0 0; color: {COLORS['text']};">
        <strong>Usuario:</strong> {{username}}<br>
        <strong>Contraseña temporal:</strong> {{####}}
    </p>
</div>

<p style="color: {COLORS['text']}; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
    Por seguridad, deberás cambiar tu contraseña en el primer inicio de sesión.
</p>

<div style="text-align: center; margin: 30px 0;">
    <a href="https://igad-innovation-hub.com/login" 
       style="background-color: {COLORS['primary']}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Iniciar Sesión
    </a>
</div>
"""

    # 2. Template para verificación de email
    verification_content = f"""
<h2 style="color: {COLORS['primary']}; text-align: center; margin-bottom: 30px; font-size: 24px;">
    ¡Bienvenido! 🚀
</h2>

<p style="font-size: 16px; line-height: 1.8; color: {COLORS['text']}; margin-bottom: 20px;">
    Estimado innovador,
</p>

<p style="font-size: 16px; line-height: 1.8; color: {COLORS['text']}; margin-bottom: 25px;">
    ¡Bienvenido al <strong>IGAD Innovation Hub</strong>! Nos emociona tenerte en nuestra comunidad de agentes de cambio trabajando hacia el desarrollo sostenible e innovación en la región del Cuerno de África.
</p>

<div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid {COLORS['primary']};">
    <h3 style="color: {COLORS['primary']}; margin-top: 0; margin-bottom: 15px;">🎯 Lo que puedes hacer:</h3>
    <ul style="color: {COLORS['text']}; line-height: 1.6; margin: 0; padding-left: 20px;">
        <li>Generar propuestas impulsadas por IA para proyectos de desarrollo</li>
        <li>Crear boletines y comunicaciones convincentes</li>
        <li>Acceder a herramientas innovadoras para el desarrollo sostenible</li>
        <li>Conectar con otros innovadores y expertos</li>
    </ul>
</div>

<p style="font-size: 16px; line-height: 1.8; color: {COLORS['text']}; margin-bottom: 30px;">
    Para comenzar, verifica tu dirección de email haciendo clic en el botón:
</p>

<div style="text-align: center; margin: 40px 0;">
    <a href="{{##Verify Email##}}" 
       style="background: linear-gradient(135deg, {COLORS['primary']} 0%, #4a7c59 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(45, 80, 22, 0.3);">
        ✅ Verificar Email
    </a>
</div>

<div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 30px 0;">
    <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
        <strong>🔗 Alternativa:</strong> Si el botón no funciona, copia y pega este enlace:<br>
        <span style="word-break: break-all; font-family: monospace; background-color: #f8f9fa; padding: 4px 8px; border-radius: 4px;">{{##Verify Email##}}</span>
    </p>
</div>
"""

    # 3. Template para recuperación de contraseña
    forgot_password_content = f"""
<h2 style="color: {COLORS['primary']}; text-align: center; margin-bottom: 30px; font-size: 24px;">
    Recuperación de Contraseña 🔐
</h2>

<p style="font-size: 16px; line-height: 1.8; color: {COLORS['text']}; margin-bottom: 20px;">
    Hola,
</p>

<p style="font-size: 16px; line-height: 1.8; color: {COLORS['text']}; margin-bottom: 25px;">
    Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>IGAD Innovation Hub</strong>.
</p>

<div style="background-color: #e3f2fd; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2196f3;">
    <p style="margin: 0; color: #1565c0; font-weight: bold;">Código de verificación:</p>
    <p style="margin: 10px 0 0 0; color: {COLORS['text']}; font-size: 24px; font-weight: bold; font-family: monospace;">
        {{####}}
    </p>
</div>

<p style="font-size: 16px; line-height: 1.8; color: {COLORS['text']}; margin-bottom: 20px;">
    Ingresa este código en la aplicación para crear una nueva contraseña.
</p>

<div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
    <p style="margin: 0; color: #856404; font-size: 14px;">
        <strong>⚠️ Importante:</strong> Este código expira en 24 horas. Si no solicitaste este cambio, ignora este email.
    </p>
</div>
"""

    # 4. Template para resend de confirmación
    resend_confirmation_content = f"""
<h2 style="color: {COLORS['primary']}; text-align: center; margin-bottom: 30px; font-size: 24px;">
    Confirma tu Email ✉️
</h2>

<p style="font-size: 16px; line-height: 1.8; color: {COLORS['text']}; margin-bottom: 25px;">
    Necesitamos verificar tu dirección de email para completar la configuración de tu cuenta en <strong>IGAD Innovation Hub</strong>.
</p>

<div style="background-color: #e8f5e8; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid {COLORS['secondary']};">
    <p style="margin: 0; color: {COLORS['primary']}; font-weight: bold;">Código de confirmación:</p>
    <p style="margin: 10px 0 0 0; color: {COLORS['text']}; font-size: 24px; font-weight: bold; font-family: monospace;">
        {{####}}
    </p>
</div>

<p style="font-size: 16px; line-height: 1.8; color: {COLORS['text']}; margin-bottom: 20px;">
    Ingresa este código en la aplicación para verificar tu email.
</p>
"""

    return {
        "admin_create_user": {
            "subject": "Bienvenido a IGAD Innovation Hub - Credenciales de Acceso",
            "content": get_base_template(admin_create_content)
        },
        "verification": {
            "subject": "Bienvenido a IGAD Innovation Hub - Verifica tu Cuenta",
            "content": get_base_template(verification_content)
        },
        "forgot_password": {
            "subject": "IGAD Innovation Hub - Código de Recuperación de Contraseña",
            "content": get_base_template(forgot_password_content)
        },
        "resend_confirmation": {
            "subject": "IGAD Innovation Hub - Confirma tu Email",
            "content": get_base_template(resend_confirmation_content)
        }
    }

def configure_admin_create_user_template(cognito_client, templates: Dict):
    """Configurar template para usuarios creados por admin"""
    template = templates["admin_create_user"]
    
    try:
        cognito_client.update_user_pool(
            UserPoolId=USER_POOL_ID,
            AdminCreateUserConfig={
                "InviteMessageTemplate": {
                    "EmailSubject": template["subject"],
                    "EmailMessage": template["content"]
                },
                "UnusedAccountValidityDays": 7,
                "AllowAdminCreateUserOnly": False
            }
        )
        print("✅ Template AdminCreateUser configurado")
    except Exception as e:
        print(f"❌ Error configurando AdminCreateUser: {e}")

def configure_verification_template(cognito_client, templates: Dict):
    """Configurar template para verificación de email"""
    template = templates["verification"]
    
    try:
        cognito_client.update_user_pool(
            UserPoolId=USER_POOL_ID,
            VerificationMessageTemplate={
                "EmailSubjectByLink": template["subject"],
                "EmailMessageByLink": template["content"],
                "DefaultEmailOption": "CONFIRM_WITH_LINK"
            }
        )
        print("✅ Template de verificación configurado")
    except Exception as e:
        print(f"❌ Error configurando verificación: {e}")

def configure_custom_message_lambda(cognito_client, templates: Dict):
    """
    Nota: Para forgot_password y resend_confirmation necesitamos un Lambda trigger
    Este método prepara la configuración pero requiere crear el Lambda primero
    """
    print("📝 Nota: Para forgot_password y resend_confirmation se requiere Lambda trigger")
    print("   Templates preparados en este script para implementación futura")

def main():
    """Configurar todos los templates de email"""
    print("🚀 Configurando templates de email de Cognito...")
    print(f"📧 User Pool: {USER_POOL_ID}")
    print(f"🌍 Región: {REGION}")
    print()
    
    # Obtener cliente y templates
    cognito_client = get_cognito_client()
    templates = get_email_templates()
    
    # Configurar cada tipo de template
    configure_admin_create_user_template(cognito_client, templates)
    configure_verification_template(cognito_client, templates)
    configure_custom_message_lambda(cognito_client, templates)
    
    print()
    print("✅ Configuración de templates completada!")
    print()
    print("📋 Templates configurados:")
    print("   • AdminCreateUser: Email HTML con credenciales")
    print("   • Verification: Email HTML de bienvenida con verificación")
    print("   • ForgotPassword: Preparado para Lambda trigger")
    print("   • ResendConfirmation: Preparado para Lambda trigger")
    print()
    print("🔗 Próximos pasos:")
    print("   1. Crear Lambda function para custom messages")
    print("   2. Configurar triggers en Cognito")
    print("   3. Probar todos los flujos de email")

if __name__ == "__main__":
    main()
