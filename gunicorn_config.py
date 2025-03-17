# Gunicorn configuration file
bind = "127.0.0.1:8001"  # Bind to localhost for security (nginx will proxy)
workers = 2  # Number of worker processes
timeout = 30  # Worker timeout in seconds
accesslog = "/var/log/memory_game/access.log"  # Log to file
errorlog = "/var/log/memory_game/error.log"  # Log errors to file
loglevel = "info"
capture_output = True  # Capture stdout/stderr from workers
