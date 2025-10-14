# Statistical Analysis and Correlation Calculation

## Overview

The application calculates Pearson correlations between numeric variables using SciPy's statistical functions. Results are cached in the database and used for both visualization and AI chat context.

## Correlation Fundamentals

### Pearson Correlation Coefficient (r)

**Range**: -1 to +1

**Interpretation:**
- **r = 1**: Perfect positive correlation
- **r = 0**: No linear correlation
- **r = -1**: Perfect negative correlation

**Strength Classification:**
```
|r| > 0.7:  Strong correlation
|r| > 0.3:  Moderate correlation
|r| > 0.1:  Weak correlation
|r| ≤ 0.1:  Very weak/no correlation
```

### Statistical Significance (p-value)

**p-value < 0.05**: Statistically significant (95% confidence)
**p-value ≥ 0.05**: Not statistically significant

## Technology Stack

- **SciPy 1.16.0**: `stats.pearsonr()` for correlation calculation
- **Pandas 2.2.3**: DataFrame operations for data processing
- **NumPy 2.3.2**: Numeric array operations

## Correlation Types

### 1. Pairwise Correlation (Plotted Variables)

Calculate correlation between two currently plotted variables.

**Frontend Request:**
```typescript
async function calculateCorrelation(): Promise<void> {
    const xAxis = document.getElementById('xAxis').value;
    const yAxis = document.getElementById('yAxis1').value;
    
    // Extract values from tableData
    const xValues = tableData
        .map(row => row[xAxis])
        .filter(v => v !== null && v !== undefined);
    
    const yValues = tableData
        .map(row => row[yAxis])
        .filter(v => v !== null && v !== undefined);
    
    const response = await fetch('/calculate_correlation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            xAxis: xAxis,
            yAxis: yAxis,
            xValues: xValues,
            yValues: yValues
        })
    });
    
    const result = await response.json();
    displayCorrelationResult(result);
}
```

**Backend Processing:**
```python
@app.route('/calculate_correlation', methods=['POST'])
def calculate_correlation():
    """Calculate Pearson correlation for two variables."""
    data = request.json
    x_values = data['xValues']
    y_values = data['yValues']
    
    # Data validation
    if len(x_values) != len(y_values) or len(x_values) < 2:
        return jsonify({
            "error": "Need at least 2 numeric data points for correlation"
        }), 400
    
    # Convert to float arrays
    try:
        x_values = [float(x) for x in x_values]
        y_values = [float(y) for y in y_values]
    except (ValueError, TypeError):
        return jsonify({
            "error": "Invalid numeric values"
        }), 400
    
    # Check for constant values (zero variance)
    stdev_x = stats.tstd(x_values)
    stdev_y = stats.tstd(y_values)
    if stdev_x == 0 or stdev_y == 0:
        return jsonify({
            "error": "Cannot calculate correlation with constant values"
        }), 400
    
    # Calculate Pearson correlation
    correlation, p_value = stats.pearsonr(x_values, y_values)
    correlation = round(correlation, 3)
    p_value = round(p_value, 3)
    
    return jsonify({
        "correlation": correlation,
        "p_value": p_value,
        "interpretation": interpret_correlation(
            correlation, p_value, 
            data['xAxis'], data['yAxis']
        )
    })
```

### 2. Full Correlation Matrix (All Variables)

Calculate correlations for all numeric variable pairs.

**Database Service Layer:**
```python
def calculate_correlations(user_id: str) -> None:
    """Calculate all pairwise correlations for user's data."""
    try:
        # Clear existing correlations
        CorrelationResult.query.filter_by(user_id=user_id).delete()
        
        # Load user data
        data_points = load_user_data(user_id)
        if len(data_points) < 2:
            logger.info(f'Not enough data for correlations')
            db.session.commit()
            return
        
        # Convert to DataFrame
        df = pd.DataFrame(data_points)
        
        # Identify numeric columns (exclude Date)
        numeric_columns = []
        for col in df.columns:
            if col != 'Date':
                try:
                    df[col] = pd.to_numeric(df[col], errors='coerce')
                    if not df[col].isna().all():
                        numeric_columns.append(col)
                except:
                    continue
        
        if len(numeric_columns) < 2:
            logger.info(f'Not enough numeric columns')
            db.session.commit()
            return
        
        # Calculate correlations for all pairs
        for i, col_x in enumerate(numeric_columns):
            for col_y in numeric_columns[i+1:]:
                # Get values and align data
                x_values = df[col_x].dropna()
                y_values = df[col_y].dropna()
                
                # Use common indices (both values exist)
                common_indices = x_values.index.intersection(y_values.index)
                if len(common_indices) < 2:
                    continue
                
                x_aligned = x_values.loc[common_indices]
                y_aligned = y_values.loc[common_indices]
                
                # Check for constant values
                if x_aligned.std() == 0 or y_aligned.std() == 0:
                    continue
                
                # Calculate correlation
                correlation, p_value = stats.pearsonr(x_aligned, y_aligned)
                
                # Classify strength and direction
                strength = get_correlation_strength(abs(correlation))
                direction = 'positive' if correlation > 0 else 'negative'
                
                # Store in database
                result = CorrelationResult(
                    user_id=user_id,
                    variable_x=col_x,
                    variable_y=col_y,
                    correlation=round(correlation, 3),
                    p_value=round(p_value, 3),
                    strength=strength,
                    direction=direction
                )
                db.session.add(result)
        
        db.session.commit()
        logger.info(f'Calculated correlations for user {user_id}')
        
    except Exception as e:
        logger.error(f'Error calculating correlations: {str(e)}')
        db.session.rollback()
        raise
```

