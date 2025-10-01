"""Flask application for data visualization and correlation analysis.

Provides a web interface for users to input, visualize, and analyze
numerical data with correlation analysis and a chat assistant.
"""

# === Standard Library Imports ===
from datetime import date, datetime  # dates for UI, timestamps for DB
import os  # filesystem paths and environment
import logging  # application logging
import re  # small sanitization utility
import unicodedata  # normalize/sanitize text for chat content
import hashlib  # hashing API key (non-reversible)
from typing import Dict, List, Any, Optional  # type hints

# === Third-Party Imports ===
from scipy import stats  # correlation calculations
import openai  # OpenAI client SDK
from flask import Flask, render_template, request, jsonify, session, redirect, url_for  # Flask web
from flask_login import LoginManager, login_user, logout_user, login_required, current_user  # Auth
from google.oauth2 import id_token  # Google OAuth token verification
from google.auth.transport import requests  # Google OAuth HTTP transport
from dotenv import load_dotenv  # load local .env in development

# === Local Application Imports ===
from models import db, User, DataPoint, ChatSession, ChatMessage, CorrelationResult  # SQLAlchemy models
from database import (load_user_data, save_user_data, add_data_point, clear_user_data, 
                     calculate_correlations, get_all_correlations, get_top_correlations)

# Load environment variables from .env file (development only)
# In production (cPanel), use the Python App environment variables instead
if os.getenv('FLASK_ENV') != 'production':
    load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configure Flask app with secure secret key
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', os.urandom(32).hex())

# Configure database, using SQLAlchemy as the abstraction layer to talk to the sqlite database
# SQLAlchemy is a SQL toolkit and Object-Relational Mapping (ORM) system for Python. Converts Python into SQL commands
# In models.py, we use the Flask implementation of SQLAlchemy... using Python's built-in sqlite3 module
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
    'DATABASE_URL', 
    f'sqlite:///{os.path.join(os.path.dirname(os.path.abspath(__file__)), "instance", "user_data.db")}'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database
db.init_app(app)

# Create database tables when app starts
def create_tables():
    with app.app_context():
        db.create_all()

# Call create_tables after app initialization
create_tables()

# Configure paths based on environment
if os.getenv('FLASK_ENV') == 'production':
    app.config['APPLICATION_ROOT'] = '/epsilon'
    app.static_url_path = '/epsilon/static'
    # Ensure all routes work with the subdirectory
    app.config['APPLICATION_ROOT'] = '/epsilon'
    app.url_map.strict_slashes = False
else:
    # Local development uses default paths
    app.debug = True

# Configure logging
app_dir = os.path.dirname(os.path.abspath(__file__))
log_dir = os.path.join(app_dir, 'logs')
if not os.path.exists(log_dir):
    try:
        os.makedirs(log_dir, mode=0o755)
    except Exception as e:
        # If we can't create the logs directory, log to the app directory instead
        log_dir = app_dir
        print(f'Could not create logs directory: {str(e)}. Logging to app directory instead.')

log_file = os.path.join(log_dir, 'app.log') # Dyl: Log file path
try:
    # Set up file handler with UTF-8 encoding
    file_handler = logging.FileHandler(log_file, encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
    
    # Set up console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(logging.Formatter('%(levelname)s: %(message)s'))
    
    # Configure logger
    logger = logging.getLogger('data_table_plotter')
    logger.setLevel(logging.DEBUG)
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    # Make the log file readable
    if os.path.exists(log_file):
        os.chmod(log_file, 0o644)
    
    logger.info('Logging initialized')
except Exception as e:
    print(f'Could not initialize logging to file: {str(e)}')
    # Fall back to stderr logging
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(levelname)s: %(message)s',
        handlers=[logging.StreamHandler()]
    )
    logger = logging.getLogger('data_table_plotter')

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    if 'user_email' in session:
        return User.query.get(user_id)
    return None

