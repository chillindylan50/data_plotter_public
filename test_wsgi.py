# Test file to make it easier to debug deployment on CPanel. Paired with test.py
import sys
import traceback

try:
    from test import app as application
    print('Successfully imported application!', file=sys.stderr)
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
        </body>
    </html>
    '''
    def application(environ, start_response):
        start_response('500 Internal Server Error', [('Content-Type', 'text/html')])
        return [error_html.encode()]
    print(f'Error importing application: {str(e)}\n{traceback.format_exc()}', file=sys.stderr)
