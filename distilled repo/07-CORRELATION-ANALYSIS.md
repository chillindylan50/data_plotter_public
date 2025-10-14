# Statistical Analysis and Correlation

## Overview

Pearson correlation calculation between numeric variables using SciPy. Results cached in database for performance and chat context.

## Correlation Fundamentals

**Pearson Correlation Coefficient (r):**
- Range: -1 to +1
- r = 1: Perfect positive correlation
- r = 0: No linear correlation
- r = -1: Perfect negative correlation

**Strength Classification:**
- |r| > 0.7: Strong
- |r| > 0.3: Moderate
- |r| > 0.1: Weak
- |r| ≤ 0.1: Very weak/none

**Statistical Significance:**
- p-value < 0.05: Significant (95% confidence)
- p-value ≥ 0.05: Not significant

## Technology

- SciPy 1.16.0: `stats.pearsonr()` for calculations
- Pandas 2.2.3: DataFrame operations
- NumPy 2.3.2: Numeric arrays

## Correlation Types

### 1. Pairwise (Plotted Variables)
Calculate correlation between two currently displayed variables.

**Process:**
1. Extract x and y values
2. Validate data (min 2 points, no constants)
3. Calculate Pearson correlation
4. Round to 3 decimals
5. Generate interpretation

### 2. Full Matrix (All Variables)
Calculate all pairwise correlations.

**Process:**
1. Load all user data
2. Convert to DataFrame
3. Identify numeric columns
4. Calculate for each pair
5. Store results in database
6. Used for correlation matrix display

## Interpretation

**Natural Language Generation:**
- Strength: weak/moderate/strong
- Direction: positive/negative
- Significance: significant/not significant

**Example:**
"There is a strong positive correlation between Sleep_Hours and Mood_Score (r=0.857). This is statistically significant (p=0.001)."

## Special Cases

**Date Correlations:**
- Convert dates to timestamps
- Detect trends over time
- Positive: Increasing trend
- Negative: Decreasing trend

**Missing Data:**
- Only use rows where both values exist
- Align data by common indices
- Need minimum 2 complete pairs

**Constant Values:**
- Cannot calculate correlation
- Check standard deviation ≠ 0
- Return error if constant

## Correlation Matrix

**Visualization:**
- Color-coded heatmap
- Red: Negative correlations
- Green: Positive correlations
- Intensity: Strength

**Features:**
- Diagonal is always 1.0 (self-correlation)
- Significance marked with *
- Click cell to plot those variables

## Chat Context Integration

**Top Correlations:**
- Get strongest 3 correlations
- Include in chat context
- Help AI provide insights
- Updated when correlations recalculated

## Caching Strategy

**Performance:**
- Calculate once
- Store in database
- Fast retrieval
- Recalculate on data changes

**Benefits:**
- No repeated calculations
- Consistent results
- Enables historical analysis

## SvelteKit Migration

**Changes:**
- Move correlation logic to server
- Use Prisma for storage
- TypeScript throughout
- Consider Web Workers for heavy calculations

**JavaScript Statistics:**
- Use simple-statistics library
- Or keep Python backend for complex stats
- Or call API endpoint

**Benefits:**
- Type-safe calculations
- Better error handling
- Streaming results for large datasets
