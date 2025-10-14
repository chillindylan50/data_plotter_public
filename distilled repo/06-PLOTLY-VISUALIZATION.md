# Data Visualization with Plotly.js

## Overview

The application uses Plotly.js 3.0.1 for interactive data visualization. Charts update automatically when data changes, support dual Y-axes, and provide hover tooltips.

## Plotly.js Integration

### Script Import

```html
<head>
    <script src="https://cdn.plot.ly/plotly-3.0.1.min.js"></script>
</head>
```

### Plot Container

```html
<div id="plot"></div>
```

## Plot Structure

### Basic Configuration

```typescript
// Main plotting function
function updatePlot(): void {
    const plotDiv = document.getElementById('plot');
    if (!plotDiv) return;
    
    // Get selected axes from dropdown selectors
    const xAxis = (document.getElementById('xAxis') as HTMLSelectElement)?.value || 'Date';
    const yAxis1 = (document.getElementById('yAxis1') as HTMLSelectElement)?.value;
    const yAxis2 = (document.getElementById('yAxis2') as HTMLSelectElement)?.value;
    
    // Extract data for selected variables
    const xData = tableData.map(row => row[xAxis]);
    const y1Data = tableData.map(row => row[yAxis1]);
    const y2Data = tableData.map(row => row[yAxis2]);
    
    // Create traces
    const traces = [];
    
    // Y1 trace (left axis)
    if (yAxis1) {
        traces.push({
            x: xData,
            y: y1Data,
            type: 'scatter',
            mode: 'lines+markers',
            name: yAxis1,
            line: { color: '#3498db', width: 2 },
            marker: { size: 8 }
        });
    }
    
    // Y2 trace (right axis)
    if (yAxis2 && yAxis2 !== yAxis1) {
        traces.push({
            x: xData,
            y: y2Data,
            type: 'scatter',
            mode: 'lines+markers',
            name: yAxis2,
            line: { color: '#e74c3c', width: 2 },
            marker: { size: 8 },
            yaxis: 'y2'  // Use second Y-axis
        });
    }
    
    // Layout configuration
    const layout = {
        title: 'Data Visualization',
        xaxis: {
            title: xAxis,
            showgrid: true,
            zeroline: false
        },
        yaxis: {
            title: yAxis1,
            showgrid: true,
            zeroline: false
        },
        yaxis2: {
            title: yAxis2,
            overlaying: 'y',
            side: 'right',
            showgrid: false
        },
        hovermode: 'closest',
        showlegend: true,
        legend: {
            x: 0.5,
            y: 1.1,
            xanchor: 'center',
            orientation: 'horizontal'
        },
        margin: { t: 50, b: 50, l: 60, r: 60 }
    };
    
    // Render plot
    Plotly.newPlot('plot', traces, layout, {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
    });
}
```

## Chart Types

### 1. Time Series Line Chart

**Most Common Use Case**: Tracking variables over time

```typescript
const trace = {
    x: ['2024-10-01', '2024-10-02', '2024-10-03'],
    y: [42, 45, 43],
    type: 'scatter',
    mode: 'lines+markers',
    name: 'Variable 1',
    line: {
        color: '#3498db',
        width: 2,
        shape: 'linear'  // or 'spline' for smooth curves
    },
    marker: {
        size: 8,
        color: '#3498db',
        symbol: 'circle'
    }
};
```

### 2. Dual Y-Axis Chart

**Use Case**: Comparing variables with different scales

```typescript
const trace1 = {
    x: dates,
    y: sleepHours,      // Range: 6-9 hours
    name: 'Sleep Hours',
    yaxis: 'y'          // Left Y-axis
};

const trace2 = {
    x: dates,
    y: stepsCount,      // Range: 5000-15000 steps
    name: 'Steps',
    yaxis: 'y2'         // Right Y-axis
};

const layout = {
    yaxis: {
        title: 'Sleep (hours)',
        side: 'left'
    },
    yaxis2: {
        title: 'Steps',
        overlaying: 'y',
        side: 'right'
    }
};
```

### 3. Scatter Plot (for Correlations)

**Use Case**: Visualizing relationship between two variables

```typescript
const trace = {
    x: variable1Values,
    y: variable2Values,
    type: 'scatter',
    mode: 'markers',
    marker: {
        size: 10,
        color: correlationStrength,  // Color by correlation
        colorscale: 'RdYlGn',        // Red-Yellow-Green
        showscale: true
    },
    text: dates,  // Show date on hover
    hovertemplate: '<b>Date</b>: %{text}<br>' +
                   '<b>Variable 1</b>: %{x}<br>' +
                   '<b>Variable 2</b>: %{y}<extra></extra>'
};
```

## Axis Configuration

### X-Axis (Usually Date)