def ensure_user_exists(user_id: str, email: str) -> None:
    """Ensure user exists in database, create if not found.
    
    Args:
        user_id: Google user ID
        email: User email address
    """
    user = User.query.get(user_id)
    if not user:
        user = User(
            id=user_id,
            email=email,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.session.add(user)
        db.session.commit()
        logger.info(f'Created new user: {email} ({user_id})')
    else:
        # Update email and timestamp if user exists
        user.email = email
        user.updated_at = datetime.utcnow()
        db.session.commit()
        logger.info(f'Updated existing user: {email} ({user_id})')

# Authentication routes
@app.route('/auth-status')
@app.route('/epsilon/auth-status')
def auth_status():
    """Get current authentication status.
    
    Returns:
        JSON response with authentication status and user email if authenticated.
    """
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'email': current_user.email
        })
    return jsonify({'authenticated': False})

@app.route('/verify-google-token', methods=['POST'])
@app.route('/epsilon/verify-google-token', methods=['POST'])
def verify_google_token():
    try:
        token = request.json.get('token')
        if not token:
            return jsonify({'success': False, 'error': 'No token provided'}), 400

        idinfo = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            os.getenv('GOOGLE_CLIENT_ID')
        )
        
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Invalid issuer')

        user_id = idinfo['sub']
        email = idinfo['email']
        
        # Ensure user exists in database
        ensure_user_exists(user_id, email)
        
        user = User.query.get(user_id)
        login_user(user)
        session['user_email'] = email
        
        return jsonify({
            'success': True,
            'user': {
                'id': user_id,
                'email': email
            }
        })
    except ValueError as e:
        logger.error(f'Token verification failed: {str(e)}')
        return jsonify({'success': False, 'error': 'Invalid token'}), 401
    except Exception as e:
        logger.error(f'Authentication error: {str(e)}')
        return jsonify({'success': False, 'error': 'Authentication failed'}), 500

@app.route('/logout', methods=['POST'])
@app.route('/epsilon/logout', methods=['POST'])
def logout():
    try:
        if current_user.is_authenticated:
            logout_user()
            session.clear()
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f'Logout error: {str(e)}')
        return jsonify({'success': False, 'error': 'Logout failed'}), 500




# Route handlers
## Main Handlers
@app.route('/login')
def login():
    """Render the login page.
    
    Returns:
        Rendered login page template.
    """
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    return render_template('login.html', google_client_id=os.getenv('GOOGLE_CLIENT_ID'))

@app.route('/')
def index() -> str:
    """Render the main page.

    Returns:
        Rendered HTML template with today's date and column titles.
    """
    if not current_user.is_authenticated:
        return redirect(url_for('login'))
        
    return render_template(
        'index.html',
        today_date=date.today().strftime('%Y-%m-%d'),
        authenticated=current_user.is_authenticated
    )

## Data Handlers
@app.route('/add_row', methods=['POST'])
def add_row() -> tuple[dict, int]:
    """Add a new data point.

    Returns:
        A tuple containing a success status and HTTP status code 200.
    """
    if not current_user.is_authenticated:
        return jsonify({"status": "error", "message": "Not authenticated"}), 401
        
    new_row = request.json
    logger.info(f'Adding new row to data: {new_row}')
    
    try:
        # Add single data point using database function
        add_data_point(current_user.id, new_row)
        logger.info(f'Successfully added data point for user {current_user.id}')
        
        # Recalculate correlations after data change
        try:
            calculate_correlations(current_user.id)
        except Exception as corr_error:
            logger.warning(f'Failed to recalculate correlations: {str(corr_error)}')
        
        return jsonify({"status": "success"}), 200
    except Exception as e:
        logger.error(f'Error adding data point: {str(e)}')
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/get_data', methods=['GET'])
@app.route('/epsilon/get_data', methods=['GET'])
def get_data() -> tuple[list, int]:
    """Get all data points with column headers.

    Returns:
        A tuple containing the list of data points and HTTP status code 200.
        Each data point is a dictionary with column names as keys.
    """
    if not current_user.is_authenticated:
        return jsonify([]), 401
    
    try:
        user_data = load_user_data(current_user.id)
        logger.info(f'Sending data to client for user {current_user.id}: {len(user_data)} points')
        return jsonify(user_data), 200
    except Exception as e:
        logger.error(f'Error loading data for user {current_user.id}: {str(e)}')
        return jsonify([]), 200

