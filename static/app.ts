/**
* @fileoverview Functions that support the data table and plot.
* @author Dylan Shah
* Copyright 2025 Dylan Shah. All rights reserved.
*/

// Type definitions
interface RowData {
    Date: string;
    [key: string]: string | number;  // Date is string, all other values are numbers
}

// Global variables
let tableData: RowData[] = [];
let columnCounter: number = 0;  // Used to generate unique column names

// Get base URL from current path
const getBaseUrl = () => {
    const path = window.location.pathname;
    return path.substring(0, path.lastIndexOf('/') + 1);
};
const baseUrl = getBaseUrl();

/**
 * Get today's date in YYYY-MM-DD format using local timezone
 */
function getTodayLocal(): string {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];
}


// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check authentication first
        await displayUserName();

        // Load initial data from server
        const response = await fetch(baseUrl + 'get_data');
        const data = await response.json();
        
        // Update table data
        tableData = data;
        
        // Get columns, ensuring Date is first and maintaining order
        let columns: string[];
        if (data.length > 0) {
            // Extract columns from data, ensuring Date is first
            const dataColumns = Object.keys(data[0]);
            columns = ['Date', ...dataColumns.filter(col => col !== 'Date')];
            columnCounter = columns.length;
        } else {
            // No data, use default structure
            columns = ['Date', 'Variable 1', 'Variable 2'];
            tableData = [];
            columnCounter = columns.length;
        }
        
        // Initialize UI based on server data
        const headerRow = document.querySelector('#dataTable thead tr');
        const inputRow = document.querySelector('.input-row');
        if (!headerRow || !inputRow) return;

        // Set up headers
        headerRow.innerHTML = columns.map(col => 
            `<th contenteditable="${col !== 'Date'}" data-column="${col}">${col}</th>`
        ).join('');

        // Set up input row
        inputRow.innerHTML = columns.map(col => 
            col === 'Date' ?
                `<td><input type="date" id="${col}" placeholder="yyyy-mm-dd" min="2023-01-01" max="2026-12-31" value="${getTodayLocal()}" data-format="yyyy-mm-dd"></td>` :
                `<td><input type="number" id="${col}" placeholder="Enter value"></td>`
        ).join('');

        // Set up all event listeners
        setupColumnTitleListeners();
        setupDropZone();
        
        const xAxisSelect = document.getElementById('xAxis');
        const yAxis1Select = document.getElementById('yAxis1');
        const yAxis2Select = document.getElementById('yAxis2');
        
        if (xAxisSelect && yAxis1Select && yAxis2Select) {
            xAxisSelect.addEventListener('change', updatePlot);
            yAxis1Select.addEventListener('change', updatePlot);
            yAxis2Select.addEventListener('change', updatePlot);
        }

        // Initialize UI components
        renderTableRows();
        updateDropdownSelectors();
        updatePlot();
    } catch (error) {
        console.error('Error initializing application:', error);
    }
});

async function displayUserName() {
    try {
        const response = await fetch(baseUrl + 'auth-status');
        const data = await response.json();
        
        if (data.authenticated && data.email) {
            const userEmailElement = document.getElementById('user-email');
            if (userEmailElement) {
                userEmailElement.textContent = "Logged in as " + data.email;
            }
        }
    } catch (error) {
        console.error('Failed to display user name:', error);
    }
}

// Logout handling
async function handleLogout() {
    try {
        const result = await fetch(baseUrl + 'logout', {
            method: 'POST',
        });
        
        if (result.ok) {
            // Redirect to login page
            window.location.href = baseUrl + 'login';
        } else {
            console.error('Logout failed');
        }
    } catch (error) {
        console.error('Error during logout:', error);
    }
}

// Table operations (core functionality)

/**
 * Adds a new row of data to the table.
 * Collects values from input fields and updates server.
 */
