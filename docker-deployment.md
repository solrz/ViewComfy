# ViewComfy Docker Deployment Guide

This directory contains Docker configurations for running ViewComfy in different modes.

## Files Overview

- `docker-compose.yml` - Multi-service Docker Compose configuration
- `Dockerfile.dev` - Development Dockerfile (mounts local source)
- `Dockerfile.persistent` - Persistent deployment Dockerfile (clones from GitHub)
- `docker-entrypoint-persistent.sh` - Entrypoint script for persistent deployment
- `.env.docker` - Environment variables template

## Deployment Options

### 1. Development Mode (Local Source)

Uses local source code with hot reload:

```bash
# Start development container
docker-compose up viewcomfy-dev

# Access at: http://localhost:3000
```

**Features:**
- Mounts local source code
- Hot reload enabled
- Uses existing view_comfy.json config
- Applies SSR fix automatically

### 2. Persistent Mode (GitHub Source)

Clones fresh code from GitHub with persistent config:

```bash
# Ensure persistent directory exists
mkdir -p persistent-data

# Start persistent container
docker-compose up viewcomfy-persistent

# Access at: http://localhost:3001
```

**Features:**
- Always uses latest GitHub code
- Configuration persists across restarts
- Automatic SSR fix application
- Fallback to initial config if no persistent config exists

### 3. Direct Docker Commands

#### Development Mode:
```bash
docker build -f Dockerfile.dev -t viewcomfy:dev .
docker run -d --name viewcomfy-dev -p 3000:3000 \
  -v $(pwd):/app -v /app/node_modules \
  -e COMFYUI_API_URL=192.168.11.248:8188 \
  -e COMFYUI_SECURE=false \
  -e NEXT_PUBLIC_VIEW_MODE=false \
  -e NEXT_PUBLIC_USER_MANAGEMENT=false \
  -e NEXT_PUBLIC_CLOUD_WS_URL=ws://192.168.11.248:8188 \
  viewcomfy:dev
```

#### Persistent Mode:
```bash
docker build -f Dockerfile.persistent -t viewcomfy:persistent .
docker run -d --name viewcomfy-persistent -p 3001:3000 \
  -v $(pwd)/view_comfy.json:/tmp/workflow_config.json \
  -v $(pwd)/persistent-data:/app/persistent \
  -e COMFYUI_API_URL=192.168.11.248:8188 \
  -e COMFYUI_SECURE=false \
  -e NEXT_PUBLIC_VIEW_MODE=false \
  -e NEXT_PUBLIC_USER_MANAGEMENT=false \
  -e NEXT_PUBLIC_CLOUD_WS_URL=ws://192.168.11.248:8188 \
  viewcomfy:persistent
```

## Configuration

### Environment Variables

Copy `.env.docker` to `.env` and customize:

```bash
cp .env.docker .env
# Edit .env with your ComfyUI server details
```

Key variables:
- `COMFYUI_API_URL` - ComfyUI server (format: hostname:port, no http://)
- `NEXT_PUBLIC_CLOUD_WS_URL` - WebSocket URL (format: ws://hostname:port)
- `NEXT_PUBLIC_VIEW_MODE` - false for Editor mode, true for View mode

### Persistent Configuration

The persistent mode automatically handles configuration:

1. **First run**: Uses `view_comfy.json` as template, saves to persistent storage
2. **Subsequent runs**: Uses configuration from persistent storage
3. **Manual updates**: Edit `persistent-data/view_comfy.json` and restart

## Troubleshooting

### Container won't start
```bash
# Check logs
docker logs viewcomfy-dev
docker logs viewcomfy-persistent

# Check if ports are in use
netstat -tlnp | grep :3000
netstat -tlnp | grep :3001
```

### Configuration issues
```bash
# Verify config file exists and is valid JSON
cat view_comfy.json | python -m json.tool

# Check persistent storage
ls -la persistent-data/
```

### SSR errors
The containers automatically apply the SSR fix, but if issues persist:
```bash
# Manual fix in running container
docker exec viewcomfy-dev sed -i "s/const isNotificationAvailable = 'Notification' in window/const isNotificationAvailable = typeof window !== 'undefined' \\&\\& 'Notification' in window/g" components/pages/playground/playground-page.tsx
```

## Production Deployment

For production, consider:
1. Using a reverse proxy (nginx/traefik)
2. Setting up proper SSL certificates
3. Using Docker secrets for sensitive configuration
4. Setting up log rotation and monitoring
5. Using the persistent mode for automatic updates