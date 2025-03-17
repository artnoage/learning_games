# Gunicorn configuration file
bind = "0.0.0.0:8001"  # Bind to all interfaces on port 8001
workers = 2  # Number of worker processes
timeout = 30  # Worker timeout in seconds
accesslog = "-"  # Log to stdout
errorlog = "-"  # Log errors to stdout
loglevel = "info"
capture_output = True  # Capture stdout/stderr from workers