@app.route('/replace_data', methods=['POST'])
def replace_data() -> tuple[dict, int]:
    """Replace all data points with new data.

    Returns:
        A tuple containing success status and HTTP status code 200.
    """
    if not current_user.is_authenticated:
        return jsonify({"status": "error", "message": "Not authenticated"}), 401
    
    try:
        new_data = request.json
        logger.info(f'Received data to replace: {len(new_data)} points')
        
        # Validate data structure
        if not isinstance(new_data, list):
            logger.error(f'Invalid data format received: {type(new_data)}')
            return jsonify({"status": "error", "message": "Data must be a list"}), 400
        
        # Replace all data using database function
        save_user_data(current_user.id, new_data, reset=False)
        logger.info(f'Successfully replaced data for user {current_user.id} with {len(new_data)} rows')
        
        # Recalculate correlations after data change
        try:
            calculate_correlations(current_user.id)
        except Exception as corr_error:
            logger.warning(f'Failed to recalculate correlations: {str(corr_error)}')
        
        return jsonify({"status": "success"}), 200
        
    except Exception as e:
        logger.error(f'Error in replace_data: {str(e)}')
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/clear_data', methods=['POST'])
def clear_data() -> tuple[dict, int]:
    """Clear all data points.

    Returns:
        A tuple containing success status and HTTP status code 200.
    """
    if not current_user.is_authenticated:
        return jsonify({"status": "error", "message": "Not authenticated"}), 401
    
    try:
        # Clear all user data using database function
        clear_user_data(current_user.id)
        return jsonify({"status": "success"}), 200
    except Exception as e:
        logger.error(f'Error clearing data for user {current_user.id}: {str(e)}')
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/reset_table', methods=['POST'])
def reset_table() -> tuple[dict, int]:
    """Reset table to default state.

    Creates an empty table with default columns.

    Returns:
        A tuple containing success status and HTTP status code 200.
    """
    if not current_user.is_authenticated:
        return jsonify({"status": "error", "message": "Not authenticated"}), 401
    
    try:
        # Reset to empty data using database function
        save_user_data(current_user.id, [], reset=True)
        
        return jsonify({"status": "success"}), 200
    except Exception as e:
        logger.error(f'Error resetting table for user {current_user.id}: {str(e)}')
        return jsonify({"status": "error", "message": str(e)}), 500


## Analysis Routes & Supporting Functions
@app.route('/calculate_correlation', methods=['POST'])
def calculate_correlation():
    """Calculate correlation between two variables."""
    req_data = request.json
    x_values = req_data.get('x_values', [])
    y_values = req_data.get('y_values', [])
    xAxis = req_data.get('xAxis', '')
    yAxis = req_data.get('yAxis', '')
    is_date_x = req_data.get('isDateX', False)
    is_date_y = req_data.get('isDateY', False)
    debug_info = []

    logger.info(f'Received x_values: {x_values}')
    logger.info(f'Received y_values: {y_values}')
    logger.info(f'Received xAxis: {xAxis}')
    logger.info(f'Received yAxis: {yAxis}')
    debug_info.append(f'Input values: x={x_values}, y={y_values}')
    debug_info.append(f'Column keys: xAxis={xAxis}, yAxis={yAxis}')
    
    # Format display names for interpretation
    x_display = f'the Date' if is_date_x else xAxis
    y_display = f'the Date' if is_date_y else yAxis
    
    # Calculate correlation
    try:
        # Values are already converted to timestamps for dates in frontend
        try:
            x_values = [float(x) for x in x_values]
            y_values = [float(y) for y in y_values]
            
            # For dates, convert timestamps to days since epoch for more interpretable results
            if is_date_x:
                x_values = [x / (1000 * 60 * 60 * 24) for x in x_values]  # Convert ms to days
            if is_date_y:
                y_values = [y / (1000 * 60 * 60 * 24) for y in y_values]  # Convert ms to days
        except (ValueError, TypeError) as e:
            return jsonify({
                "error": "Invalid numeric values for correlation calculation",
                "debug_info": debug_info
            }), 400

        if len(x_values) != len(y_values) or len(x_values) < 2:
            return jsonify({
                "error": "Need at least 2 numeric data points for correlation",
                "debug_info": debug_info
            }), 400
        
        stdev_x = stats.tstd(x_values)
        stdev_y = stats.tstd(y_values)
        if stdev_x == 0 or stdev_y == 0:
            return jsonify({
                "error": "Cannot calculate correlation with constant values",
                "debug_info": debug_info
            }), 400

        # Calculate Pearson correlation
        correlation, p_value = stats.pearsonr(x_values, y_values)
        correlation = round(correlation, 3)
        p_value = round(p_value, 3)

        return jsonify({
            "correlation": correlation,
            "p_value": p_value,
            "interpretation": interpret_correlation(correlation, p_value, x_display, y_display),
            "debug_info": debug_info
        })
        
    except Exception as e:
        return jsonify({
            "error": f"Error calculating correlation: {str(e)}",
            "debug_info": debug_info if 'debug_info' in locals() else []
        }), 400

