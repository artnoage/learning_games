# Gunicorn configuration file
bind = "0.0.0.0:8001"  # Bind to all interfaces on port 8001
workers = 3  # Number of worker processes
accesslog = "-"  # Log to stdout
errorlog = "-"  # Log errors to stdout
loglevel = "info"
