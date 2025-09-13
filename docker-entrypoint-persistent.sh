#!/bin/sh
set -e

echo "Starting ViewComfy persistent deployment..."

# Clone fresh ViewComfy from GitHub
cd /tmp
rm -rf ViewComfy
echo "Cloning ViewComfy repository..."
git clone https://github.com/ViewComfy/ViewComfy.git
cd ViewComfy

# Handle configuration persistence
if [ -f /app/persistent/view_comfy.json ]; then
    echo "Using persistent configuration"
    cp /app/persistent/view_comfy.json view_comfy.json
else
    echo "Using initial configuration"
    if [ -f /tmp/workflow_config.json ]; then
        cp /tmp/workflow_config.json view_comfy.json
        # Create persistent directory if it doesn't exist
        mkdir -p /app/persistent
        cp view_comfy.json /app/persistent/
        echo "Configuration saved to persistent storage"
    else
        echo "Warning: No initial configuration found"
    fi
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Apply SSR fix for server-side rendering
echo "Applying SSR fix..."
sed -i "s/const isNotificationAvailable = 'Notification' in window/const isNotificationAvailable = typeof window !== 'undefined' \\&\\& 'Notification' in window/g" components/pages/playground/playground-page.tsx

# Start development server
echo "Starting ViewComfy development server..."
exec npm run dev