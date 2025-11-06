# Proposal Writer Section Design Specifications

## Layout Dimensions
- **Container**: 1662px × 3315px (variable height)
- **Wizard Width**: 896px (centered)
- **Sidebar Width**: 332px (fixed position)

## Multi-Step Wizard Structure

### Step Navigation (Sidebar)
- **Position**: Fixed left (50px from edge)
- **Dimensions**: 332px × 573px
- **Background**: White with border
- **Border Radius**: 12px
- **Padding**: 33px

#### Progress Header
- **Title**: "Proposal Progress" (18px, semibold)
- **Percentage**: Dynamic (20%, 40%, 60%, 80%, 100%)
- **Progress Bar**: 265px × 10px with blue fill
- **Step Counter**: "Step X of 5"

#### Step Navigation Items
- **Dimensions**: 222px × 60px each
- **Layout**: Vertical list with 24px spacing
- **States**: Pending, Active, Completed

##### Step Circle
- **Dimensions**: 40px × 40px
- **Border Radius**: 50%
- **States**:
  - Pending: Gray background (#f3f4f6)
  - Active: Blue background (#2563eb)
  - Completed: Green background (#10b981)

##### Step Labels
1. **Information Consolidation**
2. **Concept Review**
3. **Structure & Workplan**
4. **Proposal Review**
5. **Finalize**

### Main Content Area
- **Width**: 896px
- **Position**: Centered
- **Padding**: 124px top

## Step 1: Information Consolidation

### Header Section
- **Title**: "Step 1: Information Consolidation" (32px, bold)
- **Stage**: "Scoping" + "1 of 5"
- **Description**: Context about gathering documents

### Form Cards
#### RFP Upload Card
- **Dimensions**: 896px × 508px
- **Title**: "RFP / Call for Proposals"
- **Upload Area**: 846px × 240px
- **Border**: Dashed, hover effects
- **File Support**: PDF, DOC, DOCX up to 10MB

#### Reference Proposals Card
- **Dimensions**: 896px × 354px
- **Multiple File Support**: Yes
- **Upload Area**: Smaller, 846px × 192px

#### Existing Work Card
- **Dimensions**: 896px × 605px
- **Textarea**: 846px × 128px
- **Character Counter**: Minimum 50 characters
- **Supporting Documents**: Optional file upload

#### Initial Concept Card
- **Dimensions**: 896px × 597px
- **Textarea**: 846px × 128px
- **Alternative**: Document upload option
- **Character Counter**: Minimum 100 characters

### Alert Messages
- **Width**: 846px
- **Background**: Warning yellow (#fef3c7)
- **Border**: 1px solid #f59e0b
- **Icon**: Warning triangle
- **Text**: Missing document alerts

## Step 2: Concept Review

### Review Complete Card
- **Background**: Light green (#f0fdf4)
- **Border**: Green (#10b981)
- **Icon**: Checkmark (48px × 48px)

### Fit Assessment
- **Badge**: "Strong Alignment" (green)
- **Content**: Analysis paragraph
- **Background**: Light background for emphasis

### Strengths Section
- **List Items**: Checkmark icons + text
- **Icon**: Green circles (16px)
- **Spacing**: 12px between items

### Sections Checklist
- **Layout**: Expandable items
- **Checkboxes**: 16px × 16px
- **Labels**: Section names with badges
- **Badge Types**:
  - Critical: Red background
  - Recommended: Blue background
  - Optional: Gray background

### Updated Concept Document
- **Code Preview**: 797px × 384px
- **Background**: Dark (#1f2937)
- **Font**: Monospace
- **Scroll**: Vertical overflow
- **Actions**: Download, Re-upload, Regenerate buttons

## Step 3: Structure & Workplan

### Progress Indicator
- **Sections Reviewed**: "2/12 sections reviewed"
- **Progress Bar**: Visual completion indicator

### Section Checklist
- **Layout**: Expandable accordion items
- **Checkbox**: 20px × 20px (left aligned)
- **Content**: Number + title + description
- **Expand Icon**: Chevron (right aligned)

#### Expanded Section Content
- **Details & Guidance**: Collapsible section
- **Key Suggestions**: Bullet point list
- **Notes Area**: Textarea for user input (830px × 80px)

### Template Download
- **Ready State**: Green checkmark + "Template Ready"
- **Download Button**: 175px × 36px, blue background
- **File Info**: Template name and generation date

## Step 4: Proposal Review

### Upload Section
- **Upload Area**: 846px × 240px
- **File Support**: PDF, DOC, DOCX up to 20MB
- **Current Draft**: File info display

### Review Results
#### Overall Assessment
- **Background**: Light blue
- **Content**: AI analysis summary

#### Section Feedback
- **Layout**: Expandable list items
- **Badges**: Excellent, Good, Needs Improvement
- **Colors**:
  - Excellent: Green (#d1fae5)
  - Good: Blue (#dbeafe)
  - Needs Improvement: Yellow (#fef3c7)

### Action Buttons
- **Download with Feedback**: 415px × 78px
- **Upload Revised Version**: 415px × 78px
- **Layout**: Side by side

## Step 5: Finalize

### Completion Stats
- **Metrics Cards**: 4 cards showing improvements
- **Layout**: Grid (212px × 110px each)
- **Content**: Numbers + labels

### Final Document
- **Download Button**: Primary action
- **File Info**: Name, size, date
- **Icon**: Document icon (32px × 32px)

### Changes Summary
- **Expandable List**: What changed in each section
- **Icons**: Emoji indicators (💡, 📐, 🌟, ✓)
- **Badges**: Change type labels
- **Content**: Detailed change descriptions

### Export Options
- **DOCX Download**: Available
- **PDF Download**: Coming soon
- **Layout**: Two column grid

### Pre-submission Checklist
- **Checkboxes**: 6 items
- **Icons**: Checkmarks (16px)
- **Content**: Final validation items

## Interactive Elements

### Hover States
- **Cards**: Subtle shadow enhancement
- **Buttons**: Color transitions
- **Upload Areas**: Border color change

### Focus States
- **Textareas**: Blue border + shadow
- **Inputs**: Consistent focus styling

### Loading States
- **Progress Bars**: Smooth animations
- **File Uploads**: Progress indicators

## Navigation
- **Previous Button**: 104px × 36px, secondary style
- **Next Button**: Variable width, primary style
- **Complete Button**: Final step action

## Responsive Considerations
- Fixed width layout (896px main content)
- Sidebar remains fixed during scroll
- Consistent spacing and alignment
- Scalable progress indicators