def interpret_correlation(correlation: float, p_value: float, x_display: str, y_display: str) -> str:
    """Interpret the correlation coefficient and p-value."""
    strength = "no"
    if abs(correlation) > 0.7:
        strength = "strong"
    elif abs(correlation) > 0.3:
        strength = "moderate"
    elif abs(correlation) > 0.1:
        strength = "weak"
        
    direction = "positive" if correlation > 0 else "negative"
    significance = "significant" if p_value < 0.05 else "not significant"
    
    if abs(correlation) < 0.1:
        return f"There is very little correlation between {x_display} and {y_display} (correlation = {correlation:.3f}). This is statistically {significance} (p = {p_value:.3f})."
    
    return f"There is a {strength} {direction} correlation between {x_display} and {y_display} (correlation = {correlation:.3f}). This is statistically {significance} (p = {p_value:.3f})."

"""
Minimal text sanitizer for chat content.
- Normalize to NFKC
- Strip nulls, CR, Unicode line/paragraph separators, and other control chars (but keep \n and \t)
"""
_CTRL = ''.join(ch for ch in map(chr, range(32)) if ch not in ('\t', '\n'))
_CTRL += ''.join(map(chr, range(127, 160)))
_CTRL_RE = re.compile(f'[{re.escape(_CTRL)}]')

def clean_text(s: str) -> str:
    if not isinstance(s, str):
        s = str(s)
    s = unicodedata.normalize('NFKC', s)
    s = (s.replace('\x00', '')
           .replace('\r', '')
           .replace('\u2028', '')
           .replace('\u2029', ''))
    s = _CTRL_RE.sub('', s)
    return s

def transport_sanitize_text(s: str) -> str:
    """Make text ASCII-safe for transport if the environment forces ASCII.

    This function is ONLY used when calling the OpenAI HTTP client to avoid
    'ascii' codec errors in constrained environments. It preserves content
    best-effort by removing only non-ASCII bytes if required.
    """
    if not isinstance(s, str):
        s = str(s)
    # First, run the minimal cleaner to strip control characters
    s = clean_text(s)
    try:
        # If environment supports UTF-8 properly, this is a no-op path
        s.encode('utf-8')
        return s
    except Exception:
        # As a defensive measure; not expected to trigger
        pass
    # Ensure ASCII-only as a last resort for HTTP serialization layers that force ASCII
    return s.encode('ascii', 'ignore').decode('ascii')

