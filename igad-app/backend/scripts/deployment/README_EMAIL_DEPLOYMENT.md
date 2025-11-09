# IGAD Innovation Hub - Cognito Email Templates Deployment Guide

## 📧 Overview

This guide explains how to deploy professional HTML email templates for AWS Cognito User Pool in the IGAD Innovation Hub project.

## 🎨 Email Templates Configured

### 1. Welcome Email (AdminCreateUser)
- **Trigger**: When admin creates a new user
- **Content**: Welcome message with temporary password
- **Branding**: IGAD colors and logo
- **Language**: Spanish

### 2. Email Verification
- **Trigger**: When user needs to verify email
- **Content**: Verification code with instructions
- **Branding**: IGAD colors and professional design
- **Language**: Spanish

### 3. Password Reset (Prepared)
- **Trigger**: When user requests password reset
- **Content**: Reset code with security warnings
- **Status**: Template prepared, requires custom auth flow

### 4. MFA Setup (Prepared)
- **Trigger**: When MFA is enabled
- **Content**: MFA setup instructions
- **Status**: Template prepared, requires MFA configuration

## 🚀 Deployment Instructions

### For Development/Testing

```bash
cd igad-app/backend/scripts
python3 configure_cognito_emails.py --user-pool-id us-east-1_EULeelICj --profile IBD-DEV
```

### For Production

1. **Update Production Configuration**
   ```bash
   # Edit deploy_production_emails.py
   PRODUCTION_CONFIG = {
       'user_pool_id': 'us-east-1_XXXXXX',  # Your production User Pool ID
       'profile': 'production-profile',      # Your production AWS profile
       'domain': 'https://your-domain.com', # Your production domain
       'ses_email': 'noreply@your-domain.com'  # Your production email
   }
   ```

2. **Deploy to Production**
   ```bash
   python3 deploy_production_emails.py
   ```

## 🎨 Design Specifications

### Colors Used
- **Primary Green**: `#2c5530` (IGAD main color)
- **Accent Green**: `#7cb342` (IGAD light green)
- **Background**: `#f8f9fa` (Light gray)
- **Text**: `#333333` (Dark gray)
- **Success Background**: `#f1f8e9` (Light green background)

### Template Features
- ✅ Responsive design (max-width: 600px)
- ✅ Professional typography (Arial font family)
- ✅ IGAD branding consistency
- ✅ Spanish language content
- ✅ Security-focused messaging
- ✅ Clear call-to-action buttons
- ✅ Mobile-friendly layout

## 🔧 Configuration Options

### Email Delivery Methods

#### Option 1: COGNITO_DEFAULT (Recommended)
```python
EmailConfiguration={
    'EmailSendingAccount': 'COGNITO_DEFAULT'
}
```
- ✅ More reliable for HTML templates
- ✅ No SES setup required
- ✅ Better template compatibility
- ❌ Limited customization of sender

#### Option 2: SES Custom Email
```python
EmailConfiguration={
    'EmailSendingAccount': 'DEVELOPER',
    'SourceArn': 'arn:aws:ses:region:account:identity/email',
    'From': 'IGAD Innovation Hub <noreply@domain.com>',
    'ReplyToEmailAddress': 'support@domain.com'
}
```
- ✅ Custom sender name and email
- ✅ Better branding control
- ❌ Requires SES email verification
- ❌ More complex setup

## 📋 Pre-Deployment Checklist

### Development Environment
- [ ] AWS CLI configured with IBD-DEV profile
- [ ] Cognito User Pool exists
- [ ] User Pool ID is correct in script
- [ ] Python 3 and boto3 installed

### Production Environment
- [ ] Production AWS profile configured
- [ ] Production Cognito User Pool created
- [ ] Production domain is live
- [ ] SES email verified (if using custom email)
- [ ] Production User Pool ID updated in script
- [ ] Production domain updated in templates

## 🧪 Testing Instructions

### After Deployment

1. **Test Welcome Email**
   ```bash
   # Create a test user through admin panel
   # Check email for HTML formatting and IGAD branding
   ```

2. **Test Email Verification**
   ```bash
   # Trigger email verification flow
   # Verify HTML template and verification code display
   ```

3. **Verify Template Elements**
   - [ ] IGAD logo and colors display correctly
   - [ ] Text is in Spanish
   - [ ] Links point to correct domain
   - [ ] Mobile responsive design works
   - [ ] Email doesn't go to spam folder

## 🔍 Troubleshooting

### Common Issues

#### Templates Not Applied
- **Symptom**: Emails still arrive as plain text
- **Solution**: Wait 5-10 minutes for AWS propagation, or switch to COGNITO_DEFAULT

#### Emails Go to Spam
- **Symptom**: HTML emails end up in spam folder
- **Solution**: Use COGNITO_DEFAULT instead of custom SES, or configure SPF/DKIM records

#### Template Too Complex
- **Symptom**: HTML doesn't render properly
- **Solution**: Use simpler HTML structure, avoid complex CSS

#### Wrong Domain in Links
- **Symptom**: Links point to localhost in production
- **Solution**: Update PRODUCTION_CONFIG domain in deploy script

### Debug Commands

```bash
# Check current User Pool configuration
aws cognito-idp describe-user-pool --user-pool-id us-east-1_XXXXXX --profile PROFILE_NAME

# Test email template
aws cognito-idp admin-create-user --user-pool-id us-east-1_XXXXXX --username test@example.com --profile PROFILE_NAME
```

## 📁 File Structure

```
igad-app/backend/scripts/
├── configure_cognito_emails.py      # Development/testing script
├── deploy_production_emails.py      # Production deployment script
├── cognito_email_config_backup.json # Configuration backup
└── README_EMAIL_DEPLOYMENT.md      # This documentation
```

## 🔄 Maintenance

### Regular Tasks
- [ ] Test email templates monthly
- [ ] Update domain URLs when changing domains
- [ ] Backup configuration before major changes
- [ ] Monitor email delivery rates
- [ ] Update branding if IGAD guidelines change

### Version Control
- Keep all scripts in version control
- Document any template changes
- Test in development before production deployment
- Maintain backup of working configurations

## 📞 Support

If you encounter issues with email template deployment:

1. Check AWS CloudWatch logs for Cognito errors
2. Verify AWS credentials and permissions
3. Test with simpler HTML templates first
4. Contact AWS support for Cognito-specific issues

---

**Last Updated**: November 2025  
**Version**: 1.0  
**Maintainer**: IGAD Innovation Hub Development Team
