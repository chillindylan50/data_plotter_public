/**
* @fileoverview Functions that support the data table and plot.
* Chat interface helpers live in the "Chat Interface Functions" section.
* © 2025 Dylan Shah. All rights reserved.
*/

// Type definitions
interface RowData {
    Date: string;
    [key: string]: string | number;  // Date is string, all other values are numbers
}

// Global variables
let tableData: RowData[] = [];
let columnCounter: number = 0;  // Used to generate unique column names

// Chat-related global variables
let chatSessionId: number | null = null;
let lastCorrelations: any[] = [];
let isChatOpen: boolean = false;

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

        // Initialize table and plot
        updateTableHeaders();
        updateInputRow();
        renderTableRows();
        updateDropdownSelectors();
        updatePlot();
        
        // Initialize chat interface
        initializeChatInterface();
        
    } catch (error) {
        console.error('Error initializing app:', error);
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

// Clear current chat session history (backend and UI)
async function clearChat(): Promise<void> {
    try {
        const response = await fetch('/api/chat/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: chatSessionId })
        });
        const result = await response.json();
        if (result.success) {
            // Clear messages in UI
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) chatMessages.innerHTML = '';
            // Reload (will be empty)
            await loadChatHistory();
        } else {
            alert(result.error || 'Failed to clear chat history');
        }
    } catch (error) {
        console.error('Error clearing chat history:', error);
        alert('Error clearing chat history');
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
// ===========================
// Visualizations and Analysis
// ===========================
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
 * Calculate and display a correlation matrix for all numeric variables using server-side calculation
 */
async function calculateAllCorrelations(): Promise<void> {
    const matrixDiv = document.getElementById('correlationMatrix');
    if (!matrixDiv) return;

    // Show loading state
    matrixDiv.innerHTML = '<div style="padding: 20px; text-align: center; background-color: #e3f2fd; border-radius: 4px;">Calculating correlation matrix...</div>';

    try {
        // Trigger server-side correlation calculation
        const calculateResponse = await fetch('/api/correlations/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!calculateResponse.ok) {
            throw new Error('Failed to calculate correlations');
        }

        // Get all calculated correlations
        const correlationsResponse = await fetch('/api/correlations/all');
        const result = await correlationsResponse.json();

        if (!correlationsResponse.ok) {
            throw new Error(result.error || 'Failed to get correlations');
        }

        displayCorrelationMatrix(result.correlations);
        
        // Update chat correlation context if chat is open
        if (isChatOpen) {
            await updateCorrelationContext();
        }

    } catch (error) {
        matrixDiv.innerHTML = `<div style="padding: 20px; text-align: center; background-color: #ffebee; border-radius: 4px;">
            Error calculating correlations: ${error instanceof Error ? error.message : 'Unknown error'}
        </div>`;
    }
}

/**
 * Display correlation matrix from server-calculated correlations as a Plotly heatmap
 */
function displayCorrelationMatrix(correlations: any[]): void {
    const matrixDiv = document.getElementById('correlationMatrix');
    if (!matrixDiv) return;

    if (correlations.length === 0) {
        matrixDiv.innerHTML = '<div style="padding: 20px; text-align: center; background-color: #fff3cd; border-radius: 4px;">No correlations found. Add more data points to calculate correlations.</div>';
        return;
    }

    // Get unique variables
    const variables = new Set<string>();
    correlations.forEach(corr => {
        variables.add(corr.variable1);
        variables.add(corr.variable2);
    });
    const variableList = Array.from(variables).sort();

    // Create correlation lookup
    const corrLookup = new Map<string, any>();
    correlations.forEach(corr => {
        const key1 = `${corr.variable1}-${corr.variable2}`;
        const key2 = `${corr.variable2}-${corr.variable1}`;
        corrLookup.set(key1, corr);
        corrLookup.set(key2, corr);
    });

    // Create correlation matrix data (upper triangle only)
    const matrix: (number | null)[][] = Array(variableList.length).fill(0)
        .map(() => Array(variableList.length).fill(null));
    
    // Fill matrix with correlation values (upper triangle only)
    for (let i = 0; i < variableList.length; i++) {
        for (let j = i; j < variableList.length; j++) {
            if (i === j) {
                matrix[i][j] = 1.0; // Diagonal
            } else {
                const corr = corrLookup.get(`${variableList[i]}-${variableList[j]}`);
                if (corr) {
                    matrix[i][j] = corr.correlation;
                }
            }
        }
    }

    // Create hover text with correlation details
    const hoverText = matrix.map((row, i) => 
        row.map((val, j) => {
            if (val === null) return '';
            if (i === j) return `${variableList[i]}<br>Perfect correlation (1.000)`;
            
            const corr = corrLookup.get(`${variableList[i]}-${variableList[j]}`);
            if (corr) {
                const significance = corr.p_value < 0.05 ? ' (significant)' : ' (not significant)';
                return `${variableList[i]} vs ${variableList[j]}<br>r = ${val.toFixed(3)}<br>p = ${corr.p_value.toFixed(3)}${significance}<br>${corr.strength} ${corr.direction}`;
            }
            return `${variableList[i]} vs ${variableList[j]}<br>r = ${val.toFixed(3)}`;
        })
    );

    // Create Plotly heatmap
    const data: any = [{
        z: matrix,
        x: variableList,
        y: variableList,
        type: 'heatmap',
        colorscale: [
            [0.0, '#d73027'],    // Strong negative (red)
            [0.25, '#f46d43'],   // Moderate negative (orange-red)
            [0.5, '#ffffff'],    // No correlation (white)
            [0.75, '#74add1'],   // Moderate positive (light blue)
            [1.0, '#4575b4']     // Strong positive (blue)
        ],
        zmin: -1,
        zmax: 1,
        text: hoverText,
        hoverongaps: false,
        hovertemplate: '%{text}<extra></extra>',
        showscale: true,
        colorbar: {
            title: 'Correlation',
            titleside: 'right',
            tickmode: 'array',
            tickvals: [-1, -0.5, 0, 0.5, 1],
            ticktext: ['-1.0', '-0.5', '0.0', '0.5', '1.0']
        }
    }];

    const layout: Partial<Plotly.Layout> = {
        title: {
            text: 'Correlation Matrix',
            font: { size: 16 }
        },
        width: Math.max(400, variableList.length * 80),
        height: Math.max(400, variableList.length * 80),
        margin: { l: 100, r: 100, t: 200, b: 100 },
        xaxis: {
            side: 'top',
            tickangle: 45,
            showgrid: false
        },
        yaxis: {
            side: 'left',
            tickangle: 0,
            showgrid: false,
            autorange: 'reversed'  // Reverse y-axis so it matches typical matrix layout
        },
        annotations: matrix.map((row, i) => 
            row.map((val, j) => {
                if (val === null) return null;
                return {
                    text: val.toFixed(2),
                    x: j,
                    y: i,
                    xref: 'x' as const,
                    yref: 'y' as const,
                    showarrow: false,
                    font: {
                        color: Math.abs(val) > 0.5 ? 'white' : 'black',
                        size: 12
                    }
                };
            })
        ).flat().filter(annotation => annotation !== null)
    };

    // Find strongest correlations (excluding diagonal)
    const nonDiagonalCorrelations = correlations.filter(corr => corr.variable1 !== corr.variable2);
    const sortedByStrength = nonDiagonalCorrelations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
    
    // Create summary text
    let summaryText = '';
    if (sortedByStrength.length > 0) {
        const strongest = sortedByStrength[0];
        const strengthDesc = Math.abs(strongest.correlation) > 0.7 ? 'very strong' : 
                           Math.abs(strongest.correlation) > 0.5 ? 'strong' : 
                           Math.abs(strongest.correlation) > 0.3 ? 'moderate' : 'weak';
        const direction = strongest.correlation > 0 ? 'positive' : 'negative';
        const significance = strongest.p_value < 0.05 ? ' (statistically significant)' : ' (not statistically significant)';
        
        summaryText = `<div style="margin-bottom: 15px; padding: 15px; background-color: #e3f2fd; border-radius: 4px; border-left: 4px solid #2196f3;">
            <strong>Strongest Correlation:</strong> ${strongest.variable1} and ${strongest.variable2} show a ${strengthDesc} ${direction} correlation 
            (r = ${strongest.correlation.toFixed(3)}, p = ${strongest.p_value.toFixed(3)})${significance}.
        </div>`;
        
        // Add top 3 if there are more correlations
        if (sortedByStrength.length > 1) {
            const top3 = sortedByStrength.slice(0, Math.min(3, sortedByStrength.length));
            let top3Text = '<div style="margin-bottom: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 4px;"><strong>Top Correlations:</strong><ol style="margin: 5px 0 0 20px; padding: 0;">';
            
            top3.forEach(corr => {
                const absCorr = Math.abs(corr.correlation);
                const strength = absCorr > 0.7 ? 'very strong' : absCorr > 0.5 ? 'strong' : absCorr > 0.3 ? 'moderate' : 'weak';
                const direction = corr.correlation > 0 ? 'positive' : 'negative';
                const sig = corr.p_value < 0.05 ? '*' : '';
                top3Text += `<li>${corr.variable1} ↔ ${corr.variable2}: ${strength} ${direction} (r = ${corr.correlation.toFixed(3)}${sig})</li>`;
            });
            
            top3Text += '</ol><div style="font-size: 11px; color: #666; margin-top: 5px;">* statistically significant (p < 0.05)</div></div>';
            summaryText += top3Text;
        }
    } else {
        summaryText = `<div style="margin-bottom: 15px; padding: 15px; background-color: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
            <strong>No correlations found.</strong> Add more data points with at least 2 different variables to calculate correlations.
        </div>`;
    }

    // Clear the div and add summary
    matrixDiv.innerHTML = summaryText;
    
    // Create plot container and add the plot
    const plotContainer = document.createElement('div');
    matrixDiv.appendChild(plotContainer);
    Plotly.newPlot(plotContainer, data, layout, {responsive: true});

    // Add interpretation note
    const noteDiv = document.createElement('div');
    noteDiv.style.cssText = 'margin-top: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 4px; font-size: 12px; color: #666;';
    noteDiv.innerHTML = `
        <strong>Interpretation:</strong> 
        Red = negative correlation, White = no correlation, Blue = positive correlation. 
        Only upper triangle shown (matrix is symmetric). 
        Hover over cells for detailed statistics.
    `;
    matrixDiv.appendChild(noteDiv);
}

/**
 * Get background color for correlation value
 */
function getCorrelationColor(correlation: number): string {
    const abs = Math.abs(correlation);
    if (abs > 0.7) return correlation > 0 ? '#c8e6c9' : '#ffcdd2';
    if (abs > 0.3) return correlation > 0 ? '#e8f5e9' : '#ffebee';
    if (abs > 0.1) return correlation > 0 ? '#f1f8e9' : '#fce4ec';
    return '#f9f9f9';
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

// Chat Interface Functions
// ===========================
// Chat Interface Functions
// ===========================
function initializeChatInterface(): void {
    const chatToggle = document.getElementById('chatToggle');
    const chatPanel = document.getElementById('chatPanel');
    const initializeChatBtn = document.getElementById('initializeChatBtn');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const messageInput = document.getElementById('messageInput') as HTMLInputElement;
    const updateContextBtn = document.getElementById('updateContextBtn');
    const dismissNotificationBtn = document.getElementById('dismissNotificationBtn');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const acknowledgeDisclaimerBtn = document.getElementById('acknowledgeDisclaimerBtn');
    const disclaimerModal = document.getElementById('disclaimerModal');
    const disclaimerOverlay = document.getElementById('disclaimerOverlay');

    // Toggle chat panel
    chatToggle?.addEventListener('click', () => {
        isChatOpen = !isChatOpen;
        chatPanel?.classList.toggle('open', isChatOpen);
        
        if (isChatOpen) {
            updateCorrelationIndicator();
        }
    });

    // Initialize chat with API key
    initializeChatBtn?.addEventListener('click', async () => {
        const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement;
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            alert('Please enter your OpenAI API key');
            return;
        }
        
        try {
            const response = await fetch('/api/chat/initialize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ api_key: apiKey })
            });
            
            const result = await response.json();
            if (result.success) {
                chatSessionId = result.session_id;
                showChatInterface();
                await loadChatHistory();
                await updateCorrelationContext();
            } else {
                alert(result.error || 'Failed to initialize chat');
            }
        } catch (error) {
            alert('Error initializing chat: ' + error);
        }
    });

    // Send message
    const sendMessage = async () => {
        const message = messageInput.value.trim();
        if (!message || !chatSessionId) return;
        
        try {
            // Add user message to chat
            addMessageToChat('user', message);
            messageInput.value = '';
            
            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    session_id: chatSessionId
                })
            });
            
            const result = await response.json();
            if (result.success) {
                addMessageToChat('assistant', result.response);
            } else {
                addMessageToChat('assistant', 'Error: ' + (result.error || 'Failed to send message'));
            }
        } catch (error) {
            addMessageToChat('assistant', 'Error: ' + error);
        }
    };

    sendMessageBtn?.addEventListener('click', sendMessage);
    messageInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Update correlation context
    updateContextBtn?.addEventListener('click', async () => {
        await updateCorrelationContext();
        hideCorrelationNotification();
    });

    dismissNotificationBtn?.addEventListener('click', () => {
        hideCorrelationNotification();
    });

    // Clear chat history
    clearChatBtn?.addEventListener('click', async () => {
        await clearChat();
    });

    // Acknowledge disclaimer
    acknowledgeDisclaimerBtn?.addEventListener('click', () => {
        localStorage.setItem('epsilon_disclaimer_ack', '1');
        if (disclaimerModal) disclaimerModal.style.display = 'none';
        if (disclaimerOverlay) disclaimerOverlay.style.display = 'none';
    });
}

