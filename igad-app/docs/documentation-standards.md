# Documentation Standards

## Overview

This document defines the documentation standards for both AI and human readability in the IGAD Innovation Hub project.

## Python (Backend) - Google Style Docstrings

### Function Documentation
```python
def create_user(self, email: str, password: str, groups: List[str] = None) -> Dict[str, Any]:
    """Create a new user in Cognito User Pool.
    
    Args:
        email: User's email address (used as username)
        password: Temporary password for the user
        groups: Optional list of groups to assign user to
        
    Returns:
        Dict containing user creation result with 'success' and 'data' keys
        
    Raises:
        CognitoException: When user creation fails
        ValidationError: When email format is invalid
        
    Example:
        >>> service = CognitoService()
        >>> result = service.create_user("user@example.com", "TempPass123!")
        >>> print(result['success'])  # True
    """
```

### Class Documentation
```python
class CognitoUserManagementService:
    """Service for managing AWS Cognito users and groups.
    
    This service provides a high-level interface for user management operations
    including creation, deletion, enabling/disabling, and group management.
    
    Attributes:
        user_pool_id: AWS Cognito User Pool ID
        client_id: AWS Cognito App Client ID
        cognito_client: Boto3 Cognito client instance
        
    Example:
        >>> service = CognitoUserManagementService(
        ...     user_pool_id="us-east-1_xxxxx",
        ...     client_id="xxxxx"
        ... )
        >>> users = service.list_users()
    """
```

## TypeScript (Frontend) - JSDoc Standard

### Function Documentation
```typescript
/**
 * Authenticates user with AWS Cognito
 * 
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise resolving to authentication result
 * @throws {AuthenticationError} When credentials are invalid
 * 
 * @example
 * ```typescript
 * const result = await authService.login("user@example.com", "password123")
 * if (result.success) {
 *   console.log("Login successful")
 * }
 * ```
 */
async login(email: string, password: string): Promise<AuthResult> {
```

### Component Documentation
```typescript
/**
 * Modal component for creating new users
 * 
 * @param isOpen - Whether the modal is visible
 * @param onClose - Callback when modal is closed
 * @param onUserCreated - Callback when user is successfully created
 * 
 * @example
 * ```tsx
 * <CreateUserModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   onUserCreated={handleUserCreated}
 * />
 * ```
 */
interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onUserCreated: (user: User) => void
}
```

### Hook Documentation
```typescript
/**
 * Custom hook for managing authentication state
 * 
 * @returns Object containing authentication state and methods
 * 
 * @example
 * ```typescript
 * const { isAuthenticated, user, login, logout } = useAuth()
 * 
 * if (isAuthenticated) {
 *   console.log(`Welcome ${user.email}`)
 * }
 * ```
 */
export const useAuth = () => {
```

## Linting Commands

### Backend (Python)
```bash
# Check documentation style
make docs-check

# Run all checks including documentation
make all-checks

# Individual check
python3 -m pydocstyle app/ scripts/
```

### Frontend (TypeScript)
```bash
# Check JSDoc documentation
npm run docs-check

# Regular linting (includes JSDoc warnings)
npm run lint
```

## Configuration Files

### Backend - `.pydocstyle`
```ini
[pydocstyle]
convention = google
add-ignore = D100,D104,D105,D107
match-dir = (?!tests).*
match = (?!test_).*\.py
```

### Frontend - `.eslintrc.json`
```json
{
  "plugins": ["jsdoc"],
  "rules": {
    "jsdoc/require-description": "warn",
    "jsdoc/require-param-description": "warn",
    "jsdoc/require-returns-description": "warn",
    "jsdoc/check-param-names": "error",
    "jsdoc/check-tag-names": "error",
    "jsdoc/check-types": "error"
  }
}
```

## AI-Readable Patterns

### Structured Information
- **Purpose**: Clear description of what the function/class does
- **Parameters**: Type and description for each parameter
- **Returns**: Type and description of return value
- **Exceptions**: What errors can be thrown and when
- **Examples**: Working code examples

### Consistent Format
- Use standard docstring/JSDoc format
- Include type information
- Provide practical examples
- Document edge cases and error conditions

## Human-Readable Guidelines

### Clear Language
- Use simple, descriptive language
- Avoid technical jargon when possible
- Explain the "why" not just the "what"
- Include context and use cases

### Practical Examples
- Show real-world usage
- Include common patterns
- Demonstrate error handling
- Show integration with other components

## Enforcement

### Pre-commit Hooks
Documentation linting is integrated into the pre-commit workflow:
- Python: `pydocstyle` checks Google-style docstrings
- TypeScript: ESLint JSDoc plugin validates documentation

### CI/CD Integration
Documentation checks are part of the build process:
- Backend: `make all-checks` includes documentation validation
- Frontend: `npm run lint` includes JSDoc validation

### IDE Integration
Configure your IDE for documentation support:
- VS Code: Install Python Docstring Generator and JSDoc extensions
- Auto-completion based on documented types and parameters
- Hover hints showing documentation

## Benefits

### For AI Systems
- Structured format enables automatic parsing
- Type information improves code understanding
- Examples provide context for usage patterns
- Consistent format across codebase

### For Human Developers
- Clear understanding of function purpose and usage
- Reduced onboarding time for new team members
- Better IDE support with hover documentation
- Easier debugging and maintenance

### For Project Maintenance
- Self-documenting code reduces external documentation needs
- Consistent standards across team members
- Automated validation prevents documentation drift
- Integration with development workflow

---

**Last Updated**: November 2025  
**Maintained by**: IGAD Innovation Hub Team