function addRow(): void {
    // Get date input and ensure it's valid
    const dateInput = document.getElementById('Date') as HTMLInputElement;
    let date = dateInput.value;
    // If date is empty, use today's date
    if (!date) {
        const today = getTodayLocal();
        date = today;
        dateInput.value = today;
    }
    
    // Create new row object with all column values
    const newRow: RowData = {
        Date: date
    };
    const columnOrder = getColumnHeaders();
    columnOrder.forEach(key => {
        if (key !== 'Date') {
            const input = document.getElementById(key) as HTMLInputElement;
            const value = input ? input.value : '';
            newRow[key] = (value && value.trim() !== '') ? parseFloat(value) : 0;
        }
    });
    
    // Add to table data
    tableData.push(newRow);
    
    // Send new row to server
    fetch(baseUrl + 'add_row', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRow)
    });
    
    // Clear inputs
    dateInput.value = '';
    const columnNames = getColumnHeaders();
    columnNames.forEach(col => {
        if (col !== 'Date') {
            const input = document.getElementById(col) as HTMLInputElement;
            if (input) input.value = '';
        }
    });
    
    // Finish up: Update plot, log to console
    console.log('New row data:', newRow);
    renderTableRows();
    updatePlot();
}

/**
 * Renders all data rows in the table.
 * Clears existing rows and rebuilds table with current data.
 */
function renderTableRows(): void {
    const tableBody = document.querySelector('#dataTable tbody');
    if (!tableBody) return;
    
    const columnOrder = getColumnHeaders();
    
    // Clear existing rows except the input row
    const existingRows = tableBody.querySelectorAll('tr:not(.input-row)');
    existingRows.forEach(row => row.remove());
    
    // Add rows from tableData
    tableData.forEach((row, dataIndex) => {
        const newRow = document.createElement('tr');
        // Store the data index on the row element
        newRow.setAttribute('data-row-index', dataIndex.toString());
        
        // Add cells in the order of table headers
        columnOrder.forEach(key => {
            const value = row[key] !== undefined ? row[key] : '';
            const cell = document.createElement('td');
            cell.setAttribute('data-column', key);
            cell.setAttribute('contenteditable', 'true');
            // Ensure value is converted to string for textContent
            cell.textContent = typeof value === 'number' ? value.toString() : value;
            // Add visual cue for editable cells
            cell.classList.add('editable-cell');
            
            // Add validation and update handling
            cell.addEventListener('blur', function() {
                const newValue = this.textContent?.trim() || '';
                const columnName = this.getAttribute('data-column') || '';
                const parentRow = this.parentElement as HTMLTableRowElement;
                const rowIndex = parseInt(parentRow.getAttribute('data-row-index') || '-1');
                
                if (rowIndex === -1 || rowIndex >= tableData.length) {
                    console.error('Invalid row index:', rowIndex);
                    this.textContent = row[columnName].toString();
                    return;
                }
                
                // Validate based on column type
                if (columnName === 'Date') {
                    // Validate date format YYYY-MM-DD
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(newValue)) {
                        this.textContent = row[columnName].toString();
                        return;
                    }
                } else {
                    // Validate number
                    const num = parseFloat(newValue);
                    if (isNaN(num)) {
                        this.textContent = row[columnName].toString();
                        return;
                    }
                    // Update with formatted number
                    this.textContent = num.toString();
                }
                
                // Update data
                const updatedRow = {...tableData[rowIndex]};
                if (columnName === 'Date') {
                    updatedRow[columnName] = newValue;
                } else {
                    updatedRow[columnName] = parseFloat(newValue);
                }
                tableData[rowIndex] = updatedRow;
                
                // Send update to server
                console.log('Sending updated data to server:', tableData);
                fetch(baseUrl + 'replace_data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(tableData)
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => {
                            throw new Error(`Server error: ${err.message}`);
                        });
                    }
                    return response.json();
                })
                .then(result => {
                    console.log('Server update successful:', result);
                    updatePlot();
                })
                .catch(error => {
                    console.error('Failed to update server:', error);
                    // Revert the cell content if server update failed
                    this.textContent = row[columnName].toString();
                    tableData[rowIndex] = {...row};
                });
            });
            
            // Handle Enter key
            cell.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    cell.blur();
                }
            });
            
            newRow.appendChild(cell);
        });
        
        tableBody.appendChild(newRow);
    });
    
    // Finish up: Log table data
    console.log('Table data after render:', tableData);
}

