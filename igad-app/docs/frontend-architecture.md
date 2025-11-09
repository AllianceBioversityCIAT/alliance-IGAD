# Frontend Architecture Documentation

## Overview

The IGAD Innovation Hub frontend is built with **React 18** and **TypeScript**, using **Vite** as the build tool. The application follows a modern component-based architecture with centralized state management, real authentication integration, and a responsive design system.

## Core Principle

> **"Simplicity is the ultimate sophistication."**

The frontend architecture prioritizes clean code, reusable components, and excellent user experience.

## Project Structure

```
frontend/
├── src/
│   ├── main.tsx                  # Application entry point
│   ├── App.tsx                   # Main app component with routing
│   ├── components/               # Reusable UI components
│   │   ├── ui/                  # Base UI components (buttons, modals, etc.)
│   │   ├── layout/              # Layout components (Navigation, etc.)
│   │   ├── ProtectedRoute.tsx   # Authentication guard
│   │   ├── AdminRoute.tsx       # Admin-only route guard
│   │   └── LoadingScreen.tsx    # Loading state component
│   ├── pages/                   # Page components
│   │   ├── HomePage.tsx         # Landing page
│   │   ├── LoginPage.tsx        # Authentication page
│   │   ├── DashboardPage.tsx    # User dashboard
│   │   ├── admin/               # Admin pages
│   │   │   ├── SettingsPage.tsx # Admin settings with tabs
│   │   │   ├── PromptManager.tsx # Prompt management
│   │   │   └── components/      # Admin-specific components
│   │   └── proposalWriter/      # Proposal creation workflow
│   │       ├── ProposalWriter.tsx # Main proposal interface
│   │       ├── sections/        # Proposal sections
│   │       └── components/      # Proposal-specific components
│   ├── services/                # API integration layer
│   │   ├── apiClient.ts         # Base HTTP client
│   │   ├── authService.ts       # Authentication service
│   │   ├── userService.ts       # User management service
│   │   ├── proposalService.ts   # Proposal operations
│   │   └── promptService.ts     # Prompt management
│   ├── hooks/                   # Custom React hooks
│   │   ├── useAuth.ts          # Authentication state
│   │   ├── useAdmin.ts         # Admin role checking
│   │   └── useApi.ts           # API call management
│   ├── types/                   # TypeScript type definitions
│   │   └── index.ts            # Shared type definitions
│   └── styles/                  # Global styles and themes
│       └── globals.css         # Global CSS variables
├── public/                      # Static assets
│   ├── igad-logo.png           # IGAD branding
│   └── favicon.ico             # Site favicon
├── package.json                 # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite build configuration
└── tailwind.config.js          # Tailwind CSS configuration
```

## Architecture Evolution

### UI/UX Modernization
- **Before**: Technical forms with browser alerts
- **After**: Step-by-step wizards with confirmation modals
- **Enhancement**: Context-aware form pre-filling and unified interfaces

### Authentication Integration
- **Before**: Mock authentication system
- **After**: Real AWS Cognito integration with proper session management
- **Features**: Password change flow, role-based access, JWT token handling

## Core Components

### 1. Authentication System

#### Login Flow (`LoginPage.tsx`)
```typescript
// Main authentication features:
- Real Cognito login integration
- NEW_PASSWORD_REQUIRED challenge handling
- Session persistence with localStorage
- Automatic redirect after login
- Error handling with user-friendly messages
```

#### Route Protection
```typescript
// Route guards:
<ProtectedRoute>     // Requires authentication
<AdminRoute>         // Requires admin role
<PublicRoute>        // Redirects if authenticated
```

### 2. Admin Interface (`admin/`)

#### Settings Management (`SettingsPage.tsx`)
```typescript
// Tab-based interface:
- User Management: Create, edit, disable users
- Security: Group management and permissions
- System: Configuration (disabled)
- Database: Settings (disabled)
```

#### User Management Features
- Complete user lifecycle management
- Real-time status updates
- Bulk operations support
- Email integration for user creation
- Role and group assignment

### 3. Proposal Writer System (`proposalWriter/`)

#### Step-by-Step Interface
```typescript
// Proposal creation workflow:
1. Project Information
2. Technical Details  
3. Budget and Timeline
4. Review and Submit
```

#### AI Integration
- Context-aware prompt suggestions
- Real-time content generation
- Section-specific AI assistance
- Progress tracking and validation