```typescript
xaxis: {
    title: 'Date',
    type: 'date',              // Automatic date parsing
    tickformat: '%Y-%m-%d',    // Date format
    showgrid: true,
    gridcolor: '#e0e0e0',
    zeroline: false,
    rangeselector: {           // Date range selector
        buttons: [
            { count: 7, label: '1w', step: 'day', stepmode: 'backward' },
            { count: 1, label: '1m', step: 'month', stepmode: 'backward' },
            { count: 3, label: '3m', step: 'month', stepmode: 'backward' },
            { step: 'all', label: 'All' }
        ]
    },
    rangeslider: { visible: true }  // Zoom slider
}
```

### Y-Axis (Numeric Variables)

```typescript
yaxis: {
    title: 'Variable Name',
    showgrid: true,
    gridcolor: '#e0e0e0',
    zeroline: true,
    zerolinecolor: '#999',
    zerolinewidth: 1,
    autorange: true,           // Auto-scale to data
    rangemode: 'tozero'        // Always show zero
}
```

### Dual Y-Axis Configuration

```typescript
yaxis: {
    title: 'Left Axis',
    side: 'left',
    showgrid: true
},
yaxis2: {
    title: 'Right Axis',
    side: 'right',
    overlaying: 'y',           // Overlay on same plot
    showgrid: false            // Hide grid for clarity
}
```

## Interactive Features

### 1. Hover Tooltips

```typescript
trace: {
    hovertemplate: 
        '<b>Date</b>: %{x}<br>' +
        '<b>Value</b>: %{y:.2f}<br>' +
        '<extra></extra>',      // Remove trace name from hover
    hoverlabel: {
        bgcolor: 'white',
        bordercolor: '#333',
        font: { size: 14, color: '#333' }
    }
}

layout: {
    hovermode: 'closest'       // Show tooltip for nearest point
    // or 'x' for all points at same x-value
    // or 'y' for all points at same y-value
}
```

### 2. Click Events

```typescript
plotDiv.on('plotly_click', (data) => {
    const point = data.points[0];
    console.log('Clicked:', {
        x: point.x,
        y: point.y,
        date: point.data.x[point.pointIndex],
        value: point.data.y[point.pointIndex]
    });
    
    // Example: Show details modal
    showDataPointDetails(point);
});
```

### 3. Zoom and Pan

```typescript
config: {
    scrollZoom: true,          // Zoom with mouse wheel
    displayModeBar: true,      // Show toolbar
    modeBarButtonsToRemove: [  // Hide specific tools
        'lasso2d',
        'select2d'
    ],
    displaylogo: false         // Hide Plotly logo
}

layout: {
    dragmode: 'pan'            // Default interaction mode
    // or 'zoom', 'select', 'lasso'
}
```

### 4. Legend Interaction

```typescript
layout: {
    showlegend: true,
    legend: {
        x: 0.5,
        y: 1.1,
        xanchor: 'center',
        yanchor: 'bottom',
        orientation: 'horizontal',
        bgcolor: 'rgba(255, 255, 255, 0.9)',
        bordercolor: '#ccc',
        borderwidth: 1
    }
}

// Clicking legend toggles trace visibility
```

## Responsive Design

### Auto-Resize

```typescript
const config = {
    responsive: true           // Auto-resize on window resize
};

Plotly.newPlot('plot', traces, layout, config);

// Manual resize trigger
window.addEventListener('resize', () => {
    Plotly.Plots.resize('plot');
});
```

### Mobile Optimization

```typescript
// Detect mobile device
const isMobile = window.innerWidth < 768;

const layout = {
    margin: isMobile 
        ? { t: 30, b: 50, l: 40, r: 20 }  // Smaller margins
        : { t: 50, b: 50, l: 60, r: 60 },
    
    font: {
        size: isMobile ? 10 : 12          // Smaller font
    },
    
    legend: {
        orientation: isMobile ? 'vertical' : 'horizontal',
        x: isMobile ? 1 : 0.5,
        y: isMobile ? 1 : 1.1
    }
};
```

## Styling and Theming

### Custom Colors

```typescript
const colors = {
    primary: '#3498db',      // Blue
    secondary: '#e74c3c',    // Red
    success: '#4CAF50',      // Green
    warning: '#ff9800',      // Orange
    gray: '#95a5a6'          // Gray
};

const traces = [
    { ...trace1, line: { color: colors.primary } },
    { ...trace2, line: { color: colors.secondary } }
];
```

### Plot Background

```typescript
layout: {
    paper_bgcolor: '#ffffff',   // Outer background
    plot_bgcolor: '#f9f9f9',    // Plot area background
    
    // Grid styling
    xaxis: {
        gridcolor: '#e0e0e0',
        gridwidth: 1
    },
    yaxis: {
        gridcolor: '#e0e0e0',
        gridwidth: 1
    }
}
```

### Font Configuration