/**
 * Clears all data from the table.
 * Prompts for confirmation before clearing.
 */
function clearAllData(): void {
    if (confirm('This will delete all data. Are you sure?')) {
        // Send clear request to server
        fetch(baseUrl + 'clear_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        }).then(() => {
            // Get fresh data structure from server
            return fetch(baseUrl + 'get_data');
        }).then(response => response.json())
        .then((data: RowData[]) => {
            // Update local state
            tableData = data;
            // Update UI
            renderTableRows();
            updatePlot();
        });
    }
}

/**
 * Resets the table to its default state.
 * Clears all data and resets column titles.
 */
function resetTable(): void {
    if (confirm('This will reset all columns to default and delete all data. Are you sure?')) {
        // Reset the table on the server
        fetch(baseUrl + 'reset_table', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        }).then(() => {
            // Get the fresh data from the server
            return fetch(baseUrl + 'get_data');
        }).then(response => response.json())
        .then((data: RowData[]) => {
            // Update local state with server data
            tableData = data;
            
            // Reset table headers based on server data structure
            const headerRow = document.querySelector('#dataTable thead tr');
            if (!headerRow) return;
            
            const columns = Object.keys(data[0] || { Date: '', 'Variable 1': '', 'Variable 2': '' });
            headerRow.innerHTML = columns.map(col => 
                `<th contenteditable="${col !== 'Date'}" data-column="${col}">${col}</th>`
            ).join('');
            
            // Reset input row
            const inputRow = document.querySelector('.input-row');
            if (!inputRow) return;
            
            inputRow.innerHTML = columns.map(col => 
                col === 'Date' ?
                    `<td><input type="date" id="${col}" placeholder="yyyy-mm-dd" min="2023-01-01" max="2026-12-31" value="${getTodayLocal()}" data-format="yyyy-mm-dd"></td>` :
                    `<td><input type="number" id="${col}" placeholder="Enter value"></td>`
            ).join('');
            
            // Set up event listeners before any UI updates
            setupColumnTitleListeners();
            
            // Update UI
            renderTableRows();
            updateDropdownSelectors();
            updatePlot();
            columnCounter = columns.length;
        }).catch(error => {
            console.error('Error resetting table:', error);
        });
    }
}

/**
 * Adds a new column to the table and updates server.
 */
function addColumn(): void {
    // Generate new column name
    const newColumnKey = `Variable ${columnCounter}`;
    columnCounter++;
    
    // Add header to table object (will be rendered in index.html)
    const headerRow = document.querySelector('#dataTable thead tr');
    if (!headerRow) return;
    const newHeader = document.createElement('th');
    newHeader.contentEditable = 'true';
    newHeader.setAttribute('data-column', newColumnKey);
    newHeader.textContent = newColumnKey;
    headerRow.appendChild(newHeader);
    
    // Add input cell to input row object (will be rendered in index.html)
    const inputRow = document.querySelector('.input-row');
    if (!inputRow) return;
    const newInputCell = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'number';
    input.id = `${newColumnKey}`;
    input.placeholder = 'Enter value';
    newInputCell.appendChild(input);
    inputRow.appendChild(newInputCell);
    
    // Add 0 as default value for existing data rows
    console.log('Before adding column, tableData[0]:', tableData[0]);
    tableData.forEach(row => {
        row[newColumnKey] = 0;
    });
    console.log('After adding column, tableData[0]:', tableData[0]);
    
    // Save changes to backend
    fetch(baseUrl + 'replace_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(tableData)
    }).then(response => {
        if (!response.ok) {
            console.error('Failed to save new column to backend');
        }
    }).catch(error => {
        console.error('Error saving new column:', error);
    });
    
    // Update the table display and plot controls
    renderTableRows();
    updateDropdownSelectors();
    
    // Set up listeners for the new column
    setupColumnTitleListeners();
}

/**
 * Gets the current order of columns in the table (by reading html), and returns the order
 */
