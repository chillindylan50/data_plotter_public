let tableData = [];

// Column title mapping
let columnTitles = {};

let columnCounter = 1;

function addColumn() {
    // Generate new column name
    const newColumnKey = `value${columnCounter}`;
    const newColumnTitle = `Value ${columnCounter}`;
    columnCounter++;
    
    console.log('Adding new column:', newColumnKey, newColumnTitle);
    
    // Add to column titles
    columnTitles[newColumnKey] = newColumnTitle;
    
    // Save column titles to server
    fetch('/update_column_titles', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [newColumnKey]: newColumnTitle })
    });
    
    // Add header to table
    const headerRow = document.querySelector('#dataTable thead tr');
    const newHeader = document.createElement('th');
    newHeader.contentEditable = true;
    newHeader.setAttribute('data-column', newColumnKey);
    newHeader.textContent = newColumnTitle;
    headerRow.appendChild(newHeader);
    
    // Add input cell to input row
    const inputRow = document.querySelector('.input-row');
    const newInputCell = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'number';
    input.id = `${newColumnKey}Value`;
    input.placeholder = 'Enter value';
    newInputCell.appendChild(input);
    inputRow.appendChild(newInputCell);
    
    // Add 0 as default value for existing data rows
    tableData.forEach(row => {
        row[newColumnKey] = 0;
    });
    
    // Update the table display
    renderTableRows();
    
    // Update plot controls
    updateDropdownSelectors();
}



function addRow() {
    let date = document.getElementById('date').value;
    const columnOrder = getColumnOrder();
    
    // Create new row object
    const newRow = {
        date: date
    };
    
    // Get values for all columns in order of table headers
    columnOrder.forEach(key => {
        if (key !== 'date') {
            const input = document.getElementById(`${key}Value`);
            const value = input ? input.value : '';
            newRow[key] = (value && value.trim() !== '') ? parseFloat(value) : 0;
        }
    });
    
    console.log('New row data:', newRow);
    
    // If date is empty, use today's date
    if (!date) {
        const today = new Date().toISOString().split('T')[0];
        date = today;
        document.getElementById('date').value = today;
        newRow.date = today;
    }
    
    if (date) {
        
        // Add to table data
        tableData.push(newRow);
        
        // Render rows in the table
        renderTableRows();
        
        // Send to server
        fetch('/add_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newRow)
        });
        
        // Clear inputs
        document.getElementById('date').value = '';
        for (let key in columnTitles) {
            if (key !== 'date') {
                const input = document.getElementById(`${key}Value`);
                if (input) input.value = '';
            }
        }
        
        // Update plot
        updatePlot();
    }
}

function updatePlot() {
    const xAxis = document.getElementById('xAxis').value;
    const yAxis = document.getElementById('yAxis').value;
    
    // Sort data based on the x-axis to ensure proper line connection
    const sortedData = [...tableData].sort((a, b) => {
        if (xAxis === 'date') {
            return new Date(a[xAxis]) - new Date(b[xAxis]);
        }
        return a[xAxis] - b[xAxis];
    });
    
    // Create a single trace with line connection
    const trace = {
        x: sortedData.map(d => d[xAxis]),
        y: sortedData.map(d => d[yAxis]),
        mode: 'lines+markers', // Show both line and markers
        type: 'scatter',
        name: 'Data Series',
        line: {
            color: 'blue', // Single color for the entire line
            width: 2
        },
        marker: {
            color: 'blue',
            size: 8
        }
    };
    
    const layout = {
        title: 'Data Plot',
        xaxis: {
            title: columnTitles[xAxis],
            type: xAxis === 'date' ? 'date' : 'linear'
        },
        yaxis: {
            title: columnTitles[yAxis]
        }
    };
    
    Plotly.newPlot('plot', [trace], layout);
}

function getColumnOrder() {
    const headers = Array.from(document.querySelectorAll('#dataTable thead th'));
    return headers.map(header => header.getAttribute('data-column'));
}

function renderTableRows() {
    const tableBody = document.querySelector('#dataTable tbody');
    const columnOrder = getColumnOrder();
    
    // Clear existing rows except the input row
    const existingRows = tableBody.querySelectorAll('tr:not(.input-row)');
    existingRows.forEach(row => row.remove());
    
    // Add rows from tableData
    tableData.forEach(row => {
        const newRow = document.createElement('tr');
        let rowHtml = '';
        
        // Add cells in the order of table headers
        columnOrder.forEach(key => {
            if (key === 'date') {
                rowHtml += `<td>${row[key]}</td>`;
            } else {
                const value = row[key] !== undefined ? row[key] : 0;
                rowHtml += `<td>${value}</td>`;
            }
        });
        
        newRow.innerHTML = rowHtml;
        tableBody.appendChild(newRow);
    });
    
    console.log('Table data after render:', tableData);
}

