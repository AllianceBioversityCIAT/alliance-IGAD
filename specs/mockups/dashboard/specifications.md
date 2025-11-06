# Dashboard Section Design Specifications

## Layout Dimensions
- **Container**: 1662px × 1828px
- **Content Width**: 1504px (centered with 79px margins)

## Header Section
### Navigation
- **Dimensions**: 1662px × 65px
- **Background**: White with bottom border

### Dashboard Header
- **Container**: 1536px × 140px
- **Padding**: 32px 16px

#### Header Row
- **Layout**: Flex, space-between
- **Title**: "My Dashboard" (36px, bold)
- **Back Button**: 136px × 36px, white background, border

#### Subtitle
- **Font Size**: 16px
- **Color**: #6b7280
- **Text**: Welcome message and progress tracking

## Metrics Section
### Container
- **Dimensions**: 1504px × 124px
- **Layout**: CSS Grid, 4 columns
- **Gap**: 24px between cards

### Metric Cards
- **Dimensions**: 358px × 124px each
- **Background**: White
- **Border**: 1px solid #e5e7eb
- **Border Radius**: 8px
- **Padding**: 26px
- **Alignment**: Center

#### Card Content
- **Value**: 40px font, bold, #111827
- **Label**: 16px font, medium weight, #6b7280

#### Metrics Data
1. **Total Activities**: 5
2. **Completed**: 1
3. **In Progress**: 3
4. **Needs Review**: 1

## Filter Section
### Container
- **Dimensions**: 1504px × 36px
- **Layout**: Flex, space-between

### Filter Controls
- **Filter Label**: "Filter by:" (16px, medium)
- **Dropdowns**: 180px × 36px each
  - "All Types" dropdown
  - "All Stages" dropdown

### New Task Button
- **Dimensions**: 116px × 36px
- **Background**: #2563eb (blue)
- **Color**: White
- **Border Radius**: 6px
- **Icon**: Plus icon + "New Task" text

## Activities Section
### Section Header
- **Title**: "Your Activities" (32px, bold)
- **Subtitle**: "Sorted by deadline (earliest first)" (14px, gray)

### Activity Cards
- **Dimensions**: 1504px × 270px (standard)
- **Background**: White
- **Border**: 1px solid #e5e7eb
- **Border Radius**: 8px
- **Padding**: 28px
- **Margin Bottom**: 16px

#### Card Structure
1. **Icon Section**
   - **Dimensions**: 48px × 48px
   - **Background**: #f3f4f6
   - **Border Radius**: 8px
   - **Position**: Left aligned

2. **Content Section**
   - **Title**: 20px, semibold, #111827
   - **Badges**: Multiple status indicators
   - **Meta Info**: Modified date, due date with icons

3. **Progress Section**
   - **Progress Bar**: Full width, 8px height
   - **Percentage**: Right-aligned text
   - **Colors**: Green fill (#10b981) on gray background

4. **Status Section**
   - **Icon**: Colored circle indicator
   - **Text**: Status message (14px)

5. **Action Buttons**
   - **View Button**: 81px × 32px
   - **Delete Button**: 93px × 32px
   - **Layout**: Flex, left-aligned

## Badge System
### Badge Types
- **Proposal Writer**: Blue (#dbeafe background, #1d4ed8 text)
- **Newsletter**: Similar blue styling
- **Review Needed**: Amber (#fef3c7 background, #d97706 text)
- **In Progress**: Green (#d1fae5 background, #059669 text)
- **Completed**: Green styling

### Badge Styling
- **Padding**: 3px 10px
- **Border Radius**: 16px
- **Font Size**: 12px
- **Font Weight**: 500

## Activity Examples
1. **Communities in Support of AIDS Orphans**
   - Type: Proposal Writer
   - Status: Review Needed (95% complete)
   - Due: Jun 8, 2025

2. **Regional Policy Brief - Q2 2025**
   - Type: Newsletter
   - Status: In Progress (45% complete)
   - Due: Jun 10, 2025

3. **Kenya Climate Change Adaptation Program**
   - Type: Proposal Writer
   - Status: In Progress (65% complete)
   - Due: Jun 15, 2025

## Interactive States
- **Button Hover**: Background color changes
- **Card Hover**: Subtle shadow enhancement
- **Progress Animation**: Smooth width transitions
- **Filter Dropdowns**: Click to expand options

## Responsive Considerations
- Fixed width layout (1662px)
- Grid system for metrics (4 columns)
- Consistent spacing and alignment
- Scalable progress indicators
