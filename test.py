# Test file to make it easier to debug deployment on CPanel. Paired with test_wsgi.py
import sys
print('Python is running! Python path:', sys.path, file=sys.stderr)

from flask import Flask
app = Flask(__name__)

# Force debug mode and error display
app.debug = True
app.config['PROPAGATE_EXCEPTIONS'] = True

@app.route('/')
def hello():
    return 'Hello! If you see this, Flask is working.'