# CSV Import
@app.route('/import_datafile', methods=['POST'])
@app.route('/epsilon/import_datafile', methods=['POST'])
def import_datafile():
    """Import data from CSV or Excel file.
    
    Expects a CSV or Excel file with the first column containing dates.
    Returns:
        A tuple containing success/error message and HTTP status code.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
        
    file = request.files['file']
    # Check file extension
    filename = file.filename.lower()
    if not any(filename.endswith(ext) for ext in ['.csv', '.xlsx', '.xls']):
        return jsonify({'error': 'File must be CSV or Excel (.csv, .xlsx, .xls)'}), 400
        
    try:
        # Read file into pandas DataFrame based on extension
        if filename.endswith('.csv'):
            df = pd.read_csv(file, skipinitialspace=True)
        else:  # Excel files
            df = pd.read_excel(file)
        
        # Check if we have any data
        if df.empty:
            return jsonify({'error': 'CSV file is empty'}), 400
            
        # Try to convert first column to datetime with flexible parsing
        try:
            df.iloc[:, 0] = pd.to_datetime(df.iloc[:, 0], infer_datetime_format=True)
        except:
            return jsonify({'error': 'First column must contain valid dates'}), 400
            
        if not current_user.is_authenticated:
            return jsonify({'error': 'Not authenticated'}), 401

        # Convert DataFrame to our data format
        new_data = []
        
        # Convert rows to our format
        for _, row in df.iterrows():
            data_point = {'Date': row.iloc[0].strftime('%Y-%m-%d')}
            for col in df.columns[1:]:
                # Use column name directly, just clean it up
                col_name = str(col).strip().replace(' ', '_')
                try:
                    data_point[col_name] = float(row[col])
                except (ValueError, TypeError):
                    data_point[col_name] = 0
            new_data.append(data_point)
            
        # Save user's data
        save_user_data(current_user.id, new_data)
        
        # Recalculate correlations after data import
        try:
            calculate_correlations(current_user.id)
        except Exception as corr_error:
            logger.warning(f'Failed to recalculate correlations: {str(corr_error)}')
        
        return jsonify({
            'success': True,
            'message': f'Successfully imported {len(new_data)} rows',
            'data': new_data
        }), 200
        
    except Exception as e:
        logger.error(f'Error importing CSV: {str(e)}')
        return jsonify({'error': f'Error processing CSV: {str(e)}'}), 400


# Correlation API Routes
@app.route('/api/correlations/calculate', methods=['POST'])
def calculate_user_correlations():
    """Calculate and store all correlations for the current user."""
    if not current_user.is_authenticated:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        calculate_correlations(current_user.id)
        return jsonify({
            'success': True,
            'message': 'Correlations calculated successfully'
        })
        
    except Exception as e:
        logger.error(f'Error calculating correlations: {str(e)}')
        return jsonify({'error': 'Failed to calculate correlations'}), 500


@app.route('/api/correlations/all', methods=['GET'])
def get_all_correlations_endpoint():
    """Get all stored correlations for the current user."""
    if not current_user.is_authenticated:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        correlations = get_all_correlations(current_user.id)
        return jsonify({
            'correlations': correlations,
            'count': len(correlations)
        })
        
    except Exception as e:
        logger.error(f'Error getting correlations: {str(e)}')
        return jsonify({'error': 'Failed to get correlations'}), 500


@app.route('/api/correlations/top', methods=['GET'])
def get_top_user_correlations():
    """Get top N correlations for the current user."""
    if not current_user.is_authenticated:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        count = request.args.get('count', 3, type=int)
        correlations = get_top_correlations(current_user.id, count)
        return jsonify({
            'correlations': correlations,
            'count': len(correlations)
        })
        
    except Exception as e:
        logger.error(f'Error getting top correlations: {str(e)}')
        return jsonify({'error': 'Failed to get top correlations'}), 500


# Chat API Routes
@app.route('/api/chat/initialize', methods=['POST'])
def initialize_chat():
    """Initialize chat session with API key."""
    if not current_user.is_authenticated:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        data = request.json
        api_key = data.get('api_key')
        
        if not api_key:
            return jsonify({'error': 'API key required'}), 400
        
        # Store API key in session (temporary solution)
        session['openai_api_key'] = api_key
        
        # Hash the API key for storage
        api_key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        # Create or get existing chat session
        chat_session = ChatSession.query.filter_by(user_id=current_user.id).first()
        if not chat_session:
            chat_session = ChatSession(
                user_id=current_user.id,
                api_key_hash=api_key_hash,
                created_at=datetime.utcnow()
            )
            db.session.add(chat_session)
        else:
            chat_session.api_key_hash = api_key_hash
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'session_id': chat_session.id
        })
        
    except Exception as e:
        logger.error(f'Error initializing chat: {str(e)}')
        return jsonify({'error': 'Failed to initialize chat'}), 500


@app.route('/api/chat/send', methods=['POST'])
def send_chat_message():
    """Send message to ChatGPT with correlation context."""
    if not current_user.is_authenticated:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        data = request.json
        message = data.get('message')
        session_id = data.get('session_id')
        
        if not message or not session_id:
            return jsonify({'error': 'Message and session_id required'}), 400
        
        # Get chat session and API key
        chat_session = ChatSession.query.filter_by(
            id=session_id, 
            user_id=current_user.id
        ).first()
        
        if not chat_session:
            return jsonify({'error': 'Invalid session'}), 400
        
        # Get top 3 correlations for context
        top_correlations = get_top_correlations(current_user.id, count=3)
        
        # Format correlation context
        correlation_context = ""
        if top_correlations:
            correlation_context = "\n\nCurrent data correlations context:\n"
            for i, corr in enumerate(top_correlations, 1):
                correlation_context += f"{i}. {corr['variable1']} and {corr['variable2']}: r = {corr['correlation']:.3f} (p = {corr['p_value']:.3f})\n"
        
        # Create system message with correlation context
        system_message = f"""You are a helpful nurse assistant. The user is tracking various personal metrics over time. The main three correlations we have found are: {correlation_context}. Please provide insights based on these correlations and answer the user's questions about their data patterns. Discuss like you're their supportive doctor or nurse. Each response should only be a few sentences long, and include follow-up questions to help the user understand their data better."""
        
        # Set up OpenAI client with user's API key
        # Note: In production, we should decrypt the stored API key
        # For now, we'll need to store the actual key temporarily in session
        api_key = session.get('openai_api_key')
        if not api_key:
            return jsonify({'error': 'API key not found in session'}), 400
        
        try:
            # Alternative approach: use httpx client with no proxy support
            import httpx
            
            # Create a custom httpx client that explicitly disables proxies and forces UTF-8
            http_client = httpx.Client(
                proxies=None,
                headers={
                    'Accept-Charset': 'utf-8',
                    'Content-Type': 'application/json; charset=utf-8',
                    'Accept': 'application/json'
                },
                timeout=30.0,
            )
            
            client = openai.OpenAI(
                api_key=api_key,
                http_client=http_client
            )
            logger.info(f'OpenAI client created successfully for user {current_user.email}')
        except Exception as client_error:
            logger.error(f'Error creating OpenAI client: {str(client_error)}')
            return jsonify({'error': f'Failed to initialize OpenAI client: {str(client_error)}'}), 500
        
        # Get recent chat history for context
        recent_messages = ChatMessage.query.filter_by(
            session_id=session_id
        ).order_by(ChatMessage.timestamp.desc()).limit(10).all()
        
        # Build conversation history (sanitize and avoid logging raw content)
        system_message = clean_text(system_message)
        messages = [{"role": "system", "content": system_message}]
        try:
            logger.info('Preparing messages for chat (system+history+user)')
        except Exception:
            pass

        # Add recent messages in chronological order
        for msg in reversed(recent_messages):
            messages.append({"role": msg.role, "content": clean_text(msg.content)})
        
        # Add current user message
        messages.append({"role": "user", "content": clean_text(message)})

        # Send to OpenAI (single call)
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=messages,
            max_completion_tokens=500,
            temperature=0.7
        )
        assistant_response = response.choices[0].message.content
        
        # Save user message
        user_message = ChatMessage(
            session_id=session_id,
            role='user',
            content=clean_text(message),
            timestamp=datetime.utcnow()
        )
        db.session.add(user_message)
        
        # Save assistant response
        assistant_message = ChatMessage(
            session_id=session_id,
            role='assistant',
            content=clean_text(assistant_response),
            timestamp=datetime.utcnow()
        )
        db.session.add(assistant_message)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'response': assistant_response,
            'correlations_included': bool(top_correlations)
        })
        
    except Exception as e:
        logger.error(f'Error sending chat message: {str(e)}')
        return jsonify({'error': f'Failed to send message: {str(e)}'}), 500


@app.route('/api/chat/history', methods=['GET'])
def get_chat_history():
    """Get chat history for current user."""
    if not current_user.is_authenticated:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        # Get chat session for user
        chat_session = ChatSession.query.filter_by(user_id=current_user.id).first()
        
        if not chat_session:
            return jsonify({
                'messages': [],
                'session_id': None
            })
        
        # Get all messages for this session
        messages = ChatMessage.query.filter_by(
            session_id=chat_session.id
        ).order_by(ChatMessage.timestamp.asc()).all()
        
        # Format messages for frontend
        formatted_messages = []
        for msg in messages:
            formatted_messages.append({
                'role': msg.role,
                'content': msg.content,
                'timestamp': msg.timestamp.isoformat()
            })
        
        return jsonify({
            'messages': formatted_messages,
            'session_id': chat_session.id
        })
        
    except Exception as e:
        logger.error(f'Error getting chat history: {str(e)}')
        return jsonify({'error': f'Failed to get chat history: {str(e)}'}), 500


@app.route('/api/chat/clear', methods=['POST'])
def clear_chat_history():
    """Clear chat messages for the current user's chat session.

    Accepts optional JSON body: { "session_id": <int> }
    If not provided, clears the first (current) ChatSession for the user.
    """
    if not current_user.is_authenticated:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        data = request.get_json(silent=True) or {}
        requested_session_id = data.get('session_id')

        # Find the target chat session for this user
        if requested_session_id:
            chat_session = ChatSession.query.filter_by(id=requested_session_id, user_id=current_user.id).first()
        else:
            chat_session = ChatSession.query.filter_by(user_id=current_user.id).first()

        if not chat_session:
            return jsonify({'success': True, 'message': 'No chat session found to clear', 'cleared': 0})

        # Delete all messages for this session
        deleted = ChatMessage.query.filter_by(session_id=chat_session.id).delete()
        db.session.commit()

        logger.info(f'Cleared {deleted} chat messages for user {current_user.id} session {chat_session.id}')
        return jsonify({'success': True, 'cleared': deleted})

    except Exception as e:
        logger.error(f'Error clearing chat history: {str(e)}')
        db.session.rollback()
        return jsonify({'error': 'Failed to clear chat history'}), 500



# Error Handling
@app.errorhandler(404)
def page_not_found(error):
    return render_template('page_not_found.html'), 404

@app.errorhandler(Exception)
def handle_error(error: Exception) -> tuple[str, int]:
    """Global error handler for unhandled exceptions.

    Args:
        error: The unhandled exception that occurred.

    Returns:
        A tuple containing an error message and HTTP status code 500.
    """
    logger.error('Unhandled error: %s', str(error))
    return 'Application error occurred. Please check the logs.', 500

# Running The App
if __name__ == '__main__':
    # Enable debug mode
    app.debug = True
    
    # Force debug mode to reload on file changes
    app.config['DEBUG'] = True
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    
    # Run the app
    app.run(debug=True, port=5001, host='0.0.0.0')
    import sys
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument('--test', action='store_true', help='Run in test mode')
    parser.add_argument('--port', type=int, default=5000, help='Port to run on')
    args = parser.parse_args()
    
    # Run without debug mode if running tests
    debug_mode = not args.test
    app.run(
        debug=debug_mode,
        use_reloader=debug_mode,
        port=args.port
    )
