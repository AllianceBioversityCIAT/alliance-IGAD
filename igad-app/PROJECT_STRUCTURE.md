# IGAD Innovation Hub - Project Structure

## 📁 Organized Project Layout

```
igad-app/                           # 🏠 Main project container
├── README.md                       # Project overview and quick start
├── PROJECT_STRUCTURE.md            # This file
│
├── frontend/                       # 🎨 React frontend application
│   ├── src/
│   │   ├── components/ui/          # Base UI components (Button, Input, Card)
│   │   ├── components/layout/      # Layout components (Navigation, Layout)
│   │   ├── pages/                  # Page components (Login, Home, Dashboard)
│   │   ├── styles/                 # CSS with mockup imports
│   │   ├── lib/                    # Utilities and configurations
│   │   └── main.tsx               # Application entry point
│   ├── package.json               # Frontend dependencies
│   ├── vite.config.ts             # Build configuration
│   └── tailwind.config.js         # Design system tokens
│
├── backend/                        # ⚡ Python Lambda API
│   ├── src/
│   │   ├── routers/               # FastAPI route handlers
│   │   ├── models/                # Pydantic data models
│   │   ├── database/              # DynamoDB client and operations
│   │   ├── middleware/            # Authentication and error handling
│   │   └── main.py                # FastAPI application entry
│   ├── requirements.txt           # Python dependencies
│   └── tests/                     # Backend test suite
│
├── infrastructure/                 # 🏗️ AWS CDK infrastructure
│   ├── lib/                       # CDK stack definitions
│   ├── bin/                       # CDK app entry point
│   ├── test/                      # Infrastructure tests
│   ├── package.json               # CDK dependencies
│   ├── cdk.json                   # CDK configuration
│   └── tsconfig.json              # TypeScript configuration
│
├── specs/                          # 📋 Design specifications
│   └── mockups/                   # Complete Figma implementation
│       ├── shared/                # Design system (colors, typography)
│       ├── login/                 # Login page specs and CSS
│       ├── home/                  # Home page specs and CSS
│       ├── dashboard/             # Dashboard specs and CSS
│       ├── proposal-writer/       # Proposal writer specs and CSS
│       └── newsletter-generator/  # Newsletter generator specs and CSS
│
├── planning/                       # 📅 Project planning and documentation
│   └── setup/                     # Sprint planning files
│       ├── README.md              # Sprint overview
│       ├── sprint1_infrastructure_setup.md
│       ├── sprint2a_frontend_design_system.md
│       ├── sprint2b_backend_api_foundation.md
│       └── sprint3_integration_authentication.md
│
├── config/                         # ⚙️ Environment configurations
│   ├── testing.json               # Testing environment settings
│   └── production.json            # Production environment settings
│
├── scripts/                        # 🔧 Deployment and utility scripts
│   ├── deploy-testing.sh          # Testing deployment script
│   └── deploy-production.sh       # Production deployment script
│
├── docs/                          # 📚 Project documentation
│   ├── deployment.md              # Deployment guide
│   └── architecture.md            # System architecture
│
├── .github/                       # 🚀 CI/CD workflows
│   └── workflows/
│       └── deploy.yml             # GitHub Actions deployment
│
└── .amazonq/                      # 🛡️ Development standards
    └── rules/                     # Code quality and security rules
        ├── development-standards.md
        ├── security-guidelines.md
        └── deployment-rules.md
```

## 🎯 Benefits of This Structure

### 1. **Clear Separation of Concerns**
- Frontend, backend, and infrastructure are completely isolated
- Each component can be developed, tested, and deployed independently
- Clear boundaries between different technology stacks

### 2. **Comprehensive Design System**
- All Figma mockups organized in `specs/mockups/`
- Direct CSS imports from design specifications
- Consistent implementation across all UI components

### 3. **Organized Planning**
- Sprint documentation in dedicated `planning/` folder
- Clear progression from infrastructure to features
- Parallel development structure documented

### 4. **Environment Management**
- Separate configurations for testing and production
- Environment-specific deployment scripts
- Clear separation of concerns for different stages

### 5. **Development Standards**
- Centralized rules and guidelines in `.amazonq/`
- Consistent code quality across all components
- Security and deployment standards enforced

## 🚀 Development Workflow

### 1. **Infrastructure First**
```bash
cd igad-app/infrastructure
npm install
npm run deploy:testing
```

### 2. **Frontend Development**
```bash
cd igad-app/frontend
npm install
npm run dev
```

### 3. **Backend Development**
```bash
cd igad-app/backend
pip install -r requirements.txt
# Development with FastAPI
```

### 4. **Full Stack Integration**
- Frontend connects to deployed backend APIs
- Authentication flows through AWS Cognito
- End-to-end testing across all components

## 📊 Project Status

| Component | Status | Location |
|-----------|--------|----------|
| Infrastructure | ✅ Complete | `infrastructure/` |
| Frontend Design | 🚧 85% Complete | `frontend/` + `specs/mockups/` |
| Backend API | 🚧 40% Complete | `backend/` |
| Integration | ⏳ Pending | Cross-component |

This organized structure provides a solid foundation for the IGAD Innovation Hub development, making it easy to navigate, develop, and maintain the entire application ecosystem.