function getColumnHeaders(): string[] { // TODO: Somewhat sketchy logic
    // First try to get headers from the DOM
    const headerElements = document.querySelectorAll('#dataTable thead th');
    if (headerElements.length > 0) {
        const columns = Array.from(headerElements).map(header => header.getAttribute('data-column') || '');
        if (columns.every(col => col !== '')) {
            console.log('getColumnHeaders returning from DOM:', columns);
            return columns;
        }
    }
    
    // Fallback to tableData if DOM headers not available
    if (tableData.length > 0) {
        const columns = Object.keys(tableData[0]);
        console.log('getColumnHeaders returning from tableData:', columns);
        return columns;
    }
    
    // Default columns if no other source available
    const defaultColumns = ['Date', 'Variable 1', 'Variable 2'];
    console.log('getColumnHeaders returning defaults:', defaultColumns);
    return defaultColumns;
}

function setupColumnTitleListeners(): void {
    const headers = document.querySelectorAll('#dataTable thead th');

    headers.forEach(header => {
        const column = header.getAttribute('data-column');
        if (!column) return;
        
        // Handle Enter key to save changes
        header.addEventListener('keydown', function(this: HTMLElement, e: Event) {
            const keyEvent = e as KeyboardEvent;
            if (keyEvent.key === 'Enter') {
                e.preventDefault();
                this.blur();
            }
        });

        // Handle title changes on blur
        header.addEventListener('blur', function(this: HTMLElement) {
            console.log('Header blur event fired');
            const newTitle = this.textContent?.trim();
            const oldKey = this.getAttribute('data-column');
            
            if (!newTitle || !oldKey) {
                if (oldKey) this.textContent = oldKey;
                return;
            }
            
            // If the text hasn't changed, do nothing
            if (newTitle === oldKey) {
                return;
            }
            
            const newKey = newTitle;
            
            console.log('Attempting to update column from', oldKey, 'to', newKey);
            
            // Skip if trying to rename to 'Date' or if new key already exists
            const existingColumns = getColumnHeaders();
            if (newKey === 'Date' || (newKey !== oldKey && existingColumns.includes(newKey))) {
                console.log('Invalid column name, reverting');
                this.textContent = oldKey;
                return;
            }
            
            // Update dropdowns if they were using this column
            const xAxisSelect = document.getElementById('xAxis') as HTMLSelectElement;
            const yAxis1Select = document.getElementById('yAxis1') as HTMLSelectElement;
            const yAxis2Select = document.getElementById('yAxis2') as HTMLSelectElement;
            
            // Update X-axis if it was using the old column
            if (xAxisSelect && xAxisSelect.value === oldKey) {
                xAxisSelect.value = newTitle;
            }
            
            // Update Y1-axis if it was using the old column
            if (yAxis1Select && yAxis1Select.value === oldKey) {
                yAxis1Select.value = newTitle;
            }
            
            // Update Y2-axis if it was using the old column
            if (yAxis2Select && yAxis2Select.value === oldKey) {
                yAxis2Select.value = newTitle;
            }
            
            // Update plot if any axis was using the renamed column
            if (xAxisSelect?.value === newTitle || 
                yAxis1Select?.value === newTitle || 
                yAxis2Select?.value === newTitle) {
                updatePlot();
            }
            
            // Get current dropdown selections before update
            const currentX = xAxisSelect.value;
            const currentY1 = yAxis1Select.value;
            const currentY2 = yAxis2Select.value;

            // Update table data first (our source of truth)
            console.log('Before update, tableData:', tableData);
            const updatedData = tableData.map(row => {
                const newRow = { ...row };
                if (oldKey in newRow) {
                    newRow[newKey] = newRow[oldKey];
                    delete newRow[oldKey];
                }
                return newRow;
            });
            tableData = updatedData;
            console.log('After update, tableData:', tableData);
            
            // Now update the DOM to match tableData
            this.setAttribute('data-column', newKey);
            const input = document.getElementById(oldKey) as HTMLInputElement;
            if (input) {
                input.id = newKey;
            }
            
            // Send data update to server
            fetch('./replace_data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData)
            });

            // Update dropdowns with new column name if they were using the old one
            updateDropdownSelectors(
                currentX === oldKey ? newKey : currentX,
                currentY1 === oldKey ? newKey : currentY1,
                currentY2 === oldKey ? newKey : currentY2
            );
            updatePlot();
        });

    });
}
// Visualizations and analysis
/**
 * Updates the scatter plot with current data.
 * Uses selected X and Y axes for plotting.
 */
