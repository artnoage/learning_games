# Gunicorn configuration file
bind = "0.0.0.0:5000"  # Bind to all interfaces on port 5000
workers = 3  # Number of worker processes
accesslog = "-"  # Log to stdout
errorlog = "-"  # Log errors to stdout
loglevel = "info"
