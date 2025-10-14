# Plotly.js Visualization

## Overview

Interactive data visualization using Plotly.js 3.0.1 for time-series charts with dual Y-axes.

## Chart Configuration

**Basic Structure:**
- X-axis: Date (time series)
- Y-axis 1: Left side (primary variable)
- Y-axis 2: Right side (secondary variable, optional)

**Chart Type:**
- Scatter plot with lines and markers
- Time series format
- Hover tooltips for data points

## Features

**Interactivity:**
- Hover tooltips show date and value
- Click events for selection
- Zoom and pan controls
- Legend to toggle traces

**Dual Y-Axes:**
- Compare variables with different scales
- Y1 on left, Y2 on right
- Independent scaling

**Responsive:**
- Auto-resize on window resize
- Mobile-optimized controls
- Smaller fonts on mobile

## Plot Updates

**Triggers:**
- Data added or changed
- Axis selection changed
- Plot manually refreshed

**Update Strategy:**
- Full re-render with Plotly.newPlot()
- Plotly handles diffing internally
- Efficient for small datasets

## Configuration Options

**Layout:**
- Title: "Data Visualization"
- Show grid lines
- Zero line visible
- Legend horizontal at top

**Styling:**
- Primary color: Blue (#3498db)
- Secondary color: Red (#e74c3c)
- Line width: 2px
- Marker size: 8px

## Empty State

- Show message when no data
- Hide axes
- Guide user to add data

## Performance

**For Large Datasets:**
- Sample data if > 1000 points
- Use Plotly.react() for updates
- Batch updates when possible

**Optimization Tips:**
- Limit markers on large datasets
- Use mode: 'lines' only for many points
- Consider data aggregation

## SvelteKit Migration

**Component Structure:**
- Create PlotVisualization.svelte component
- Bind to div element
- Use onMount() for initialization
- Cleanup with onDestroy()

**Reactivity:**
- Automatic updates when data changes
- No manual DOM manipulation
- Svelte handles lifecycle

**Benefits:**
- Cleaner component code
- Automatic cleanup
- Reactive to state changes
- Type-safe props
