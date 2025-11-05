# IGAD Innovation Hub - Architecture Diagrams

This directory contains the official architecture diagrams for the IGAD Innovation Hub V2 MVP, generated using AWS official iconography and following architectural visualization standards.

## Diagrams

### 1. System Architecture Diagram
**File**: `igad_system_architecture.png`

**Purpose**: Depicts the high-level logical architecture showing component relationships and data flow.

**Components Illustrated**:
- **User Interface Layer**: IGAD users (Government, NGO, Research institutions)
- **Frontend Layer**: React SPA with transversal components (Login, Navigation, Home Dashboard) and functional terminals (Proposal Writer, Newsletter Generator)
- **Orchestration Layer (ORD)**: API Orchestrator, Auth Manager, and Request Router
- **Backend Services Layer**: Lambda-based microservices for proposals, newsletters, users, and AI
- **Data Layer**: DynamoDB database and S3 document storage
- **AI & Knowledge Layer**: IGAD AI Assistant connected to IGAD Knowledge Network (ICPAC, CEWARN, IDDRSI)

**Flow Direction**: Top-down logical flow from users to data sources

### 2. Infrastructure Architecture Diagram
**File**: `igad_infrastructure_architecture.png`

**Purpose**: Shows the AWS service-level infrastructure implementation with official AWS icons.

**AWS Services Illustrated**:
- **Presentation Layer**: Route 53 (DNS), CloudFront (CDN), S3 (Static Website)
- **Application Layer**: API Gateway, Cognito (Authentication), IAM (Roles), Lambda Functions
- **Data Layer**: DynamoDB (Main Table), S3 (Documents & Exports), KMS (Encryption)
- **AI & ML Layer**: Amazon Bedrock, IGAD-KN Data Sources
- **Integration Layer**: EventBridge (Event Bus), SQS (Queues), SNS (Notifications)
- **Monitoring Layer**: CloudWatch (Logs & Metrics), CloudFormation (IaC)

**Flow Direction**: Left-to-right flow from users through internet to AWS services

## Design Principles

### Visual Standards
- **AWS Official Icons**: All AWS services use official AWS iconography
- **Minimal Design**: Clean, uncluttered layout following "La simplicidad es la máxima sofisticación"
- **Color-Coded Grouping**: Logical grouping with consistent cluster boundaries
- **Clear Labeling**: Descriptive labels with service names and purposes

### Architectural Patterns
- **Serverless Architecture**: Emphasis on managed AWS services
- **Microservices**: Modular backend services with clear separation of concerns
- **Event-Driven**: Integration through EventBridge and messaging services
- **Security-First**: IAM, Cognito, and KMS prominently featured

## Usage Guidelines

### For Engineering Teams
- Use these diagrams as reference for implementation
- Maintain consistency with the depicted architecture
- Update diagrams when adding new components or services

### For Stakeholder Presentations
- System Architecture diagram for high-level business discussions
- Infrastructure diagram for technical architecture reviews
- Both diagrams suitable for documentation and proposals

### For Documentation
- Embed diagrams in technical specifications
- Reference in deployment guides and operational runbooks
- Include in system design documents

## Maintenance

### Updating Diagrams
When modifying the architecture:
1. Update the corresponding diagram code
2. Regenerate using the AWS diagram generator
3. Ensure consistency with implementation
4. Update this README if new components are added

### Version Control
- Diagrams are generated from code for consistency
- Source code available in project documentation tools
- PNG files committed for easy viewing and embedding

## Related Documentation
- [System Overview](../overview.md)
- [Architecture Specification](../architecture.md)
- [Component Specifications](../components.md)
- [API Specifications](../api-specs.md)

These diagrams provide visual representation of the comprehensive technical specifications and serve as the authoritative architectural reference for the IGAD Innovation Hub MVP.
