# Conversation Changes Deployment

This directory contains scripts to apply all the changes discussed in our previous conversation about token management and email template localization.

## Changes Applied

### 1. Token Management System ✅
- **Frontend**: TokenManager class with automatic refresh every 23 hours
- **Backend**: `/api/auth/refresh-token` endpoint for token renewal
- **ApiClient**: Automatic token refresh on 401 errors with retry logic

### 2. Cognito Token Validity Configuration ✅
- **AccessToken**: Extended from 1 hour to 24 hours
- **IdToken**: Extended from 1 hour to 24 hours  
- **RefreshToken**: Extended from 30 days to 10 years (3650 days)

### 3. Email Template Localization ✅
- **Welcome Email**: Converted from Spanish to English
- **Verification Email**: Converted from Spanish to English
- **Footer**: Updated to "Driving innovation in agriculture"

## Scripts

### `apply_conversation_changes.py`
Main script that applies all changes:
- Updates Cognito token validity settings
- Converts email templates to English
- Verifies frontend TokenManager exists
- Verifies backend refresh endpoint exists

### `update_token_validity.py`
Standalone script to update only token validity settings.

### `configure_cognito_emails.py`
Updated script with English email templates.

## Usage

1. **Apply all changes**:
   ```bash
   cd /Users/jcadavid/Desktop/DEV/Desarrollos/alliance-IGAD/igad-app/backend/scripts/deployment
   python3 apply_conversation_changes.py
   ```

2. **Update only token validity**:
   ```bash
   python3 update_token_validity.py
   ```

3. **Configure email templates**:
   ```bash
   python3 configure_cognito_emails.py --user-pool-id us-east-1_lLtVSWM9T --profile IBD-DEV
   ```

## Configuration

All scripts use the following configuration:
- **User Pool ID**: `us-east-1_lLtVSWM9T`
- **AWS Profile**: `IBD-DEV`
- **Region**: `us-east-1`

## Verification

The main script will verify that:
- ✅ Token validity settings are updated
- ✅ Email templates are in English
- ✅ Frontend TokenManager class exists
- ✅ Backend refresh endpoint exists

## Files Updated

### Backend
- `app/services/email_templates.py` - Updated subjects to English
- `scripts/deployment/configure_cognito_emails.py` - English templates
- `scripts/deployment/deploy_production_emails.py` - English footer
- `scripts/deployment/cognito_email_config_backup.json` - English subjects

### Frontend (Already Applied)
- `src/services/tokenManager.ts` - Token management class
- `src/services/authService.ts` - Updated to use TokenManager
- `src/services/apiClient.ts` - Automatic token refresh interceptors

## Notes

- The TokenManager automatically refreshes tokens every 23 hours
- Tokens are stored in localStorage (remember me) or sessionStorage
- API calls automatically retry with refreshed tokens on 401 errors
- Email templates maintain IGAD branding with English content
