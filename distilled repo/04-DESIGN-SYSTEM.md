# Design System and Styling

## Overview

The application uses a modern CSS design system with CSS Custom Properties (CSS variables) for consistent theming and responsive design.

## Design Philosophy

- **Clean and Minimal**: Focus on data and functionality
- **Responsive**: Works on mobile, tablet, and desktop
- **Accessible**: High contrast, keyboard navigation
- **Modern**: CSS Grid, Flexbox, custom properties
- **No Framework**: Pure CSS3, no Bootstrap/Tailwind

## CSS Architecture

### File Structure
```
static/
└── app_styles.css    # Single CSS file (~400 lines)
    ├── Design System (CSS Variables)
    ├── Global Styles
    ├── Authentication Styles
    ├── Typography
    ├── Layout Components
    ├── Form Elements
    ├── Tables
    ├── Buttons
    ├── Chat Interface
    └── Utility Classes
```

## Design Tokens (CSS Variables)

```css
:root {
    /* Typography */
    --font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
                    Oxygen, Ubuntu, Cantarell, sans-serif;
    
    /* Colors - Primary */
    --color-primary: #3498db;         /* Blue */
    --color-primary-dark: #2980b9;    /* Darker blue (hover) */
    
    /* Colors - Semantic */
    --color-success: #4CAF50;         /* Green */
    --color-success-dark: #45a049;    /* Darker green (hover) */
    --color-error: #e74c3c;           /* Red */
    --color-text: #2c3e50;            /* Dark gray */
    --color-text-light: #7f8c8d;      /* Light gray */
    
    /* Colors - Structural */
    --color-border: #ddd;             /* Light gray border */
    --color-background: #f5f5f5;      /* Off-white background */
    
    /* Effects */
    --shadow-default: 0 4px 6px rgba(0, 0, 0, 0.1);
    --border-radius: 6px;
    
    /* Spacing */
    --spacing-unit: 1rem;             /* 16px base */
}
```

**Usage Benefits:**
- Consistent colors across app
- Easy theme switching (just change variables)
- Maintainable (change once, apply everywhere)
- Dark mode ready (just redefine variables)

## Color Palette

### Primary Colors
- **Blue** (`#3498db`): Primary actions, links, highlights
- **Green** (`#4CAF50`): Success states, positive correlations
- **Red** (`#e74c3c`): Errors, warnings, negative correlations

### Neutral Colors
- **Dark Gray** (`#2c3e50`): Body text, headings
- **Light Gray** (`#7f8c8d`): Secondary text
- **Off-White** (`#f5f5f5`): Background
- **White** (`#ffffff`): Cards, containers

### Semantic Color Usage
```css
/* Buttons */
.btn                    → Primary blue
.btn:hover              → Darker blue
.add-button            → Success green
.btn[clear]            → Error red
.btn[warning]          → Yellow/amber

/* Correlation Heatmap */
Strong Positive         → Dark green
Moderate Positive       → Light green
Neutral                 → White/Gray
Moderate Negative       → Light red
Strong Negative         → Dark red

/* Status Indicators */
Authenticated          → Green dot
Correlation available  → Blue badge
Error state            → Red border
```

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
             Oxygen, Ubuntu, Cantarell, sans-serif;
```
**Rationale:** System fonts for native look, fast loading, good readability

### Type Scale
```css
h1: 2.5rem (40px)  - Main page title
h2: 2rem (32px)    - Section headings
h3: 1.5rem (24px)  - Subsection headings
p:  1rem (16px)    - Body text
small: 0.9rem (14.4px) - Secondary text
```

### Text Styles
```css
/* Headings */
h1, h2, h3 {
    color: var(--color-text);
    font-weight: 600;
    margin: var(--spacing-unit) 0;
}

/* Body Text */
p {
    color: var(--color-text-light);
    line-height: 1.6;
    margin: var(--spacing-unit) 0;
}
```

## Layout System

### Main Container
```css
.container {
    background: white;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-default);
    padding: calc(var(--spacing-unit) * 2);  /* 32px */
    width: 100%;
    box-sizing: border-box;
}
```

### Grid Layout (Data Table + Plot)
```css
.grid-container {
    display: grid;
    grid-template-columns: 1fr 1fr;  /* Equal columns */
    gap: calc(var(--spacing-unit) * 2);  /* 32px gap */
    margin-top: var(--spacing-unit);
}