function showChatInterface(): void {
    const apiKeySection = document.getElementById('apiKeySection');
    const correlationContext = document.getElementById('correlationContext');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const chatControls = document.getElementById('chatControls');
    const disclaimerModal = document.getElementById('disclaimerModal');
    const disclaimerOverlay = document.getElementById('disclaimerOverlay');
    
    if (apiKeySection) apiKeySection.style.display = 'none';
    if (correlationContext) correlationContext.style.display = 'block';
    if (chatMessages) chatMessages.style.display = 'block';
    if (chatInput) chatInput.style.display = 'flex';
    if (chatControls) chatControls.style.display = 'block';

    // Show disclaimer if not acknowledged
    const acknowledged = localStorage.getItem('epsilon_disclaimer_ack') === '1';
    if (!acknowledged) {
        if (disclaimerModal) disclaimerModal.style.display = 'block';
        if (disclaimerOverlay) disclaimerOverlay.style.display = 'block';
    }
}

function addMessageToChat(role: 'user' | 'assistant', content: string): void {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ===========================
// Chat - History & Utilities
// ===========================
async function loadChatHistory(): Promise<void> {
    if (!chatSessionId) return;
    
    try {
        const response = await fetch('/api/chat/history');
        const result = await response.json();
        
        if (result.messages) {
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                chatMessages.innerHTML = '';
                result.messages.forEach((msg: any) => {
                    addMessageToChat(msg.role, msg.content);
                });
            }
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

async function updateCorrelationContext(): Promise<void> {
    try {
        const response = await fetch('/api/correlations/top?count=3');
        const result = await response.json();
        
        if (result.correlations) {
            // displayCorrelations(result.correlations); // TODO: Re-enable this if we want to show correlations in the chat window
            
            // Check if correlations have changed
            if (hasCorrelationsChanged(result.correlations)) {
                lastCorrelations = result.correlations;
                showCorrelationNotification();
            }
        }
    } catch (error) {
        console.error('Error updating correlation context:', error);
    }
}

function displayCorrelations(correlations: any[]): void {
    const correlationList = document.getElementById('correlationList');
    if (!correlationList) return;
    
    if (correlations.length === 0) {
        correlationList.innerHTML = '<p>No significant correlations found.</p>';
        return;
    }
    
    const html = correlations.map((corr, index) => `
        <div class="correlation-item">
            <strong>${index + 1}. ${corr.variable1} ↔ ${corr.variable2}</strong><br>
            r = ${corr.correlation}, p = ${corr.p_value} (${corr.strength} ${corr.direction})
        </div>
    `).join('');
    
    correlationList.innerHTML = html;
}

function hasCorrelationsChanged(newCorrelations: any[]): boolean {
    if (lastCorrelations.length !== newCorrelations.length) return true;
    
    for (let i = 0; i < newCorrelations.length; i++) {
        const old = lastCorrelations[i];
        const new_ = newCorrelations[i];
        
        if (!old || 
            old.variable1 !== new_.variable1 || 
            old.variable2 !== new_.variable2 ||
            Math.abs(old.correlation - new_.correlation) > 0.1) {
            return true;
        }
    }
    
    return false;
}

function showCorrelationNotification(): void {
    const notification = document.getElementById('correlationChangeNotification');
    if (notification) {
        notification.style.display = 'block';
    }
}

function hideCorrelationNotification(): void {
    const notification = document.getElementById('correlationChangeNotification');
    if (notification) {
        notification.style.display = 'none';
    }
}

function updateCorrelationIndicator(): void {
    const indicator = document.getElementById('correlationIndicator');
    if (indicator && lastCorrelations.length > 0) {
        indicator.textContent = lastCorrelations.length.toString();
        indicator.style.display = 'inline';
    } else if (indicator) {
        indicator.style.display = 'none';
    }
}