function updatePlot(): void {
    const xAxisSelect = document.getElementById('xAxis') as HTMLSelectElement;
    const yAxis1Select = document.getElementById('yAxis1') as HTMLSelectElement;
    const yAxis2Select = document.getElementById('yAxis2') as HTMLSelectElement;
    
    const xAxis = xAxisSelect.value;
    const yAxis1 = yAxis1Select.value;
    const yAxis2 = yAxis2Select.value;
    
    // Sort data based on the x-axis
    const sortedData = [...tableData].sort((a, b) => {
        if (xAxis === 'Date') {
            return new Date(a[xAxis]).getTime() - new Date(b[xAxis]).getTime();
        }
        return (a[xAxis] as number) - (b[xAxis] as number);
    });
    
    // Create two traces with different colors
    const trace1: Partial<Plotly.PlotData> = {
        x: sortedData.map(d => d[xAxis]),
        y: sortedData.map(d => d[yAxis1]),
        mode: 'lines+markers',
        type: 'scatter',
        name: yAxis1,
        line: {
            color: '#1f77b4', // Blue
            width: 2
        },
        marker: {
            color: '#1f77b4',
            size: 8
        }
    };
    
    const trace2: Partial<Plotly.PlotData> = {
        x: sortedData.map(d => d[xAxis]),
        y: sortedData.map(d => d[yAxis2]),
        mode: 'lines+markers',
        type: 'scatter',
        name: yAxis2,
        line: {
            color: '#ff7f0e', // Orange
            width: 2
        },
        marker: {
            color: '#ff7f0e',
            size: 8
        }
    };

    // Format the layout
    const layout: Partial<Plotly.Layout> = {
        title: 'Your Data',
        xaxis: {
            title: xAxis,
            type: (xAxis === 'Date' ? 'date' : 'linear') as Plotly.AxisType,
            tickformat: xAxis === 'Date' ? '%m-%d' : undefined
        },
        yaxis: {
            title: 'Value',
            type: 'linear'
        },
        showlegend: true,
        legend: {
            x: 1,
            xanchor: 'right',
            y: 1
        }
    };
    
    // Update plot with both traces
    Plotly.newPlot('plot', [trace1, trace2], layout);
}

/**
 * Updates the X and Y axis dropdown selectors.
 * Populates options with current column titles.
 */
function updateDropdownSelectors(desiredX?: string, desiredY1?: string, desiredY2?: string): void {
    const xAxisSelect = document.getElementById('xAxis') as HTMLSelectElement;
    const yAxis1Select = document.getElementById('yAxis1') as HTMLSelectElement;
    const yAxis2Select = document.getElementById('yAxis2') as HTMLSelectElement;
    
    if (!xAxisSelect || !yAxis1Select || !yAxis2Select) return;
    
    // Clear existing options
    xAxisSelect.innerHTML = '';
    yAxis1Select.innerHTML = '';
    yAxis2Select.innerHTML = '';
    
    // Get column names
    const columnNames = getColumnHeaders();
    
    // Find non-Date columns for Y axes
    const nonDateColumns = columnNames.filter(col => col !== 'Date');
    
    // Populate X-axis dropdown (all columns)
    columnNames.forEach(col => {
        const xOption = document.createElement('option');
        xOption.value = col;
        xOption.textContent = col;
        xAxisSelect.appendChild(xOption);
    });
    
    // Populate Y-axis dropdowns (numeric columns)
    nonDateColumns.forEach(col => {
        const y1Option = document.createElement('option');
        y1Option.value = col;
        y1Option.textContent = col;
        yAxis1Select.appendChild(y1Option);
        
        const y2Option = document.createElement('option');
        y2Option.value = col;
        y2Option.textContent = col;
        yAxis2Select.appendChild(y2Option);
    });
    
    // Set X-axis default or desired value
    if (desiredX && columnNames.includes(desiredX)) {
        xAxisSelect.value = desiredX;
    } else {
        xAxisSelect.value = 'Date';
    }
    
    // Set Y1-axis default or desired value
    if (desiredY1 && nonDateColumns.includes(desiredY1)) {
        yAxis1Select.value = desiredY1;
    } else {
        yAxis1Select.value = nonDateColumns[0] || columnNames[0];
    }
    
    // Set Y2-axis default or desired value
    if (desiredY2 && nonDateColumns.includes(desiredY2)) {
        yAxis2Select.value = desiredY2;
    } else {
        // Select a different column than Y1 if possible
        const y1Value = yAxis1Select.value;
        const availableColumns = nonDateColumns.filter(col => col !== y1Value);
        yAxis2Select.value = availableColumns[0] || nonDateColumns[0] || columnNames[0];
    }
}

