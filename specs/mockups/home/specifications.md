# Home Section Design Specifications

## Layout Dimensions
- **Container**: 1662px × 1810px
- **Content Width**: 1504px (centered with 79px margins)

## Header Section
### Navigation Bar
- **Dimensions**: 1662px × 65px
- **Background**: White with bottom border
- **Border**: 1px solid #e5e7eb

### Hero Area
- **Container**: 1504px × 478px
- **Alignment**: Center-aligned content

### Logo
- **Dimensions**: 144px × 96px
- **Position**: Center, 32px margin bottom

### Main Heading
- **Dimensions**: 814px × 48px
- **Font Size**: 48px
- **Font Weight**: 700
- **Color**: #111827
- **Text**: "AI-Powered Agricultural Intelligence Hub"

### Subtitle
- **Dimensions**: 768px × 65px
- **Font Size**: 18px
- **Color**: #6b7280
- **Line Height**: 1.6

## Mission Card
- **Dimensions**: 896px × 189px
- **Background**: #f9fafb
- **Border**: 1px solid #e5e7eb
- **Border Radius**: 12px
- **Padding**: 33px
- **Contains**: IGAD mission statement with decorative dividers

## Tools Section
### Section Header
- **Title Font Size**: 36px
- **Title Weight**: 700
- **Description Width**: 672px
- **Description Font Size**: 16px

### Tools Grid
- **Container**: 1152px × 706px
- **Layout**: CSS Grid, 3 columns
- **Columns**: repeat(3, 362px)
- **Gap**: 32px

### Tool Cards
- **Standard Card**: 362px × 324px
- **Newsletter Card**: 362px × 350px (taller)
- **Background**: White
- **Border**: 1px solid #e5e7eb
- **Border Radius**: 12px
- **Padding**: 34px
- **Shadow**: 0 1px 3px rgba(0, 0, 0, 0.1)

#### Card Components
1. **Icon Container**
   - **Dimensions**: 64px × 64px
   - **Background**: #f3f4f6
   - **Border Radius**: 12px
   - **Margin Bottom**: 24px

2. **Content Area**
   - **Width**: 295px
   - **Height**: 92px
   - **Title Font Size**: 20px
   - **Title Weight**: 600
   - **Description Font Size**: 14px

3. **Action Button**
   - **Dimensions**: 295px × 36px
   - **Border Radius**: 6px
   - **Available State**: Blue background (#2563eb)
   - **Coming Soon State**: Gray border, disabled

4. **Status Badge**
   - **Position**: Absolute, top-right
   - **Available**: Green (#10b981)
   - **Coming Soon**: Amber (#f59e0b)
   - **Border Radius**: 16px
   - **Padding**: 3px 13px

## Interactive States
- **Card Hover**: Lift effect (translateY(-2px)) + enhanced shadow
- **Button Hover**: Color transitions
- **Available Tools**: Clickable with blue styling
- **Coming Soon**: Disabled state with gray styling

## Tool Cards Content
1. **Report Generator** - Coming Soon
2. **Policy Analyzer** - Coming Soon  
3. **Proposal Writer** - Available
4. **Newsletter Generator** - Available
5. **Agribusiness Hub** - Coming Soon

## Footer
- **Dimensions**: 1536px × 52px
- **Content**: Copyright and mission statement
- **Font Size**: 14px
- **Color**: #6b7280
- **Alignment**: Center

## Additional Elements
- **View Docs Button**: Floating button (122px × 56px)
- **Position**: Fixed right side
- **Background**: White with border