### 4. Modal System (`components/ui/`)

#### Modern Modal Components
```typescript
// Enhanced user experience:
- CreatePromptModal: 3-step wizard with progress
- ConfirmationModal: Success/error states
- Context-aware pre-filling
- Proper loading indicators
```

## Services Layer

### Authentication Service (`authService.ts`)
```typescript
class AuthService {
  // Core authentication methods
  login(email: string, password: string)
  completePasswordChange(newPassword: string)
  refreshToken()
  logout()
  isAuthenticated(): boolean
  getUserEmail(): string
  getToken(): string
}
```

### User Service (`userService.ts`)
```typescript
class UserService {
  // User management operations
  getUsers()
  createUser(userData)
  deleteUser(username)
  toggleUserStatus(username, enabled)
  updateUserGroups(username, groups)
}
```

### Proposal Service (`proposalService.ts`)
```typescript
class ProposalService {
  // Proposal operations
  getProposals()
  createProposal(proposalData)
  updateProposal(id, data)
  deleteProposal(id)
  generateContent(section, prompt)
}
```

### API Client (`apiClient.ts`)
```typescript
// Centralized HTTP client with:
- Automatic JWT token injection
- Request/response interceptors
- Error handling and retry logic
- Base URL configuration
- TypeScript response typing
```

## State Management

### Custom Hooks Pattern

#### useAuth Hook
```typescript
const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Authentication state management
  // Token validation and refresh
  // User session persistence
}
```

#### useAdmin Hook
```typescript
const useAdmin = () => {
  const { user } = useAuth()
  const isAdmin = useMemo(() => {
    return user?.groups?.includes('admin') || 
           adminEmails.includes(user?.email)
  }, [user])
  
  return { isAdmin }
}
```

## Styling Architecture

### CSS Modules + Tailwind CSS
```typescript
// Component-scoped styles
import styles from './Component.module.css'

// Utility-first with Tailwind
className="flex items-center gap-4 p-6 bg-white rounded-lg"

// Combined approach
className={`${styles.container} ${styles.active}`}
```

### Design System
```css
/* Global CSS variables */
:root {
  --primary-color: #3b82f6;
  --secondary-color: #64748b;
  --success-color: #10b981;
  --error-color: #ef4444;
  --border-radius: 8px;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

## Routing Architecture

### React Router v6
```typescript
// App.tsx routing structure
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
  
  {/* Protected routes */}
  <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
  <Route path="/proposal-writer" element={<ProtectedRoute><ProposalWriter /></ProtectedRoute>} />
  
  {/* Admin routes */}
  <Route path="/admin/settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
  <Route path="/admin/prompt-manager" element={<AdminRoute><PromptManager /></AdminRoute>} />
  
  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

### Navigation System
```typescript
// Navigation.tsx features:
- Dynamic menu based on user role
- Active route highlighting
- Dropdown menus with proper state management
- Responsive design for mobile/desktop
- Logout functionality
```

## Component Architecture

### Composition Pattern
```typescript
// Reusable component composition
<Modal>
  <Modal.Header>
    <Modal.Title>Create User</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <UserForm onSubmit={handleSubmit} />
  </Modal.Body>
  <Modal.Footer>
    <Button variant="primary">Save</Button>
    <Button variant="secondary">Cancel</Button>
  </Modal.Footer>
</Modal>
```

### Props Interface Design
```typescript
interface ComponentProps {
  // Required props
  title: string
  onSubmit: (data: FormData) => void
  
  // Optional props with defaults
  variant?: 'primary' | 'secondary'
  disabled?: boolean
  loading?: boolean
  
  // Event handlers
  onCancel?: () => void
  onChange?: (value: string) => void
}
```

## Performance Optimization

### Code Splitting
```typescript
// Lazy loading for large components
const AdminSettings = lazy(() => import('./pages/admin/SettingsPage'))
const ProposalWriter = lazy(() => import('./pages/proposalWriter/ProposalWriter'))

// Suspense wrapper
<Suspense fallback={<LoadingScreen />}>
  <AdminSettings />
</Suspense>
```

### Memoization Strategy
```typescript
// Expensive computations
const processedData = useMemo(() => {
  return expensiveDataProcessing(rawData)
}, [rawData])

// Callback optimization
const handleSubmit = useCallback((data) => {
  submitData(data)
}, [submitData])
```

