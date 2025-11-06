# IGAD Innovation Hub - Frontend Specification

## Goals & Scope

### Primary Objectives
- **Authentication**: Secure login via AWS Cognito Hosted UI
- **Core Navigation**: Global navbar and home dashboard
- **Proposal Writer**: AI-assisted proposal generation with prompt management
- **Newsletter Generator**: Personalized newsletter creation
- **Prompt Management**: Template selection, versioning, and feedback collection

### MVP Features
- User authentication and session management
- Responsive design for desktop and mobile
- Real-time AI content generation with progress indicators
- Document export capabilities (PDF, Word)
- Accessibility compliance (WCAG 2.1 AA)

## Tech Stack

### Core Framework
```json
{
  "framework": "React 18.2+",
  "language": "TypeScript 5.0+",
  "bundler": "Vite 5.0+",
  "styling": "Tailwind CSS 3.3+",
  "state": "Zustand + React Query",
  "routing": "React Router 6.8+",
  "forms": "React Hook Form + Zod",
  "ui": "Headless UI + Heroicons"
}
```

### Development Tools
```json
{
  "linting": "ESLint + TypeScript ESLint",
  "formatting": "Prettier",
  "testing": "Vitest + React Testing Library",
  "e2e": "Playwright",
  "build": "Vite with code splitting",
  "deployment": "AWS S3 + CloudFront"
}
```

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (Button, Input, etc.)
│   ├── layout/          # Layout components (Header, Sidebar)
│   └── common/          # Shared components (LoadingSpinner, ErrorBoundary)
├── features/            # Feature-based modules
│   ├── auth/           # Authentication components and hooks
│   ├── proposals/      # Proposal Writer feature
│   ├── newsletters/    # Newsletter Generator feature
│   └── prompts/        # Prompt Manager UI components
├── pages/              # Route components
│   ├── LoginPage.tsx
│   ├── HomePage.tsx
│   ├── ProposalPage.tsx
│   └── NewsletterPage.tsx
├── lib/                # Utilities and configurations
│   ├── api/            # API client and types
│   ├── auth/           # Cognito integration
│   ├── utils/          # Helper functions
│   └── constants/      # App constants
├── hooks/              # Custom React hooks
├── stores/             # Zustand stores
├── types/              # TypeScript type definitions
└── assets/             # Static assets
```

## Routing & Authentication

### Route Configuration
```typescript
// src/lib/router.tsx
import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/',
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'proposals', element: <ProposalPage /> },
      { path: 'newsletters', element: <NewsletterPage /> }
    ]
  }
]);
```

### Cognito Integration
```typescript
// src/lib/auth/cognito.ts
import { CognitoAuth } from '@aws-amplify/auth';

export const authConfig = {
  region: import.meta.env.VITE_AWS_REGION,
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  userPoolWebClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
  oauth: {
    domain: import.meta.env.VITE_COGNITO_DOMAIN,
    scope: ['email', 'openid', 'profile'],
    redirectSignIn: `${window.location.origin}/`,
    redirectSignOut: `${window.location.origin}/login`,
    responseType: 'code'
  }
};

// src/hooks/useAuth.ts
export const useAuth = () => {
  const [user, setUser] = useState<CognitoUser | null>(null);
  const [loading, setLoading] = useState(true);

  const signIn = () => Auth.federatedSignIn();
  const signOut = () => Auth.signOut();
  
  return { user, loading, signIn, signOut };
};
```

## Data Access Layer

### API Client
```typescript
// src/lib/api/client.ts
import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/authStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
});

