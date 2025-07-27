from flask import Flask
from flask import url_for
from markupsafe import escape # Allow safe escape of characters, for HTML and XML output. Mitigates injection attacks
from flask import request # Allow other types of requests
from flask import abort, redirect, url_for # Allow redirection and aborting (error handling)
from flask import render_template # For templating
import logging # For logging

app = Flask(__name__)

# Set up logging
# Create a logger
logger = logging.getLogger('my_logger')
logger.setLevel(logging.DEBUG)  # Set the desired logging level

# Create a file handler
file_handler = logging.FileHandler('app.log')
file_handler.setLevel(logging.DEBUG)  # Set the desired logging level for the file

# Create a formatter and add it to the handler
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)

# Add the handler to the logger
logger.addHandler(file_handler)



@app.route('/')
def index():
    return 'Index Page'

@app.route('/hello')
def hello():
    logger.debug('Entered hello() function')
    return 'Hello, World'


@app.route('/user/<username>')
def show_user_profile(username):
    # show the user profile for that user
    return f'User {escape(username)}'

@app.route('/post/<int:post_id>')
def show_post(post_id):
    # show the post with the given id, the id is an integer
    return f'Post {post_id}'

@app.route('/path/<path:subpath>')
def show_subpath(subpath):
    # show the subpath after /path/
    return f'Subpath {escape(subpath)}'

# Testing URL building
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        return 'do_the_login()'
    else:
        return 'show_the_login_form()'

@app.route('/user/<username>')
def profile(username):
    return f'{username}\'s profile'

# with app.test_request_context():
#     print(url_for('index'))
#     print(url_for('login'))
#     print(url_for('login', next='/'))
#     print(url_for('profile', username='John Doe'))

# File uploads
# @app.route('/upload', methods=['GET', 'POST'])
# def upload_file():
#     if request.method == 'POST':
#         file = request.files['the_file']
#         file.save(f"/var/www/uploads/{secure_filename(file.filename)}")


@app.route('/recycle')
def recycle():
    return redirect(url_for('garbage'))

@app.route('/rgarbage')
def garbage():
    # abort(401)
    abort(404)
    this_is_never_executed()

@app.errorhandler(404)
def page_not_found(error):
    return render_template('page_not_found.html'), 404

if __name__ == '__main__':
    app.run(debug=True, port=5001, host='0.0.0.0') # Dyl: run with debug mode, port 5001, and allow external access
