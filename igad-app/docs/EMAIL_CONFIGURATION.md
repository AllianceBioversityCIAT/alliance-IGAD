# Email Configuration - IGAD Innovation Hub

## Overview
This document describes the HTML email configuration for user management in the IGAD Innovation Hub platform. All emails use professional HTML templates with IGAD branding.

## HTML Email Templates

### 1. Welcome Email (AdminCreateUser)
- **Subject**: "Bienvenido al IGAD Innovation Hub - Cuenta Creada"
- **Type**: HTML with inline CSS
- **Purpose**: Sent when new users are created by administrators
- **Features**:
  - Professional header with IGAD branding
  - Credentials display in styled box
  - Security notice with warning styling
  - Call-to-action button
  - Branded footer

### 2. Email Verification
- **Subject**: "IGAD Innovation Hub - Verifica tu Email"
- **Type**: HTML with inline CSS
- **Purpose**: Sent when users need to verify their email addresses
- **Features**:
  - Large verification code display
  - Blue info section for instructions
  - Consistent IGAD branding
  - Professional typography

### 3. Password Recovery
- **Subject**: "IGAD Innovation Hub - Restablecimiento de Contraseña"
- **Type**: HTML with inline CSS
- **Purpose**: Sent when users request password reset
- **Features**:
  - Security-focused messaging
  - Prominent reset code display
  - Warning section for security
  - Direct link to reset page
  - Support contact information

## Design System

### Color Palette
- **Primary Green**: #2c5530 (headers, buttons)
- **Accent Green**: #7cb342 (accent lines, highlights)
- **Warning Orange**: #ff9800 (security notices)
- **Info Blue**: #2196f3 (informational sections)
- **Background**: #f8f9fa (email background)

### Typography
- **Font Family**: Arial, sans-serif
- **Header Size**: 28px
- **Body Text**: 16px, line-height 1.6
- **Code Display**: 24px, bold, centered

### Layout
- **Max Width**: 600px (responsive)
- **Padding**: 20px outer, 30px inner
- **Border Radius**: 8px for cards, 6px for sections
- **Box Shadow**: 0 2px 4px rgba(0,0,0,0.1)

## SES Configuration

### Sender Information
- **From Address**: "IGAD Innovation Hub <j.cadavid@cgiar.org>"
- **Reply-To**: j.cadavid@cgiar.org
- **Source ARN**: arn:aws:ses:us-east-1:569113802249:identity/j.cadavid@cgiar.org

### Delivery Settings
- **Service**: AWS SES (Simple Email Service)
- **Region**: us-east-1
- **Account**: DEVELOPER (custom SES configuration)
- **Status**: Verified and active

## Benefits of HTML Templates

1. **Professional Appearance**: Branded, visually appealing emails
2. **Better User Experience**: Clear visual hierarchy and styling
3. **Mobile Responsive**: Optimized for all device sizes
4. **Brand Consistency**: Consistent IGAD visual identity
5. **Improved Readability**: Better typography and spacing
6. **Call-to-Action**: Styled buttons for better engagement

## Technical Implementation

### AWS Cognito Configuration
All templates are configured directly in AWS Cognito User Pool settings using HTML with inline CSS styles.

### Template Structure
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
  <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #2c5530; margin: 0; font-size: 28px;">Title</h1>
      <div style="width: 60px; height: 3px; background-color: #7cb342; margin: 15px auto;"></div>
    </div>
    
    <!-- Content sections -->
    <!-- Footer -->
  </div>
</div>
```

## Testing

Use the provided test script to verify email functionality:

```bash
python test_email_templates.py
```

## Maintenance

### Regular Tasks
- Monitor SES sending statistics
- Update templates for branding changes
- Verify SES identity remains active
- Review email delivery metrics

### Template Updates
When updating email templates:
1. Test changes with HTML preview tools
2. Update templates using AWS CLI or Console
3. Test with real email addresses
4. Verify mobile responsiveness
5. Document changes in this file

## Troubleshooting

### Common Issues

1. **Emails appear as plain text**
   - Verify HTML is properly formatted
   - Check email client HTML support
   - Ensure inline CSS is used

2. **Styling not displaying**
   - Use inline CSS only (no external stylesheets)
   - Test across different email clients
   - Verify color codes and syntax

3. **Mobile display issues**
   - Check max-width settings
   - Verify responsive design elements
   - Test on actual mobile devices

### Verification Commands

```bash
# Check SES identity status
aws ses get-identity-verification-attributes \
  --identities j.cadavid@cgiar.org

# Check Cognito user pool configuration  
aws cognito-idp describe-user-pool \
  --user-pool-id us-east-1_EULeelICj
```
