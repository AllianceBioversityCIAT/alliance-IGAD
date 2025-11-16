# Prompt Manager - Categories and Sub-sections

## Overview

The Prompt Manager now supports **categories** and **sub-sections** to better organize and target prompts for specific use cases. This enhancement allows:

1. **Sub-sections**: Organize prompts within sections (e.g., `step-1`, `step-2`)
2. **Categories**: Define where prompts should be used (e.g., "RFP / Call for Proposals", "Technical Approach")
3. **Variable Injection**: Inject categories as variables into prompts dynamically

## New Fields

### Sub-section
- **Purpose**: Organize prompts within a section using a hierarchical structure
- **Format**: String (e.g., `step-1`, `step-2`, `phase-a`)
- **Example**: For `proposal_writer` section, you might have `step-1`, `step-2`, etc.
- **Backend Structure**: Enables organization like `proposal/step-1/`, `proposal/step-2/`

### Categories
- **Purpose**: Define the contexts where a prompt can be used
- **Format**: Array of strings
- **Multiple Selection**: One prompt can belong to multiple categories
- **Predefined Options**: 
  - RFP / Call for Proposals
  - Reference Proposals
  - Existing Work & Experience
  - Initial Concept
  - Direction
  - Technical Approach
  - Budget Planning
  - Risk Management
  - Impact Assessment
  - Stakeholder Analysis
  - Literature Review
  - Methodology Design
  - Timeline Planning
  - Sustainability Planning
  - Monitoring & Evaluation

## Category Variable Injection

### Supported Variables

1. **Individual Categories**: `{{category_1}}`, `{{category_2}}`, `{{category_3}}`, etc.
2. **All Categories**: `{{categories}}` (comma-separated list)

### Examples

#### Example 1: Single Category Reference
```
System Prompt: "You are an expert proposal writer specializing in {{category_1}} documents."
Categories: ["RFP / Call for Proposals"]
Result: "You are an expert proposal writer specializing in RFP / Call for Proposals documents."
```

#### Example 2: Multiple Category References
```
User Prompt: "Create a proposal section focusing on {{category_1}} while considering {{category_2}} requirements."
Categories: ["Technical Approach", "Budget Planning"]
Result: "Create a proposal section focusing on Technical Approach while considering Budget Planning requirements."
```

#### Example 3: All Categories List
```
System Prompt: "Consider these key areas in your response: {{categories}}."
Categories: ["RFP / Call for Proposals", "Technical Approach", "Risk Management"]
Result: "Consider these key areas in your response: RFP / Call for Proposals, Technical Approach, Risk Management."
```

## Usage in Frontend

### Creating/Editing Prompts

1. **Sub-section Field**: 
   - Optional text input
   - Use descriptive names like `step-1`, `introduction`, `methodology`

2. **Categories Section**:
   - Multi-select checkboxes
   - Choose one or more relevant categories
   - Categories appear as variables in the prompt preview

### Filtering Prompts

1. **Sub-section Filter**: Text input to filter by sub-section
2. **Category Filter**: Dropdown to filter by specific category
3. **Combined Filtering**: Use multiple filters together

### Table View

- **Sub-section Column**: Shows the sub-section with blue styling
- **Categories Column**: Shows categories as green badges (max 2 visible, +N for more)

## API Usage

### Get Prompt with Injected Categories

```bash
POST /api/proposals/prompts/with-categories
Content-Type: application/json

{
  "prompt_id": "prompt-uuid-here",
  "categories": ["RFP / Call for Proposals", "Technical Approach"]
}
```

**Response:**
```json
{
  "prompt": {
    "id": "prompt-uuid-here",
    "name": "Technical Proposal Writer",
    "system_prompt": "You are an expert in RFP / Call for Proposals with focus on Technical Approach...",
    "user_prompt_template": "Create content for Technical Approach section...",
    // ... other fields
  },
  "injected_categories": ["RFP / Call for Proposals", "Technical Approach"],
  "available_variables": ["{{category_1}}", "{{category_2}}", "{{categories}}"]
}
```

## Database Schema

### DynamoDB Fields Added

```json
{
  "sub_section": "step-1",           // Optional string
  "categories": [                    // Array of strings
    "RFP / Call for Proposals",
    "Technical Approach"
  ]
}
```

### Backward Compatibility

- Existing prompts continue to work without modification
- New fields are optional
- Empty arrays default for categories
- No migration required

## Best Practices

### Sub-section Naming
- Use consistent naming patterns: `step-1`, `step-2`, `step-3`
- Keep names short and descriptive
- Use lowercase with hyphens for consistency

### Category Selection
- Choose categories that accurately reflect prompt usage
- Select multiple categories if the prompt is versatile
- Consider the end-user's workflow when selecting categories

### Variable Usage
- Use `{{category_1}}` for primary category reference
- Use `{{categories}}` when listing all applicable areas
- Test prompts with different category combinations

### Organization Strategy
```
Section: proposal_writer
├── Sub-section: step-1 (Problem Statement)
│   ├── Categories: [RFP, Initial Concept]
│   └── Categories: [Reference Proposals, Literature Review]
├── Sub-section: step-2 (Technical Approach)
│   ├── Categories: [Technical Approach, Methodology Design]
│   └── Categories: [RFP, Technical Approach]
└── Sub-section: step-3 (Budget & Timeline)
    ├── Categories: [Budget Planning, Timeline Planning]
    └── Categories: [RFP, Budget Planning]
```

## Testing

Run the category injection test:
```bash
python3 test_category_injection.py
```

This verifies that variable injection works correctly with different category combinations.

## Deployment

The new features are included in the existing deployment process:
```bash
./scripts/deploy-fullstack-testing.sh
```

No additional deployment steps required - uses existing DynamoDB table structure.