/* Responsive: Stack on mobile */
@media (max-width: 768px) {
    .grid-container {
        grid-template-columns: 1fr;  /* Single column */
    }
}
```

### Flexbox Patterns
```css
/* Button group (horizontal) */
.button-group {
    display: flex;
    gap: var(--spacing-unit);
    justify-content: center;
    margin-top: var(--spacing-unit);
}

/* Plot controls (axis selectors) */
.plot-controls {
    display: flex;
    gap: var(--spacing-unit);
    align-items: center;
}
```

## Component Styles

### 1. Buttons

```css
/* Primary Button */
.btn {
    background-color: var(--color-primary);
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: var(--border-radius);
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.3s ease;
}

.btn:hover {
    background-color: var(--color-primary-dark);
}

/* Success Button (Add) */
.add-button {
    background-color: var(--color-success);
}

.add-button:hover {
    background-color: var(--color-success-dark);
}

/* Small Button (Chat) */
.btn-small {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
}
```

### 2. Forms and Inputs

```css
/* Text Input */
input[type="text"],
input[type="number"],
input[type="date"],
input[type="password"] {
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    font-size: 1rem;
    width: 100%;
    box-sizing: border-box;
}

input:focus {
    outline: 2px solid var(--color-primary);
    border-color: var(--color-primary);
}

/* Dropdown Select */
select {
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    font-size: 1rem;
    background-color: white;
    cursor: pointer;
}
```

### 3. Data Table

```css
#dataTable {
    width: 100%;
    border-collapse: collapse;
    margin: var(--spacing-unit) 0;
    background-color: white;
}

#dataTable th,
#dataTable td {
    border: 1px solid var(--color-border);
    padding: 0.5rem;
    text-align: left;
}

#dataTable th {
    background-color: var(--color-background);
    font-weight: 600;
}

/* Editable Headers */
#dataTable thead th {
    cursor: text;
    transition: background-color 0.3s ease;
}

#dataTable thead th:hover {
    background-color: #f0f0f0;
}

#dataTable thead th:focus {
    outline: 2px solid var(--color-primary);
    background-color: #f9f9f9;
}

/* Input Row */
.input-row {
    background-color: #fffacd;  /* Light yellow */
}

.input-row input {
    width: 100%;
    padding: 0.25rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
}
```

### 4. Drop Zone

```css
.drop-zone {
    border: 2px dashed var(--color-border);
    border-radius: var(--border-radius);
    padding: var(--spacing-unit);
    text-align: center;
    margin: var(--spacing-unit) 0;
    background-color: var(--color-background);
    cursor: pointer;
    transition: all 0.3s ease;
}

.drop-zone.dragover,
.drop-zone:hover {
    background-color: #e9ecef;
    border-color: var(--color-primary);
    border-style: solid;  /* Change from dashed to solid */
}
```

### 5. Chat Interface

```css
/* Container (Fixed position) */
.chat-container {
    position: fixed;
    bottom: 0;
    right: 20px;
    z-index: 1000;
    width: 50vw;
    max-width: none;
}

/* Responsive width */
@media (max-width: 800px) {
    .chat-container {
        left: 0;
        right: 0;
        width: 100vw;  /* Full width on mobile */
    }
}

@media (min-width: 801px) {
    .chat-container {
        width: 50vw;  /* Half viewport on desktop */
    }
}

/* Toggle Button */
.chat-toggle {
    background-color: var(--color-primary);
    color: white;
    border: none;
    padding: 0.75rem 1.25rem;
    border-radius: var(--border-radius) var(--border-radius) 0 0;
    cursor: pointer;
    font-size: 1rem;
    width: 100%;
    text-align: left;
    box-shadow: var(--shadow-default);
}

/* Chat Panel (Expandable) */
.chat-panel {
    background-color: white;
    border: 1px solid var(--color-border);
    border-bottom: none;
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
}

.chat-panel.open {
    max-height: 600px;  /* Expanded */
    overflow-y: auto;
}

/* Chat Messages */
.message {
    padding: 0.75rem;
    margin: 0.5rem 0;
    border-radius: var(--border-radius);
}

.message.user {
    background-color: #e3f2fd;  /* Light blue */
    text-align: right;
}

.message.assistant {
    background-color: #f5f5f5;  /* Light gray */
    text-align: left;
}

/* Correlation Indicator Badge */
.correlation-indicator {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--color-success);
    margin-left: 0.5rem;
}
```

### 6. Authentication Pages

```css
.login-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
    padding: 2rem;
    background-color: white;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-default);
    margin: 2rem auto;
    max-width: 400px;
}

