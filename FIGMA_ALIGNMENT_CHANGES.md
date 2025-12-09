# Step 2 Figma Alignment Changes
**Date:** December 8, 2025
**Figma Node:** 834-818 (Step 2)

## Changes Made

### 1. ✅ Icons Updated
- **Details and Guidance**: Added `Info` icon (ℹ️)
- **Suggestions**: Added `Lightbulb` icon (💡)
- **User Comments**: Added `Edit3` icon (✏️)

### 2. ✅ Label Changed
- **Before**: "Your Comments"
- **After**: "Provide additional details and context"
- **Placeholder text**: Updated to match Figma mockup

### 3. ✅ Layout Structure
Each expanded section now displays:
```
┌─────────────────────────────────────────────┐
│ [✓] Section Name [Badge]    [See less ▲]   │
│ Brief description...                         │
├─────────────────────────────────────────────┤
│ ℹ️  Details and Guidance                    │
│     Detailed explanation text...             │
├─────────────────────────────────────────────┤
│ 💡 Suggestions                               │
│     • Bullet point 1                         │
│     • Bullet point 2                         │
├─────────────────────────────────────────────┤
│ ✏️  Provide additional details and context  │
│     [Textarea]                               │
└─────────────────────────────────────────────┘
```

### 4. ✅ CSS Updates
- Added `.subsectionIcon` class for icon styling
- Updated layout to use flexbox with icons on the left
- Icons are gray (#6B7280) and positioned at the top
- Proper spacing between icon and content (12px gap)

## Files Modified

1. **Step2ConceptReview.tsx**
   - Added `Lightbulb` and `Edit3` icon imports
   - Updated JSX structure for all three subsections
   - Added icon components with proper styling

2. **step2-concept-review.module.css**
   - Added `.subsectionIcon` styling
   - Updated `.detailsSection`, `.suggestionsSection`, `.commentsSection` layouts
   - Changed from column to row flex layout with icons

## Visual Alignment

### Before:
- No icons for subsections
- "Your Comments" label
- Column-only layout

### After:
- ✅ Info icon for Details and Guidance
- ✅ Lightbulb icon for Suggestions  
- ✅ Edit icon for user input section
- ✅ "Provide additional details and context" label
- ✅ Icon + content layout matching Figma

## Testing Checklist

- [ ] Icons display correctly in all three subsections
- [ ] Layout matches Figma mockup spacing
- [ ] Icons are properly aligned at the top
- [ ] Text wraps correctly next to icons
- [ ] Textarea functionality still works
- [ ] Expand/collapse functionality works
- [ ] Mobile responsive layout maintained

## Notes

- Icons use `lucide-react` library (already installed)
- Color scheme matches existing design system
- No breaking changes to functionality
- Backward compatible with existing data structure