**Strength Classification Helper:**
```python
def get_correlation_strength(abs_correlation: float) -> str:
    """Classify correlation strength from absolute value."""
    if abs_correlation > 0.7:
        return "strong"
    elif abs_correlation > 0.3:
        return "moderate"
    elif abs_correlation > 0.1:
        return "weak"
    else:
        return "very weak"
```

## Correlation Interpretation

### Natural Language Interpretation

```python
def interpret_correlation(
    correlation: float, 
    p_value: float, 
    x_display: str, 
    y_display: str
) -> str:
    """Generate human-readable interpretation."""
    
    # Classify strength
    strength = "no"
    if abs(correlation) > 0.7:
        strength = "strong"
    elif abs(correlation) > 0.3:
        strength = "moderate"
    elif abs(correlation) > 0.1:
        strength = "weak"
    
    # Determine direction
    direction = "positive" if correlation > 0 else "negative"
    
    # Assess significance
    significance = "significant" if p_value < 0.05 else "not significant"
    
    # Generate interpretation
    if abs(correlation) < 0.1:
        return (
            f"There is very little correlation between {x_display} and {y_display} "
            f"(correlation = {correlation:.3f}). "
            f"This is statistically {significance} (p = {p_value:.3f})."
        )
    
    return (
        f"There is a {strength} {direction} correlation between "
        f"{x_display} and {y_display} (correlation = {correlation:.3f}). "
        f"This is statistically {significance} (p = {p_value:.3f})."
    )
```

**Example Outputs:**
```
"There is a strong positive correlation between Sleep_Hours and Mood_Score 
(correlation = 0.857). This is statistically significant (p = 0.001)."

"There is a moderate negative correlation between Caffeine_Intake and Sleep_Quality 
(correlation = -0.543). This is statistically significant (p = 0.023)."

"There is very little correlation between Steps and Temperature 
(correlation = 0.087). This is statistically not significant (p = 0.421)."
```

## Special Cases

### 1. Date Correlations

Dates are converted to numeric timestamps for correlation calculation.

```python
# Check if variable is Date
is_date_x = (xAxis == 'Date')
is_date_y = (yAxis == 'Date')

# Convert dates to timestamps (milliseconds since epoch)
if is_date_x:
    x_values = [Date.parse(x) for x in x_values]  # JavaScript
    x_values = [x / (1000 * 60 * 60 * 24) for x in x_values]  # Convert to days

# Similar for y_values
```

**Use Case:** Detect trends over time
- Positive correlation with Date: Increasing trend
- Negative correlation with Date: Decreasing trend

### 2. Missing Data Handling

```python
# Align data - only use rows where both values exist
common_indices = x_values.index.intersection(y_values.index)
x_aligned = x_values.loc[common_indices]
y_aligned = y_values.loc[common_indices]

# Check minimum data points
if len(common_indices) < 2:
    raise ValueError("Need at least 2 complete data points")
```

### 3. Constant Values

```python
# Check for zero variance (all values the same)
if x_aligned.std() == 0 or y_aligned.std() == 0:
    raise ValueError("Cannot calculate correlation with constant values")
```

## Correlation Matrix Visualization

### Heatmap Generation