/**
 * Extract numeric values from a column, handling dates appropriately
 */
function extractNumericValues(columnName: string): { values: number[]; isValid: boolean } {
    let values: number[];
    const isDate = columnName === 'Date';

    if (isDate) {
        values = tableData.map(d => new Date(d[columnName]).getTime());
    } else {
        values = tableData.map(d => parseFloat(d[columnName] as string));
    }

    return {
        values,
        isValid: !values.some(isNaN)
    };
}

/**
 * Calculate correlations for all currently plotted variable pairs
 */
function calculateCorrelations(): void {
    const xAxis = (document.getElementById('xAxis') as HTMLSelectElement).value;
    const yAxis1 = (document.getElementById('yAxis1') as HTMLSelectElement).value;
    const yAxis2 = (document.getElementById('yAxis2') as HTMLSelectElement).value;
    const resultsDiv = document.getElementById('correlationResults');
    if (!resultsDiv) return;

    // Show loading state
    resultsDiv.innerHTML = 'Calculating correlations...';
    resultsDiv.style.backgroundColor = '#e3f2fd';

    // Extract values for all variables
    const xData = extractNumericValues(xAxis);
    const y1Data = extractNumericValues(yAxis1);
    const y2Data = extractNumericValues(yAxis2);

    // Check for invalid values
    if (!xData.isValid || !y1Data.isValid || !y2Data.isValid) {
        resultsDiv.innerHTML = 'Error: Some values could not be converted to numbers.';
        resultsDiv.style.backgroundColor = '#ffebee';
        return;
    }

    // Calculate correlations for all pairs
    Promise.all([
        // X vs Y1 correlation
        fetch(baseUrl + 'calculate_correlation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                x_values: xData.values,
                y_values: y1Data.values,
                xAxis,
                yAxis: yAxis1,
                isDateX: xAxis === 'Date',
                isDateY: yAxis1 === 'Date'
            })
        }),
        // X vs Y2 correlation
        fetch(baseUrl + 'calculate_correlation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                x_values: xData.values,
                y_values: y2Data.values,
                xAxis,
                yAxis: yAxis2,
                isDateX: xAxis === 'Date',
                isDateY: yAxis2 === 'Date'
            })
        }),
        // Y1 vs Y2 correlation
        fetch(baseUrl + 'calculate_correlation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                x_values: y1Data.values,
                y_values: y2Data.values,
                xAxis: yAxis1,
                yAxis: yAxis2,
                isDateX: yAxis1 === 'Date',
                isDateY: yAxis2 === 'Date'
            })
        })
    ])
    .then(responses => Promise.all(responses.map(r => r.json())))
    .then(results => {
        let resultHtml = '<div style="display: flex; flex-direction: column; gap: 10px;">';
        
        // Add results for each correlation pair
        const pairs = [
            { name: `${xAxis} vs ${yAxis1}`, result: results[0] },
            { name: `${xAxis} vs ${yAxis2}`, result: results[1] },
            { name: `${yAxis1} vs ${yAxis2}`, result: results[2] }
        ];

        pairs.forEach(({ name, result }) => {
            if (result.error) {
                resultHtml += `<div style="background-color: #ffebee; padding: 10px; border-radius: 4px;">
                    <strong>${name}:</strong> ${result.error}
                </div>`;
            } else {
                resultHtml += `<div style="background-color: #e8f5e9; padding: 10px; border-radius: 4px;">
                    <strong>${name}:</strong> ${result.interpretation}
                </div>`;
            }
        });

        resultHtml += '</div>';
        resultsDiv.innerHTML = resultHtml;
    })
    .catch(error => {
        resultsDiv.innerHTML = 'Error calculating correlation: ' + error;
        resultsDiv.style.backgroundColor = '#ffebee';
    });
}

