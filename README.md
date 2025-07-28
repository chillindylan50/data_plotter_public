# Data Table Plotter

An interactive web application for data visualization and statistical analysis. Create, edit, and visualize data tables with real-time plotting and correlation analysis capabilities. Note: this version was made using Windsurf, as a first example web app I built. It's running live at dylanshah.com/epsilon. Hopefully with no security leaks :smile:.

## Features

- **Interactive Data Table**
  - Add/edit data directly in the browser 
  - Import data from CSV files via drag-and-drop
  - First column is always a date field for time-series analysis
  - Add/remove rows and columns dynamically

- **Real-time Visualization**
  - Interactive Plotly.js charts
  - Automatic plot updates on data changes
  - Flexible axis selection for data exploration

- **Statistical Analysis**
  - Calculate pairwise correlations between variables
  - Full correlation matrix visualization with heatmap
  - Statistical significance indicators
  - Support for date-based correlations

- **User Management**
  - Secure Google OAuth2.0 authentication
  - Per-user data persistence with CSV storage
  - Column structure preservation during data operations
  - Multi-user support with isolated data spaces

## Requirements

- Python 3.8+
- Node.js and npm
- TypeScript 5.3+
- Modern web browser with JavaScript enabled

## Key Dependencies

### Python Packages
- Flask 3.1.1
- pandas 2.2.3
- numpy 2.3.2
- scipy 1.16.0

### TypeScript/JavaScript
- Plotly.js 3.0.1
- TypeScript 5.3.3

## Setup and Running

1. Clone the repository:
```bash
git clone https://github.com/yourusername/data_table_plotter.git
cd data_table_plotter
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env to add your Google OAuth client ID and Flask secret key
```

4. Install and build TypeScript:
```bash
npm install
npm run build
```

5. Run the Flask application:
```bash
flask --app app run --debug --port 5001 --host=0.0.0.0
```

5. Open your web browser and navigate to:
   - Local development: http://localhost:5001
   - Network access: http://your-ip:5001

## Usage

1. **Authentication**
   - Log in using your Google account
   - Your data will be saved and associated with your account

2. **Data Entry**
   - Enter values directly in the data table
   - Import data by dragging and dropping a CSV file
   - First column must be Date format
   - Add rows/columns as needed

3. **Visualization**
   - Select variables for X and Y axes from the dropdowns
   - Plot updates automatically as data changes
   - Hover over points for detailed information

4. **Correlation Analysis**
   - "Calculate Plotted Correlations": Analyze currently plotted variables
   - "Calculate All Correlations": Generate full correlation matrix
   - View correlation strength through color-coded heatmap
   - Interpretation guide provided below the matrix

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)

## Acknowledgments

- Built with [Flask](https://flask.palletsprojects.com/)
- Plotting powered by [Plotly.js](https://plotly.com/javascript/)
- Statistical analysis using [SciPy](https://scipy.org/)