```typescript
layout: {
    font: {
        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
        size: 12,
        color: '#2c3e50'
    },
    
    title: {
        font: {
            size: 18,
            color: '#2c3e50',
            family: 'inherit'
        }
    },
    
    xaxis: {
        title: {
            font: { size: 14 }
        },
        tickfont: { size: 11 }
    }
}
```

## Performance Optimization

### 1. Data Sampling for Large Datasets

```typescript
function sampleData(data: any[], maxPoints: number = 1000): any[] {
    if (data.length <= maxPoints) {
        return data;
    }
    
    const step = Math.ceil(data.length / maxPoints);
    return data.filter((_, i) => i % step === 0);
}

// Apply to plot data
const sampledX = sampleData(xData);
const sampledY = sampleData(yData);
```

### 2. Update Instead of Recreate

```typescript
// Efficient update (when only data changes)
Plotly.update('plot', {
    x: [newXData],
    y: [newYData]
}, {}, [0]);  // Update trace 0

// Instead of:
// Plotly.newPlot('plot', traces, layout);  // Expensive
```

### 3. Batch Updates

```typescript
// Update multiple properties at once
Plotly.update('plot', 
    { x: [newXData], y: [newYData] },   // Data updates
    { title: 'New Title' },              // Layout updates
    [0]                                  // Trace indices
);
```

## Export and Download

### Built-in Tools

```typescript
config: {
    toImageButtonOptions: {
        format: 'png',        // or 'svg', 'jpeg', 'webp'
        filename: 'data_plot',
        height: 600,
        width: 900,
        scale: 2              // Higher resolution
    }
}
```

### Programmatic Export

```typescript
async function downloadPlot() {
    const plot = document.getElementById('plot');
    
    // Export as image
    const image = await Plotly.toImage(plot, {
        format: 'png',
        width: 1200,
        height: 800
    });
    
    // Download
    const link = document.createElement('a');
    link.href = image;
    link.download = 'plot.png';
    link.click();
}
```

## Common Patterns

### 1. Empty State

```typescript
function updatePlot() {
    if (tableData.length === 0) {
        // Show empty state
        const layout = {
            xaxis: { visible: false },
            yaxis: { visible: false },
            annotations: [{
                text: 'No data to display',
                xref: 'paper',
                yref: 'paper',
                showarrow: false,
                font: { size: 20, color: '#999' }
            }]
        };
        Plotly.newPlot('plot', [], layout);
        return;
    }
    
    // Normal plot rendering
}
```

### 2. Loading State

```typescript
async function loadAndPlot() {
    // Show loading
    document.getElementById('plot').innerHTML = 
        '<div class="loading">Loading...</div>';
    
    // Fetch data
    const data = await fetchData();
    
    // Render plot
    updatePlot(data);
}
```

### 3. Error Handling

```typescript
function updatePlot() {
    try {
        // Validate data
        if (!xData || !yData) {
            throw new Error('Missing data');
        }
        
        if (xData.length !== yData.length) {
            throw new Error('Data length mismatch');
        }
        
        // Render plot
        Plotly.newPlot('plot', traces, layout, config);
        
    } catch (error) {
        console.error('Plot error:', error);
        
        // Show error message
        document.getElementById('plot').innerHTML = 
            `<div class="error">Error: ${error.message}</div>`;
    }
}
```

## Migration to SvelteKit

### Svelte Plotly Component

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import Plotly from 'plotly.js-dist';
  
  export let data: any[];
  export let xAxis: string;
  export let yAxis1: string;
  export let yAxis2: string;
  
  let plotDiv: HTMLDivElement;
  
  $: if (plotDiv && data.length > 0) {
    updatePlot();
  }
  
  function updatePlot() {
    const traces = createTraces(data, xAxis, yAxis1, yAxis2);
    const layout = createLayout(xAxis, yAxis1, yAxis2);
    
    Plotly.newPlot(plotDiv, traces, layout, { responsive: true });
  }
  
  onMount(() => {
    return () => {
      Plotly.purge(plotDiv);  // Cleanup
    };
  });
</script>

<div bind:this={plotDiv} class="plot-container"></div>

<style>
  .plot-container {
    width: 100%;
    height: 500px;
  }
</style>
```

### Reactive Updates

```svelte
<script>
  import PlotComponent from './PlotComponent.svelte';
  import { tableData } from './stores';
  
  let xAxis = 'Date';
  let yAxis1 = 'Variable_1';
  let yAxis2 = 'Variable_2';
</script>

<!-- Automatically updates when data or axes change -->
<PlotComponent 
  data={$tableData}
  {xAxis}
  {yAxis1}
  {yAxis2}
/>
```

**Benefits:**
- Automatic reactivity (no manual updates)
- Component reusability
- Better TypeScript integration
- Lifecycle management (cleanup)