/**
 * Calculate and display a correlation matrix for all numeric variables
 */
function calculateAllCorrelations(): void {
    const matrixDiv = document.getElementById('correlationMatrix');
    if (!matrixDiv) return;

    // Show loading state
    matrixDiv.innerHTML = '<div style="padding: 20px; text-align: center; background-color: #e3f2fd; border-radius: 4px;">Calculating correlation matrix...</div>';

    // Get all column names
    const columnNames = getColumnHeaders();

    // Extract values for all columns, including Date
    const columnData = columnNames.map(col => extractNumericValues(col));
    
    // Check for invalid values
    const invalidColumns = columnData.map((data, i) => !data.isValid ? columnNames[i] : null).filter(Boolean);
    if (invalidColumns.length > 0) {
        matrixDiv.innerHTML = `<div style="padding: 20px; text-align: center; background-color: #ffebee; border-radius: 4px;">
            Error: Invalid numeric values in columns: ${invalidColumns.join(', ')}
        </div>`;
        return;
    }

    // Create all pairs for correlation calculation
    const correlationPromises: Promise<any>[] = [];
    for (let i = 0; i < columnNames.length; i++) {
        for (let j = i; j < columnNames.length; j++) {
            correlationPromises.push(
                fetch(baseUrl + 'calculate_correlation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        x_values: columnData[i].values,
                        y_values: columnData[j].values,
                        xAxis: columnNames[i],
                        yAxis: columnNames[j],
                        isDateX: columnNames[i] === 'Date',
                        isDateY: columnNames[j] === 'Date'
                    })
                })
            );
        }
    }

    // Wait for all correlations to complete
    Promise.all(correlationPromises)
        .then(responses => Promise.all(responses.map(r => r.json())))
        .then(results => {
            // Create correlation matrix data
            const matrix: (number | null)[][] = Array(columnNames.length).fill(0)
                .map(() => Array(columnNames.length).fill(null));
            
            // Fill matrix with correlation values
            let resultIndex = 0;
            for (let i = 0; i < columnNames.length; i++) {
                for (let j = i; j < columnNames.length; j++) {
                    const correlation = results[resultIndex].correlation || 0;
                    if (i <= j) {  // Skip diagonal
                        matrix[j][i] = correlation;  // Only fill upper triangle
                    }
                    resultIndex++;
                }
            }

            // Create Plotly heatmap
            const data: any = [{
                z: matrix,
                x: columnNames,
                y: columnNames,
                type: 'heatmap',
                colorscale: [
                    ['0.0', '#d73027'],  // Strong negative (red)
                    ['0.25', '#f46d43'], // Moderate negative (orange-red)
                    ['0.5', '#ffffff'],  // No correlation (white)
                    ['0.75', '#74add1'], // Moderate positive (light blue)
                    ['1.0', '#4575b4']   // Strong positive (blue)
                ],
                zmin: -1,
                zmax: 1,
                text: matrix.map((row, i) => 
                    row.map((val, j) => {
                        if (val === null) return '';
                        return `${columnNames[i]} vs ${columnNames[j]}<br>r = ${val.toFixed(3)}`;
                    })
                ),
                hoverongaps: false,
                hoverinfo: 'text'
            }];

            const layout: Partial<Plotly.Layout> = {
                // title: {
                //     text: 'Correlation Matrix Heatmap',
                //     font: {
                //         size: 24
                //     },
                //     y: 0.95
                // },
                width: 1000,   // Fixed width that works well with container
                height: 600,   // Shorter height
                margin: {
                    l: 60,   // Reduced margins
                    r: 60,
                    t: 40,
                    b: 40
                },
                xaxis: {
                    side: 'top',  // Move labels to top
                    tickangle: 0,
                },
                yaxis: {
                    side: 'left',
                    tickangle: 0
                },
                annotations: matrix.map((row, i) => 
                    row.map((val, j) => ({
                        text: val === null ? '' : val.toFixed(2),
                        x: j,
                        y: i,
                        xref: 'x' as const,  // Type assertion to match Plotly's expected type
                        yref: 'y' as const,
                        showarrow: false,
                        font: {
                            color: val === null ? 'transparent' : (Math.abs(val) > 0.5 ? 'white' : 'black')
                        }
                    }))
                ).flat()
            };

            // Find strongest correlation (excluding self-correlations)
            let maxCorr = 0;
            let maxI = 0;
            let maxJ = 0;
            matrix.forEach((row, i) => {
                row.forEach((val, j) => {
                    if (val !== null && i !== j && Math.abs(val) > Math.abs(maxCorr)) {
                        maxCorr = val;
                        maxI = i;
                        maxJ = j;
                    }
                });
            });

            // Create message about strongest correlation
            const corrMessage = `<div style="text-align: center; margin: 10px 0; padding: 10px; background-color: #e3f2fd; border-radius: 4px;">
                The most strongly correlated variables were ${columnNames[maxI]} and ${columnNames[maxJ]} (r = ${maxCorr.toFixed(3)}).
            </div>`;

            // Plot the correlation matrix and output the main correlated variables
            matrixDiv.innerHTML = corrMessage;
            Plotly.newPlot('correlationMatrix', data, layout);
        })
        .catch(error => {
            matrixDiv.innerHTML = `<div style="padding: 20px; text-align: center; background-color: #ffebee; border-radius: 4px;">
                Error calculating correlation matrix: ${error}
            </div>`;
        });
}

