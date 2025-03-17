#!/usr/bin/env python3
"""
Simple script to run the Memory Game server using either Flask development server
or Gunicorn production server based on the command line argument.
"""

import os
import sys
import subprocess

def run_dev_server():
    """Run the Flask development server"""
    from server import app
    print("Starting Memory Game development server at http://localhost:8001/")
    app.run(host='127.0.0.1', port=8001, debug=True)

def run_prod_server():
    """Run the Gunicorn production server"""
    print("Starting Memory Game production server at http://0.0.0.0:8001/")
    try:
        # Use the system's gunicorn
        subprocess.run(["gunicorn", "-c", "gunicorn_config.py", "server:app"], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running Gunicorn: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "prod":
        run_prod_server()
    else:
        run_dev_server()
