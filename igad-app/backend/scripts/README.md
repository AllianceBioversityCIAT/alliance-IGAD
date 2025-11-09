# Backend Scripts Organization

This directory contains utility scripts organized by purpose:

## Directory Structure

### `/setup/`
Initial setup and configuration scripts:
- `create_prompts_table.py` - Creates DynamoDB prompts table
- `create_first_prompt.py` - Creates initial prompt data
- `setup_cognito_groups.py` - Sets up Cognito user groups

### `/deployment/`
Production deployment and configuration:
- `deploy_production_emails.py` - Deploys email templates to production
- `configure_cognito_emails.py` - Configures Cognito email settings
- `cognito_email_config_backup.json` - Backup of email configurations
- `README_EMAIL_DEPLOYMENT.md` - Email deployment documentation

### `/maintenance/`
Maintenance and fix scripts:
- `configure_email_templates.py` - Configure email templates
- `fix_email_templates.py` - Fix email template issues

### Root Level
- `run_tests.py` - Test runner script

## Usage Guidelines

1. **Setup scripts**: Run once during initial project setup
2. **Deployment scripts**: Use for production deployments
3. **Maintenance scripts**: Use for ongoing maintenance and fixes

## Security Note

All scripts should use environment variables or AWS profiles for credentials.
Never hardcode sensitive information.