// UI Update Functions

/**
 * Clears the correlation matrix and its container
 */
function clearCorrelationMatrix(): void {
    const matrixDiv = document.getElementById('correlationMatrix');
    if (matrixDiv) {
        matrixDiv.innerHTML = '';
        // Also remove any Plotly events/data
        Plotly.purge(matrixDiv);
    }
}

function updateTableHeaders(): void {
    const headerRow = document.querySelector('#dataTable thead tr');
    if (headerRow) {
        const columnNames = getColumnHeaders();
        // Create headers array with Date first
        const headers = columnNames.map(col => 
            `<th contenteditable="${col !== 'Date'}" data-column="${col}">${col}</th>`
        );
        headerRow.innerHTML = headers.join('');
        
        // Reattach event listeners to the new header elements
        setupColumnTitleListeners();
    }
}

function updateInputRow(): void {
    const inputRow = document.querySelector('.input-row');
    if (inputRow) {
        const columnNames = getColumnHeaders();
        // Create input cells array
        const inputs = columnNames.map(col => {
            if (col === 'Date') {
                return `<td><input type="date" id="${col}" placeholder="yyyy-mm-dd" min="2023-01-01" max="2026-12-31" value="${getTodayLocal()}" data-format="yyyy-mm-dd"></td>`;
            } else {
                return `<td><input type="number" id="${col}" placeholder="Enter value"></td>`;
            }
        });
        inputRow.innerHTML = inputs.join('');
    }
}

function setupDropZone(): void {
    const dropZone = document.querySelector('.drop-zone');
    if (dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        dropZone.addEventListener('drop', async (e) => {
            const file = (e as DragEvent).dataTransfer?.files[0];
            const allowedExtensions = ['.csv', '.xlsx', '.xls'];
            const fileExt = file?.name.toLowerCase().match(/\.[^.]*$/)?.[0] || '';
            if (!file || !allowedExtensions.some(ext => fileExt === ext)) {
                alert('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
                return;
            }
            
            const formData = new FormData();
            formData.append('file', file);
            
            try {
                const response = await fetch(baseUrl + 'import_datafile', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || 'Error importing CSV');
                }

                // Update table data
                tableData = result.data;
                updateTableHeaders();
                updateInputRow();
                renderTableRows();
                updateDropdownSelectors();
                updatePlot();
                
                alert(result.message);
            } catch (error) {
                alert(error instanceof Error ? error.message : 'Error importing CSV');
            }
        });
    }
}
