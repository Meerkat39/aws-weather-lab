#!/bin/bash
set -euo pipefail

# full-reset-and-deploy.sh
# Usage: full-reset-and-deploy.sh <bucket> <artifact-key> [app-name]
# This script performs a backup of current app & logs, removes releases/current,
# stops pm2 for the given app, and invokes deploy-from-s3.sh to redeploy.

BUCKET="$1"
KEY="$2"
APP_NAME="${3:-aws-weather}"

TS=$(date -u +%Y%m%dT%H%M%SZ)
BASE_DIR="/home/ec2-user/apps/aws-weather"
RELEASES_DIR="$BASE_DIR/releases"
CURRENT_SYMLINK="$BASE_DIR/current"
BACKUP_DIR="$BASE_DIR/backups"
LOG_DIR="$BASE_DIR/logs"

mkdir -p "$BACKUP_DIR"
mkdir -p "$LOG_DIR"

echo "Backing up current release and logs to $BACKUP_DIR/backup-$TS.tar.gz"
tar -czf "$BACKUP_DIR/backup-$TS.tar.gz" -C "$BASE_DIR" current logs || true

echo "Stopping and removing pm2 process $APP_NAME"
pm2 delete "$APP_NAME" >/dev/null 2>&1 || true

echo "Removing releases and current symlink"
rm -rf "$RELEASES_DIR" || true
rm -f "$CURRENT_SYMLINK" || true
mkdir -p "$RELEASES_DIR"

echo "Cleaning pm2 dump and saved state"
pm2 save || true
pm2 unstartup || true || true

echo "Calling deploy-from-s3.sh to redeploy"
SCRIPTS_DIR="$(dirname "$0")"
bash "$SCRIPTS_DIR/deploy-from-s3.sh" "$BUCKET" "$KEY" "$APP_NAME"

echo "Full reset and deploy finished"
