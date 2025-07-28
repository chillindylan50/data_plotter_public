import os
import sys
import traceback

# Add the app directory to the Python path
app_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(app_dir)
print(f'Python path: {sys.path}', file=sys.stderr)
print(f'App directory: {app_dir}', file=sys.stderr)

try:
    from app import app as application
    print('Successfully imported application! Dyl Here', file=sys.stderr)
except Exception as e:
    error_html = f'''
    <html>
        <body>
            <h1>Python Error</h1>
            <pre>{str(e)}</pre>
            <h2>Traceback:</h2>
            <pre>{traceback.format_exc()}</pre>
            <h2>Python Path:</h2>
            <pre>{sys.path}</pre>
            <h2>App Directory:</h2>
            <pre>{app_dir}</pre>
            <h2>Directory Contents:</h2>
            <pre>{os.listdir(app_dir)}</pre>
        </body>
    </html>
    '''
    def application(environ, start_response):
        start_response('500 Internal Server Error', [('Content-Type', 'text/html')])
        return [error_html.encode()]
    print(f'Error importing application: {str(e)}\n{traceback.format_exc()}', file=sys.stderr)