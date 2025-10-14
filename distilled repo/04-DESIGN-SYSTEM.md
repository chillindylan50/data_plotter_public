# Design System and Styling

## Overview

Modern CSS design system using CSS Custom Properties (variables) for consistent theming and responsive design.

## Design Philosophy

- Clean and minimal
- Responsive (mobile-first)
- Accessible
- No CSS framework needed

## Design Tokens

**Colors:**
```css
--color-primary: #3498db (Blue)
--color-success: #4CAF50 (Green)
--color-error: #e74c3c (Red)
--color-text: #2c3e50 (Dark gray)
--color-background: #f5f5f5 (Off-white)
```

**Typography:**
```css
--font-primary: System fonts (native look)
h1: 2.5rem
h2: 2rem
p: 1rem
```

**Spacing:**
```css
--spacing-unit: 1rem (16px base)
--border-radius: 6px
--shadow-default: 0 4px 6px rgba(0,0,0,0.1)
```

## Component Styles

**Buttons:**
- Primary: Blue background
- Success: Green background
- Danger: Red background
- Transitions on hover

**Forms:**
- Consistent padding and borders
- Focus states with blue outline
- Full-width inputs

**Data Table:**
- Bordered cells
- Alternating row colors
- Editable headers
- Sticky header option

**Chat Interface:**
- Fixed position bottom-right
- Responsive width (50vw desktop, 100vw mobile)
- Toggle button
- Message bubbles (user: blue, AI: gray)

## Responsive Design

**Breakpoints:**
- Mobile: < 768px (single column)
- Tablet: 768-1024px
- Desktop: > 1024px (dual column)

**Grid Layout:**
- Desktop: 2 columns (table | plot)
- Mobile: 1 column (stacked)
- CSS Grid with gap

## Accessibility

**Features:**
- High contrast colors (4.5:1 ratio)
- Focus indicators on all interactive elements
- Keyboard navigation support
- Semantic HTML

**Screen Readers:**
- ARIA labels where needed
- Semantic structure
- Alt text for images

## Dark Mode (Future)

CSS variables make dark mode easy:
- Override color values in `prefers-color-scheme: dark`
- Keep same structure
- Automatic browser detection

## SvelteKit Migration

**Options:**
1. **Keep CSS Variables** - Portable, works everywhere
2. **Tailwind CSS** - Popular in SvelteKit community
3. **Svelte Scoped CSS** - Component-level styling

**Recommendation:**
- Keep CSS variables approach
- Use Svelte's scoped styles per component
- Maintain current design system
