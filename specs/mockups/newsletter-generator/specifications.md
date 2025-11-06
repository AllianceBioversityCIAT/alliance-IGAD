# Newsletter Generator Design Specifications

## Layout Dimensions
- **Container**: 1662px × 5398px (variable height)
- **Wizard Width**: 896px (centered)
- **Base Terminal**: Full width with light gray background

## Multi-Step Wizard Structure (6 Steps)

### Step Progress System
- **Progress Bar**: 896px × 8px with blue fill
- **Percentage Display**: Dynamic (17%, 33%, 50%, 67%, 83%, 100%)
- **Step Navigation**: Horizontal dots with connecting lines

#### Step Navigation Dots
- **Circle Dimensions**: 32px × 32px
- **States**:
  - Completed: Green (#10b981)
  - Active: Blue (#2563eb)
  - Pending: Gray (#f3f4f6)
- **Labels**: 12px font, centered below circles
- **Connector Lines**: 2px height, spans between circles

#### Step Labels
1. **Configuration** (75px width)
2. **Content Planning** (92px width)
3. **Outline Review** (79px width)
4. **Drafting** (43px width)
5. **Preview** (41px width)
6. **Automation** (63px width)

## Step 1: Newsletter Configuration

### Welcome Card
- **Dimensions**: 896px × 96px
- **Content**: Introduction and tool explanation
- **Background**: White with subtle border

### Audience Selection Card
- **Dimensions**: 896px × 386px
- **Title**: "Who is the intended audience for the newsletter?"
- **Subtitle**: "Select all that apply"

#### Checkbox Options
- **Layout**: Vertical list with 12px spacing
- **Checkbox Size**: 16px × 16px
- **Options**:
  - Myself
  - Researchers
  - Development partners
  - Policy makers ✓
  - Ag-tech industry ✓
  - Field staff
  - Farmers

### Tone Configuration Card
- **Dimensions**: 896px × 229px
- **Title**: "What tone should the newsletter have?"

#### Slider Controls (2 sliders)
1. **Professional ↔ Casual**
2. **Technical ↔ Approachable**

##### Slider Specifications
- **Track Width**: 846px
- **Track Height**: 16px
- **Thumb Size**: 16px × 16px (circular)
- **Colors**: Blue (#2563eb) for active elements
- **Labels**: Left and right aligned

### Format Selection Card
- **Dimensions**: 896px × 150px
- **Dropdown**: 846px × 36px
- **Placeholder**: "Select format"

### Content Length Card
- **Dimensions**: 896px × 190px
- **Slider**: Short ↔ Mixed ↔ Long
- **Selected Value**: "Mixed" (displayed below)

### Frequency Card
- **Dimensions**: 896px × 190px
- **Slider**: Every day → Weekly → Monthly → Quarterly
- **Selected Value**: "Weekly" (displayed below)

### Geographic Focus Card
- **Dimensions**: 896px × 150px
- **Input Field**: 846px × 36px
- **Placeholder**: "e.g., IGAD region, East Africa, specific countries..."

### Example Upload Card
- **Dimensions**: 896px × 254px
- **Title**: "Upload Example Newsletters (Optional)"
- **Description**: Multi-line explanation
- **Upload Button**: 846px × 36px, blue background
- **Help Text**: "Supported formats: PDF, DOC, DOCX, HTML, TXT"

## Step 2: Key Topics & Content

### Information Types Selection
- **Card Dimensions**: 896px × 1420px
- **Title**: "Select Information Types for Your Newsletter"
- **Subtitle**: Selection instructions

#### Content Type Items
- **Layout**: Vertical list with 12px spacing
- **Item Dimensions**: 846px × 82px each
- **Structure**: Icon + Toggle + Content + Badge

##### Content Types List
1. **Breaking News & Updates** (Required, News)
2. **Policy Updates** (News)
3. **Research Findings** (Insights)
4. **Technology & Innovation Spotlight** (Insights)
5. **Climate-Smart Agriculture** ✓ (Insights)
6. **Market Access & Trade** ✓ (Insights)
7. **Funding Opportunities** (Opportunities)
8. **Events & Conferences** (Opportunities)
9. **Project Updates & Success Stories** ✓ (Insights)
10. **Publications & Resources** (Resources)
11. **Food Security Updates** ✓ (News)
12. **Livestock & Animal Health** ✓ (Insights)

##### Toggle Switch
- **Dimensions**: 32px × 18px
- **Thumb**: 16px × 16px circle
- **Colors**: Gray inactive, Blue active
- **Animation**: Smooth slide transition

##### Badges
- **News**: Blue background (#dbeafe)
- **Insights**: Purple background (#f3e8ff)
- **Opportunities**: Yellow background (#fef3c7)
- **Resources**: Green background (#d1fae5)
- **Required**: Red background (#fecaca)

### Custom Type Addition
- **Input Field**: 728px × 38px
- **Add Button**: 74px × 32px
- **Layout**: Horizontal flex with gap

### Additional Context Card
- **Dimensions**: 896px × 2676px
- **Title**: "Provide Additional Context (Optional)"

#### Context Sections (per selected type)
- **Section Header**: Content type name (16px, semibold)
- **Context Textarea**: 812px × 80px
- **Reference Links**: Input + Add button (766px + 38px)
- **Document Upload**: Full width button (812px × 32px)

### Structure Preview Card
- **Dimensions**: 896px × 422px
- **Title**: "Newsletter Structure Preview"
- **Content**: Numbered list of selected types with badges

## Step 3: Content Outline Review

### Review Instructions Card
- **Dimensions**: 896px × 118px
- **Content**: Multi-line explanation of review process

### Content Outline Card
- **Dimensions**: 896px × 769px
- **Title**: "Content Outline"
- **Subtitle**: "4 items across 4 sections"

#### Outline Sections
1. **Introduction** (1 item)
2. **Main Content** (1 item)
3. **Updates & Announcements** (1 item)
4. **Conclusion** (1 item)

##### Section Structure
- **Header**: Section name + item count badge
- **Item Card**: 792px × 55px
- **Layout**: Icon + Content + Actions

##### Item Actions
- **Edit Button**: 36px × 32px
- **Delete Button**: 36px × 32px
- **Icons**: Pencil and trash

### Add Custom Item Card
- **Dimensions**: 896px × 409px
- **Form Fields**:
  - Section Dropdown: 846px × 39px
  - Title Input: 846px × 36px
  - Description Textarea: 846px × 64px
- **Add Button**: 846px × 36px (centered)

### Ready Status Card
- **Dimensions**: 896px × 190px
- **Title**: "Ready to Generate"
- **Status Indicators**: Dots + text for completion status

## Step 4: Review & Edit Draft

### Layout Change
- **Container Width**: 1504px (expanded)
- **Content**: Full-width editor interface

### Draft Editor
- **Dimensions**: Variable height based on content
- **Features**: Rich text editing capabilities
- **Tools**: Formatting toolbar and editing controls

## Development Mode Banner

### Floating Banner
- **Position**: Fixed right (16px from edge)
- **Dimensions**: 291px × 82px
- **Background**: Warning yellow (#fef3c7)
- **Border**: 1px solid #f59e0b

#### Banner Content
- **Text**: "📝 Development Mode - Using Mock Data"
- **Button**: "Configure API" (full width, 36px height)
- **Colors**: Amber theme throughout

## Interactive Elements

### Hover States
- **Cards**: Subtle background change (#f9fafb)
- **Buttons**: Color transitions
- **Toggles**: Smooth animations

### Focus States
- **Inputs**: Blue border + shadow ring
- **Textareas**: Consistent focus styling
- **Dropdowns**: Border color change

### Active States
- **Sliders**: Dragging cursor change
- **Toggles**: Immediate visual feedback
- **Checkboxes**: Fill animation

## Navigation Controls

### Wizard Navigation
- **Container**: 846px × 36px
- **Layout**: Space-between (Previous left, Next right)

#### Button Specifications
- **Previous Button**: 104px × 36px, secondary style
- **Next Button**: Variable width, primary blue
- **Special Actions**:
  - "Generate Outline" (Step 2)
  - "Generate Draft" (Step 3)

## Form Validation

### Required Fields
- **Visual Indicators**: Red borders for errors
- **Helper Text**: Below field validation messages
- **Progress Blocking**: Cannot advance without required fields

### Character Counters
- **Position**: Right-aligned below textareas
- **Format**: "X characters" or "X/minimum"
- **Colors**: Gray for normal, red for insufficient

## Responsive Considerations
- Fixed width layout (896px main, 1504px for editor)
- Consistent spacing and alignment
- Scalable progress indicators
- Flexible content areas for dynamic content