## Error Handling

### Error Boundaries
```typescript
class ErrorBoundary extends Component {
  // Catch JavaScript errors anywhere in component tree
  // Display fallback UI
  // Log errors for monitoring
}
```

### API Error Handling
```typescript
// Centralized error handling in services
try {
  const response = await apiClient.post('/users', userData)
  return { success: true, data: response.data }
} catch (error) {
  if (error.response?.status === 401) {
    authService.logout()
    window.location.href = '/login'
  }
  return { success: false, error: error.message }
}
```

## Form Management

### Controlled Components Pattern
```typescript
const [formData, setFormData] = useState({
  email: '',
  password: '',
  confirmPassword: ''
})

const handleChange = (field: string) => (value: string) => {
  setFormData(prev => ({ ...prev, [field]: value }))
}

// Validation
const errors = useMemo(() => {
  return validateForm(formData)
}, [formData])
```

### Form Validation
```typescript
// Real-time validation
const validateEmail = (email: string): string | null => {
  if (!email) return 'Email is required'
  if (!email.includes('@')) return 'Invalid email format'
  return null
}
```

## Accessibility (a11y)

### ARIA Implementation
```typescript
// Proper ARIA attributes
<button
  aria-label="Delete user"
  aria-describedby="delete-help-text"
  role="button"
  tabIndex={0}
>
  <TrashIcon />
</button>
```

### Keyboard Navigation
```typescript
// Keyboard event handling
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    handleClick()
  }
  if (event.key === 'Escape') {
    handleClose()
  }
}
```

## Testing Strategy

### Component Testing
```typescript
// Jest + React Testing Library
describe('LoginPage', () => {
  test('renders login form', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })
  
  test('handles form submission', async () => {
    const mockLogin = jest.fn()
    render(<LoginPage onLogin={mockLogin} />)
    
    fireEvent.click(screen.getByRole('button', { name: /login/i }))
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled()
    })
  })
})
```

## Build and Deployment

### Vite Configuration
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['lucide-react']
        }
      }
    }
  }
})
```

### Environment Configuration
```typescript
// Environment variables
VITE_API_BASE_URL=https://api.igad.org
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxx
VITE_COGNITO_CLIENT_ID=xxxxx
```

## Security Considerations

### XSS Prevention
```typescript
// Sanitize user input
import DOMPurify from 'dompurify'

const sanitizedHTML = DOMPurify.sanitize(userInput)
```

### CSRF Protection
```typescript
// CSRF token in API requests
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content
```

### Secure Storage
```typescript
// Secure token storage
const secureStorage = {
  setToken: (token: string) => {
    localStorage.setItem('auth_token', token)
  },
  getToken: (): string | null => {
    return localStorage.getItem('auth_token')
  },
  removeToken: () => {
    localStorage.removeItem('auth_token')
  }
}
```

## Future Enhancements

### Planned Features
- [ ] Real-time notifications with WebSocket
- [ ] Advanced data visualization components
- [ ] Offline support with service workers
- [ ] Progressive Web App (PWA) capabilities
- [ ] Advanced form builder for proposals
- [ ] Collaborative editing features

### Performance Improvements
- [ ] Virtual scrolling for large lists
- [ ] Image optimization and lazy loading
- [ ] Bundle size optimization
- [ ] Caching strategies for API responses

## Development Guidelines

### Code Style
```typescript
// Use TypeScript strict mode
// Prefer functional components with hooks
// Use meaningful component and variable names
// Implement proper error boundaries
// Follow React best practices
```

### Component Guidelines
```typescript
// Component structure
1. Imports (React, libraries, local)
2. Type definitions
3. Component function
4. Custom hooks
5. Event handlers
6. Render logic
7. Export statement
```

## Troubleshooting

### Common Issues
1. **Build Errors**: Check TypeScript configuration and imports
2. **Authentication Issues**: Verify Cognito configuration and tokens
3. **Routing Problems**: Check route definitions and guards
4. **Styling Issues**: Verify CSS module imports and Tailwind classes

### Debug Tools
```typescript
// React Developer Tools
// Redux DevTools (if using Redux)
// Network tab for API calls
// Console for JavaScript errors
```

---

**Last Updated**: November 2025  
**Version**: 2.0 (Post-UI modernization)  
**Maintained by**: IGAD Innovation Hub Team