// Request interceptor for auth
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().signOut();
    }
    return Promise.reject(mapApiError(error));
  }
);
```

### React Query Integration
```typescript
// src/lib/api/queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useProposals = () => {
  return useQuery({
    queryKey: ['proposals'],
    queryFn: () => apiClient.get('/proposals').then(res => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateProposal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateProposalRequest) => 
      apiClient.post('/proposals', data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
};
```

## Prompt Manager UI

### Template Selection Component
```typescript
// src/features/prompts/PromptTemplateSelector.tsx
interface PromptTemplateSelectorProps {
  onSelect: (template: PromptTemplate) => void;
  category: 'proposal' | 'newsletter';
}

export const PromptTemplateSelector: React.FC<PromptTemplateSelectorProps> = ({
  onSelect,
  category
}) => {
  const { data: templates, isLoading } = usePromptTemplates(category);
  const [selectedVersion, setSelectedVersion] = useState<string>('latest');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates?.map((template) => (
          <PromptTemplateCard
            key={template.id}
            template={template}
            selectedVersion={selectedVersion}
            onVersionChange={setSelectedVersion}
            onSelect={() => onSelect(template)}
          />
        ))}
      </div>
    </div>
  );
};
```

### Prompt Preview & Feedback
```typescript
// src/features/prompts/PromptPreview.tsx
export const PromptPreview: React.FC<{
  template: PromptTemplate;
  context: Record<string, any>;
}> = ({ template, context }) => {
  const [feedback, setFeedback] = useState<PromptFeedback | null>(null);
  const submitFeedback = useSubmitPromptFeedback();

  const handleFeedback = (rating: number, comment: string) => {
    submitFeedback.mutate({
      templateId: template.id,
      version: template.version,
      rating,
      comment,
      context
    });
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="mb-4">
        <h3 className="font-medium text-gray-900">Prompt Preview</h3>
        <p className="text-sm text-gray-600">
          {template.name} v{template.version}
        </p>
      </div>
      
      <div className="bg-white rounded border p-3 mb-4">
        <pre className="whitespace-pre-wrap text-sm">
          {interpolateTemplate(template.content, context)}
        </pre>
      </div>

      <FeedbackWidget onSubmit={handleFeedback} />
    </div>
  );
};
```

## AI UX Patterns

### Loading States & Progress
```typescript
// src/components/ai/AIGenerationStatus.tsx
export const AIGenerationStatus: React.FC<{
  status: 'idle' | 'generating' | 'complete' | 'error';
  progress?: number;
  estimatedTime?: number;
}> = ({ status, progress, estimatedTime }) => {
  return (
    <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
      {status === 'generating' && (
        <>
          <Spinner className="w-5 h-5 text-blue-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">
              Generating content...
            </p>
            {progress && (
              <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            {estimatedTime && (
              <p className="text-xs text-blue-700 mt-1">
                Estimated time: {estimatedTime}s
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
```

### Content Citations & Feedback
```typescript
// src/components/ai/ContentWithCitations.tsx
export const ContentWithCitations: React.FC<{
  content: string;
  citations: Citation[];
  onFeedback: (feedback: ContentFeedback) => void;
}> = ({ content, citations, onFeedback }) => {
  return (
    <div className="space-y-4">
      <div className="prose max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
      
      {citations.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-2">Sources</h4>
          <ul className="space-y-1">
            {citations.map((citation, index) => (
              <li key={index} className="text-sm text-gray-600">
                <a href={citation.url} className="text-blue-600 hover:underline">
                  {citation.title}
                </a> - {citation.source}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <ContentFeedbackWidget onSubmit={onFeedback} />
    </div>
  );
};
```

## Accessibility & Internationalization

### Accessibility Implementation
```typescript
// src/components/ui/Button.tsx
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        aria-disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          buttonVariants[variant],
          buttonSizes[size]
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
```

### Internationalization Setup
```typescript
// src/lib/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: require('../locales/en.json') },
      fr: { translation: require('../locales/fr.json') },
      ar: { translation: require('../locales/ar.json') }
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });
```

## Performance Optimization

### Code Splitting
```typescript
// src/pages/index.tsx
import { lazy, Suspense } from 'react';

const ProposalPage = lazy(() => import('./ProposalPage'));
const NewsletterPage = lazy(() => import('./NewsletterPage'));

export const AppRoutes = () => (
  <Routes>
    <Route path="/proposals" element={
      <Suspense fallback={<PageSkeleton />}>
        <ProposalPage />
      </Suspense>
    } />
  </Routes>
);
```

### Caching Strategy
```typescript
// src/lib/api/cache.ts
export const cacheConfig = {
  staleTime: {
    user: 10 * 60 * 1000,      // 10 minutes
    templates: 30 * 60 * 1000,  // 30 minutes
    proposals: 5 * 60 * 1000,   // 5 minutes
  },
  gcTime: {
    default: 24 * 60 * 60 * 1000, // 24 hours
  }
};
```

## Testing Strategy

### Unit Testing
```typescript
// src/features/proposals/__tests__/ProposalEditor.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProposalEditor } from '../ProposalEditor';

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('ProposalEditor', () => {
  it('should generate content when template is selected', async () => {
    renderWithProviders(<ProposalEditor />);
    
    const templateSelect = screen.getByRole('combobox', { name: /template/i });
    fireEvent.change(templateSelect, { target: { value: 'template-1' } });
    
    const generateButton = screen.getByRole('button', { name: /generate/i });
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText(/generating content/i)).toBeInTheDocument();
    });
  });
});
```

### Integration Testing
```typescript
// src/__tests__/integration/proposal-flow.test.tsx
import { test, expect } from '@playwright/test';

test('complete proposal creation flow', async ({ page }) => {
  await page.goto('/login');
  await page.click('[data-testid="sign-in-button"]');
  
  // Mock Cognito redirect
  await page.goto('/?code=mock-auth-code');
  
  await page.click('[data-testid="proposals-nav"]');
  await page.click('[data-testid="new-proposal-button"]');
  
  await page.selectOption('[data-testid="template-select"]', 'agricultural-proposal');
  await page.fill('[data-testid="project-title"]', 'Test Proposal');
  
  await page.click('[data-testid="generate-button"]');
  await expect(page.locator('[data-testid="ai-status"]')).toContainText('Generating');
  
  await expect(page.locator('[data-testid="proposal-content"]')).toBeVisible();
});
```

## Environment Configuration

### Environment Variables
```typescript
// src/lib/config.ts
export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL,
    timeout: 30000,
  },
  auth: {
    region: import.meta.env.VITE_AWS_REGION,
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    domain: import.meta.env.VITE_COGNITO_DOMAIN,
  },
  features: {
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    enableDebugMode: import.meta.env.DEV,
  }
} as const;
```

### Build Configuration
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@headlessui/react', '@heroicons/react'],
          api: ['axios', '@tanstack/react-query'],
        }
      }
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  }
});
```

## Deployment Notes

### S3 + CloudFront Setup
- **S3 Bucket**: Static website hosting with public read access
- **CloudFront**: Global CDN with custom domain support
- **Build Process**: `npm run build` → S3 sync → CloudFront invalidation
- **Environment**: Separate buckets for testing and production

### CI/CD Integration
```yaml
# .github/workflows/deploy.yml
name: Deploy Frontend
on:
  push:
    branches: [main, develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run build
      - run: aws s3 sync dist/ s3://${{ secrets.S3_BUCKET }} --delete
      - run: aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_ID }} --paths "/*"
```

This frontend specification provides a complete, implementation-ready design for the IGAD Innovation Hub MVP, emphasizing simplicity, performance, and maintainability while integrating seamlessly with the AWS serverless backend.
