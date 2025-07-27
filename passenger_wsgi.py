import os
import sys

# Add the app directory to the Python path
INTERP = "/home/dylatktq/virtualenv/public_html/playground/windsurf_app/3.13/bin/python"
if sys.executable != INTERP:
    os.execl(INTERP, INTERP, *sys.argv)

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app import app as application