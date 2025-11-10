# Cognito Email Templates Deployment

## Templates
- Welcome Email (AdminCreateUser) - Spanish
- Email Verification - Spanish
- Password Reset (prepared)
- MFA Setup (prepared)

## Deployment

### Development
```bash
python3 configure_cognito_emails.py --user-pool-id us-east-1_EULeelICj --profile IBD-DEV
```

### Production
1. Update `PRODUCTION_CONFIG` in `deploy_production_emails.py`
2. Run `python3 deploy_production_emails.py`

## Colors
- Primary: `#2c5530`
- Accent: `#7cb342`
- Background: `#f8f9fa`
- Text: `#333333`

## Configuration
- Use `COGNITO_DEFAULT` (recommended)
- Or SES custom email (requires verification)

## Testing
1. Create test user
2. Verify HTML formatting
3. Check spam folder

## Troubleshooting
- Templates not applied: Wait 5-10 minutes or use COGNITO_DEFAULT
- Emails in spam: Use COGNITO_DEFAULT or configure SPF/DKIM
- Wrong domain: Update PRODUCTION_CONFIG
