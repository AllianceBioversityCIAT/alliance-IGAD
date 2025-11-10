#!/usr/bin/env python3
"""
Script para verificar el estado actual de todos los templates de email de Cognito
"""

import boto3
import json
from typing import Dict, Any

# Configuración
PROFILE = "IBD-DEV"
REGION = "us-east-1"
USER_POOL_ID = "us-east-1_IMi3kSuB8"

def get_cognito_client():
    """Crear cliente de Cognito"""
    session = boto3.Session(profile_name=PROFILE)
    return session.client("cognito-idp", region_name=REGION)

def verify_user_pool_config():
    """Verificar configuración completa del user pool"""
    cognito_client = get_cognito_client()
    
    try:
        response = cognito_client.describe_user_pool(UserPoolId=USER_POOL_ID)
        user_pool = response["UserPool"]
        
        print("🔍 VERIFICACIÓN DE TEMPLATES DE EMAIL")
        print("=" * 50)
        print(f"📧 User Pool: {user_pool['Name']} ({USER_POOL_ID})")
        print(f"🌍 Región: {REGION}")
        print()
        
        # 1. Verificar AdminCreateUser template
        print("1️⃣ ADMIN CREATE USER TEMPLATE")
        admin_config = user_pool.get("AdminCreateUserConfig", {})
        invite_template = admin_config.get("InviteMessageTemplate", {})
        
        if invite_template:
            print("   ✅ Configurado")
            print(f"   📧 Subject: {invite_template.get('EmailSubject', 'No configurado')}")
            print(f"   📝 Message: {'HTML configurado' if invite_template.get('EmailMessage') else 'No configurado'}")
        else:
            print("   ❌ No configurado")
        print()
        
        # 2. Verificar Verification template
        print("2️⃣ VERIFICATION TEMPLATE")
        verification_template = user_pool.get("VerificationMessageTemplate", {})
        
        if verification_template:
            print("   ✅ Configurado")
            print(f"   📧 Subject: {verification_template.get('EmailSubjectByLink', 'No configurado')}")
            print(f"   📝 Message: {'HTML configurado' if verification_template.get('EmailMessageByLink') else 'No configurado'}")
            print(f"   🔗 Default Option: {verification_template.get('DefaultEmailOption', 'No configurado')}")
        else:
            print("   ❌ No configurado")
        print()
        
        # 3. Verificar Email Configuration
        print("3️⃣ EMAIL CONFIGURATION")
        email_config = user_pool.get("EmailConfiguration", {})
        
        if email_config:
            print("   ✅ Configurado")
            print(f"   📨 Sending Account: {email_config.get('EmailSendingAccount', 'No configurado')}")
            if email_config.get("SourceArn"):
                print(f"   🔗 Source ARN: {email_config.get('SourceArn')}")
            if email_config.get("From"):
                print(f"   📤 From: {email_config.get('From')}")
        else:
            print("   ❌ No configurado")
        print()
        
        # 4. Verificar Lambda Triggers
        print("4️⃣ LAMBDA TRIGGERS")
        lambda_config = user_pool.get("LambdaConfig", {})
        
        custom_message = lambda_config.get("CustomMessage")
        if custom_message:
            print(f"   ✅ CustomMessage: {custom_message}")
        else:
            print("   ❌ CustomMessage: No configurado")
            print("   💡 Necesario para forgot_password y resend_confirmation")
        print()
        
        # 5. Resumen de estado
        print("📊 RESUMEN DE ESTADO")
        print("-" * 30)
        
        templates_configured = 0
        total_templates = 4
        
        if invite_template:
            templates_configured += 1
            print("   ✅ AdminCreateUser: Configurado")
        else:
            print("   ❌ AdminCreateUser: Pendiente")
            
        if verification_template:
            templates_configured += 1
            print("   ✅ Verification: Configurado")
        else:
            print("   ❌ Verification: Pendiente")
            
        if custom_message:
            templates_configured += 2
            print("   ✅ ForgotPassword: Configurado (Lambda)")
            print("   ✅ ResendConfirmation: Configurado (Lambda)")
        else:
            print("   ❌ ForgotPassword: Pendiente (requiere Lambda)")
            print("   ❌ ResendConfirmation: Pendiente (requiere Lambda)")
        
        print()
        print(f"📈 Progreso: {templates_configured}/{total_templates} templates configurados")
        
        if templates_configured == total_templates:
            print("🎉 ¡Todos los templates están configurados!")
        else:
            print("⚠️  Algunos templates necesitan configuración")
            
        return user_pool
        
    except Exception as e:
        print(f"❌ Error verificando configuración: {e}")
        return None

def export_current_config():
    """Exportar configuración actual a archivo JSON"""
    cognito_client = get_cognito_client()
    
    try:
        response = cognito_client.describe_user_pool(UserPoolId=USER_POOL_ID)
        user_pool = response["UserPool"]
        
        # Extraer solo la configuración de templates
        config = {
            "user_pool_id": USER_POOL_ID,
            "admin_create_user": user_pool.get("AdminCreateUserConfig", {}),
            "verification_template": user_pool.get("VerificationMessageTemplate", {}),
            "email_configuration": user_pool.get("EmailConfiguration", {}),
            "lambda_config": user_pool.get("LambdaConfig", {}),
            "exported_at": "2025-11-10T16:12:00Z"
        }
        
        # Guardar en archivo
        output_file = "current_email_config.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False, default=str)
        
        print(f"💾 Configuración exportada a: {output_file}")
        
    except Exception as e:
        print(f"❌ Error exportando configuración: {e}")

def main():
    """Función principal"""
    user_pool = verify_user_pool_config()
    
    if user_pool:
        print()
        print("💾 ¿Exportar configuración actual? (y/n): ", end="")
        if input().lower() == 'y':
            export_current_config()

if __name__ == "__main__":
    main()