.error {
    color: var(--color-error);
    background-color: rgba(231, 76, 60, 0.1);
    padding: var(--spacing-unit);
    border-radius: var(--border-radius);
    margin-top: var(--spacing-unit);
}
```

## Responsive Design

### Breakpoints
```css
/* Mobile-first approach */

/* Small devices (phones, < 768px) */
@media (max-width: 767px) {
    .grid-container {
        grid-template-columns: 1fr;
    }
    
    body {
        padding: 0.5rem;
    }
    
    h1 {
        font-size: 2rem;
    }
}

/* Medium devices (tablets, 768px - 1024px) */
@media (min-width: 768px) and (max-width: 1024px) {
    .grid-container {
        grid-template-columns: 1fr 1fr;
    }
}

/* Large devices (desktops, > 1024px) */
@media (min-width: 1025px) {
    .container {
        max-width: 1400px;
        margin: 0 auto;
    }
}
```

### Chat Panel Responsive Behavior
```css
/* Mobile: Full screen */
@media (max-width: 800px) {
    .chat-container {
        left: 0;
        right: 0;
        width: 100vw;
    }
    
    .chat-panel.open {
        max-height: 80vh;
    }
}

/* Desktop: Half screen */
@media (min-width: 801px) {
    .chat-container {
        right: 20px;
        width: 50vw;
    }
}
```

## Utility Classes

```css
/* Spacing */
.mt-1 { margin-top: var(--spacing-unit); }
.mb-1 { margin-bottom: var(--spacing-unit); }
.p-1 { padding: var(--spacing-unit); }

/* Alignment */
.text-center { text-align: center; }
.flex-center {
    display: flex;
    justify-content: center;
    align-items: center;
}

/* Display */
.hidden { display: none !important; }
.block { display: block; }
.inline-block { display: inline-block; }
```

## Animations and Transitions

```css
/* Button Hover */
.btn {
    transition: background-color 0.3s ease;
}

/* Drop Zone Hover */
.drop-zone {
    transition: all 0.3s ease;
}

/* Chat Panel Expand/Collapse */
.chat-panel {
    transition: max-height 0.3s ease;
}

/* Table Header Hover */
#dataTable thead th {
    transition: background-color 0.3s ease;
}

/* Focus States */
input:focus,
select:focus {
    transition: border-color 0.2s ease, outline 0.2s ease;
}
```

## Accessibility

### Color Contrast
- Text on white background: 4.5:1 ratio (WCAG AA)
- Button text on colored backgrounds: 4.5:1 ratio
- Error states: High contrast red

### Focus Indicators
```css
*:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
}

button:focus,
input:focus,
select:focus {
    outline: 2px solid var(--color-primary);
}
```

### Keyboard Navigation
- All buttons are focusable
- Table cells with contenteditable
- Dropdown selectors keyboard accessible
- Chat input accessible via Tab

### Screen Reader Support
```html
<!-- Semantic HTML -->
<table>           <!-- Data table structure -->
<button>          <!-- Interactive elements -->
<nav>             <!-- Navigation areas -->

<!-- ARIA Labels -->
<div role="dialog" aria-labelledby="disclaimerTitle" aria-modal="true">
<input aria-label="Message input">
```

## Dark Mode (Future Enhancement)

Prepared for dark mode with CSS variables:

```css
@media (prefers-color-scheme: dark) {
    :root {
        --color-background: #1a1a1a;
        --color-text: #e0e0e0;
        --color-text-light: #b0b0b0;
        --color-border: #444;
        /* ... other overrides */
    }
}
```

## Print Styles (Future Enhancement)

```css
@media print {
    .chat-container,
    .button-group,
    .user-controls {
        display: none;
    }
    
    #dataTable {
        page-break-inside: avoid;
    }
    
    #plot {
        page-break-before: always;
    }
}
```

## Migration to SvelteKit

### Tailwind CSS Option
Many teams prefer Tailwind for SvelteKit projects:

```svelte
<!-- Current CSS approach -->
<button class="btn add-button">Add Row</button>

<!-- Tailwind approach -->
<button class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md">
    Add Row
</button>
```

### CSS Modules Option
Scoped styling per component:

```svelte
<script>
  import styles from './Button.module.css';
</script>

<button class={styles.btn}>Add Row</button>
```

### Svelte Native Scoped CSS
```svelte
<button class="btn">Add Row</button>

<style>
  .btn {
    background: var(--color-primary);
    padding: 0.5rem 1rem;
    border-radius: 6px;
  }
  /* Automatically scoped to this component */
</style>
```

**Recommendation:** Keep CSS variables approach for consistency, but use Svelte's scoped styles for component-specific styling.