**Frontend Rendering:**
```typescript
function renderCorrelationMatrix(correlations: any[]): void {
    const container = document.getElementById('correlationMatrix');
    
    // Extract unique variables
    const variables = new Set<string>();
    correlations.forEach(c => {
        variables.add(c.variable1);
        variables.add(c.variable2);
    });
    const varArray = Array.from(variables);
    
    // Create matrix table
    let html = '<table class="correlation-matrix">';
    
    // Header row
    html += '<tr><th></th>';
    varArray.forEach(v => {
        html += `<th>${v}</th>`;
    });
    html += '</tr>';
    
    // Data rows
    varArray.forEach(row_var => {
        html += `<tr><th>${row_var}</th>`;
        
        varArray.forEach(col_var => {
            if (row_var === col_var) {
                // Diagonal: perfect correlation with self
                html += '<td class="diagonal">1.00</td>';
            } else {
                // Find correlation
                const corr = correlations.find(c =>
                    (c.variable1 === row_var && c.variable2 === col_var) ||
                    (c.variable1 === col_var && c.variable2 === row_var)
                );
                
                if (corr) {
                    const color = getCorrelationColor(corr.correlation);
                    const sigMark = corr.p_value < 0.05 ? '*' : '';
                    html += `<td style="background-color: ${color}">${corr.correlation}${sigMark}</td>`;
                } else {
                    html += '<td class="empty">-</td>';
                }
            }
        });
        html += '</tr>';
    });
    html += '</table>';
    
    container.innerHTML = html;
}

function getCorrelationColor(r: number): string {
    // Color scale from red (negative) to green (positive)
    const abs_r = Math.abs(r);
    
    if (r > 0) {
        // Positive: white to green
        const intensity = Math.floor(abs_r * 200);
        return `rgb(${255 - intensity}, 255, ${255 - intensity})`;
    } else {
        // Negative: white to red
        const intensity = Math.floor(abs_r * 200);
        return `rgb(255, ${255 - intensity}, ${255 - intensity})`;
    }
}
```

### Matrix Features

1. **Color Coding**:
   - Strong positive: Dark green
   - Weak positive: Light green
   - No correlation: White
   - Weak negative: Light red
   - Strong negative: Dark red

2. **Significance Markers**:
   - `*` indicates p < 0.05 (significant)
   - No marker: not significant

3. **Interactive Elements**:
   - Click cell to plot those variables
   - Hover for detailed interpretation

## Chat Context Integration

### Top Correlations for AI

```python
def get_top_correlations(user_id: str, count: int = 3) -> List[Dict[str, Any]]:
    """Get strongest correlations for chat context."""
    correlations = CorrelationResult.query.filter_by(user_id=user_id).all()
    
    # Sort by absolute correlation strength
    sorted_correlations = sorted(
        correlations, 
        key=lambda x: abs(x.correlation), 
        reverse=True
    )[:count]
    
    return [
        {
            'variable1': corr.variable_x,
            'variable2': corr.variable_y,
            'correlation': corr.correlation,
            'p_value': corr.p_value,
            'strength': corr.strength,
            'direction': corr.direction
        }
        for corr in sorted_correlations
    ]
```

**Chat Message with Context:**
```typescript
async function sendChatMessage(message: string): Promise<void> {
    // Get top correlations for context
    const correlations = await fetch('/api/correlations?limit=3').then(r => r.json());
    
    const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: message,
            correlations: correlations.correlations
        })
    });
    
    const result = await response.json();
    addMessageToChat('assistant', result.response);
}
```

## Performance Optimization

### 1. Caching Strategy

```python
# Calculate once, store in database
def add_data_point(user_id: str, data_point: Dict) -> None:
    # Add data point
    save_data_point(user_id, data_point)
    
    # Recalculate correlations (async in production)
    calculate_correlations(user_id)
```

**Benefits:**
- Fast correlation retrieval (no recalculation)
- Consistent results across sessions
- Enables historical analysis

### 2. Incremental Updates

For large datasets, consider incremental correlation updates:

```python
def update_single_correlation(user_id: str, var_x: str, var_y: str) -> None:
    """Update correlation for specific variable pair."""
    # Delete existing
    CorrelationResult.query.filter_by(
        user_id=user_id,
        variable_x=var_x,
        variable_y=var_y
    ).delete()
    
    # Recalculate just this pair
    data = load_user_data(user_id)
    x_values = [d[var_x] for d in data]
    y_values = [d[var_y] for d in data]
    
    correlation, p_value = stats.pearsonr(x_values, y_values)
    
    # Store updated result
    result = CorrelationResult(...)
    db.session.add(result)
    db.session.commit()
```

## Migration to SvelteKit

### SvelteKit Server Action

```typescript
// +page.server.ts
import { correlation } from '$lib/stats';

export const actions = {
  calculateCorrelation: async ({ request, locals }) => {
    const data = await request.formData();
    const xValues = JSON.parse(data.get('xValues'));
    const yValues = JSON.parse(data.get('yValues'));
    
    const result = correlation.pearson(xValues, yValues);
    
    return {
      correlation: result.r,
      pValue: result.p,
      interpretation: correlation.interpret(result)
    };
  }
};
```

### Client-Side Reactivity

```svelte
<script lang="ts">
  import { writable } from 'svelte/store';
  
  export let data;
  
  let correlations = writable([]);
  
  $: if (data.tableData.length >= 2) {
    // Auto-recalculate when data changes
    calculateAllCorrelations();
  }
</script>
```

**Benefits:**
- Automatic reactivity
- Type-safe statistical functions
- Better error handling
- Streaming results for large calculations
