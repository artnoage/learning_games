#!/bin/bash
# Deployment script for Memory Game

set -e  # Exit on error

# Configuration
APP_DIR="/path/to/mem_game"
SERVICE_NAME="memory_game"
NGINX_CONF="/etc/nginx/sites-available/memory_game"
LOG_DIR="/var/log/memory_game"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root"
  exit 1
fi

echo "Starting Memory Game deployment..."

# Create log directory
mkdir -p $LOG_DIR
chown www-data:www-data $LOG_DIR

# Install dependencies
echo "Installing dependencies..."
pip install -r $APP_DIR/requirements.txt

# Copy systemd service file
echo "Setting up systemd service..."
cp $APP_DIR/memory_game.service /etc/systemd/system/$SERVICE_NAME.service
# Update the WorkingDirectory path in the service file
sed -i "s|/path/to/mem_game|$APP_DIR|g" /etc/systemd/system/$SERVICE_NAME.service

# Copy and configure nginx
echo "Setting up nginx..."
cp $APP_DIR/memory_game.nginx.conf $NGINX_CONF
# Update the static file paths in nginx config
sed -i "s|/path/to/mem_game|$APP_DIR|g" $NGINX_CONF
ln -sf $NGINX_CONF /etc/nginx/sites-enabled/

# Reload systemd, start service, and reload nginx
echo "Starting services..."
systemctl daemon-reload
systemctl enable $SERVICE_NAME
systemctl restart $SERVICE_NAME
systemctl reload nginx

echo "Deployment complete! Memory Game should be running at http://your_domain.com"