function setupColumnTitleListeners() {
    const headers = document.querySelectorAll('#dataTable thead th');
    headers.forEach(header => {
        const column = header.getAttribute('data-column');
        
        // Add event listener for title changes
        header.addEventListener('blur', function() {
            const newTitle = this.textContent.trim();
            if (newTitle && newTitle !== columnTitles[column]) {
                // Update local column titles
                columnTitles[column] = newTitle;
                
                // Send all column titles to server
                fetch('/update_column_titles', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(columnTitles)
                });
                
                // Update plot axis labels and dropdowns
                updateDropdownSelectors();
                updatePlotAxisLabels();
            }
        });
        
        // Prevent newlines in contenteditable
        header.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.blur();
            }
        });
    });
}

function updateDropdownSelectors() {
    const xAxisSelect = document.getElementById('xAxis');
    const yAxisSelect = document.getElementById('yAxis');
    
    // Store current selections
    const currentX = xAxisSelect.value;
    const currentY = yAxisSelect.value;
    
    // Clear existing options
    xAxisSelect.innerHTML = '';
    yAxisSelect.innerHTML = '';
    
    // Add options for all columns
    Object.keys(columnTitles).forEach(column => {
        const xOption = document.createElement('option');
        const yOption = document.createElement('option');
        
        xOption.value = column;
        yOption.value = column;
        
        xOption.textContent = columnTitles[column];
        yOption.textContent = columnTitles[column];
        
        xAxisSelect.appendChild(xOption);
        yAxisSelect.appendChild(yOption);
    });
    
    // Restore previous selections or set defaults
    xAxisSelect.value = currentX || 'date';
    yAxisSelect.value = currentY || 'y';
}

function updatePlotAxisLabels() {
    const xAxis = document.getElementById('xAxis').value;
    const yAxis = document.getElementById('yAxis').value;
    
    // Trigger plot update with new labels
    updatePlot();
}

// Function to clear all data
function clearAllData() {
    // Confirm before clearing
    const confirmClear = confirm('Are you sure you want to clear all data? This cannot be undone.');
    
    if (confirmClear) {
        fetch('/clear_data', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                // Clear local table data
                tableData = [];
                
                // Re-render table and plot
                renderTableRows();
                updatePlot();
            }
        })
        .catch(error => {
            console.error('Error clearing data:', error);
            alert('Failed to clear data. Please try again.');
        });
    }
}



function resetTable() {
    if (confirm('This will reset all columns to default and delete all data. Are you sure?')) {
        fetch('/reset_table', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(result => {
            // Update column titles
            columnTitles = result.titles;
            columnCounter = 1;
            
            // Clear table data
            tableData = [];
            
            // Reset table headers
            const headerRow = document.querySelector('#dataTable thead tr');
            headerRow.innerHTML = `
                <th contenteditable="false" data-column="date">Date</th>
                <th contenteditable="true" data-column="x">Variable 1</th>
                <th contenteditable="true" data-column="y">Variable 2</th>
            `;
            
            // Reset input row
            const inputRow = document.querySelector('.input-row');
            inputRow.innerHTML = `
                <td><input type="date" id="date" placeholder="yyyy-mm-dd" min="2023-01-01" max="2026-12-31" value="${new Date().toISOString().split('T')[0]}" data-format="yyyy-mm-dd"></td>
                <td><input type="number" id="xValue" placeholder="Enter value"></td>
                <td><input type="number" id="yValue" placeholder="Enter value"></td>
            `;
            
            // Update table and plot
            renderTableRows();
            updateDropdownSelectors();
            updatePlot();
        });
    }
}

// Ensure date is in yyyy-mm-dd format
function formatDateInput() {
    const dateInput = document.getElementById('date');
    
    // Function to format date to yyyy-mm-dd
    function formatDate(date) {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }
    
    // Set initial date
    const today = formatDate(new Date());
    dateInput.value = today;
    
    // Add event listeners to handle different browser behaviors
    dateInput.addEventListener('input', function() {
        // Attempt to parse and reformat the input
        const inputDate = new Date(this.value);
        if (!isNaN(inputDate.getTime())) {
            this.value = formatDate(inputDate);
        }
    });
    
    // Fallback for Safari and other browsers with inconsistent date input
    dateInput.addEventListener('change', function() {
        const inputDate = new Date(this.value);
        if (!isNaN(inputDate.getTime())) {
            this.value = formatDate(inputDate);
        }
    });
}

// Load initial data and column titles
Promise.all([
    fetch('/get_data').then(response => response.json()),
    fetch('/get_column_titles').then(response => response.json())
])
.then(([data, titles]) => {
    // Update column titles
    columnTitles = titles;
    columnCounter = Math.max(
        ...Object.keys(columnTitles)
            .filter(key => key.startsWith('value'))
            .map(key => parseInt(key.replace('value', '')) || 0)
    ) + 1;
    
    // Update table data
        tableData = data;
        renderTableRows();
        
        // Initialize dropdowns and plot
        updateDropdownSelectors();
        updatePlot();
        
        // Set up column title listeners after initial render
        setupColumnTitleListeners();
        
        // Format date input
        formatDateInput();
        
        // Add event listeners for axis changes
        const xAxisSelect = document.getElementById('xAxis');
        const yAxisSelect = document.getElementById('yAxis');
        xAxisSelect.addEventListener('change', updatePlotAxisLabels);
        yAxisSelect.addEventListener('change', updatePlotAxisLabels);
    });
