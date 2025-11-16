#!/bin/bash
set -euo pipefail

# Usage: deploy-from-s3.sh <bucket> <artifact-key>
BUCKET="$1"
KEY="$2"

RELEASES_DIR="/home/ec2-user/apps/aws-weather/releases"
CURRENT_SYMLINK="/home/ec2-user/apps/aws-weather/current"
TMP_ARCHIVE="/tmp/aws-weather-release.tgz"

mkdir -p "$RELEASES_DIR"
TS=$(date -u +%Y%m%dT%H%M%SZ)
RELEASE_DIR="$RELEASES_DIR/$TS"
mkdir -p "$RELEASE_DIR"

echo "Downloading s3://$BUCKET/$KEY to $TMP_ARCHIVE"
aws s3 cp "s3://$BUCKET/$KEY" "$TMP_ARCHIVE"

echo "Extracting to $RELEASE_DIR"
tar -xzf "$TMP_ARCHIVE" -C "$RELEASE_DIR"

echo "Installing production dependencies"
cd "$RELEASE_DIR"
if [ -f package-lock.json ]; then
  npm ci --production --no-audit --no-fund
else
  npm install --production --no-audit --no-fund
fi

echo "Updating current symlink to $RELEASE_DIR"
ln -sfn "$RELEASE_DIR" "$CURRENT_SYMLINK"

echo "Ensuring ownership"
chown -R ec2-user:ec2-user /home/ec2-user/apps/aws-weather

echo "Restarting pm2 process (name: aws-weather)"
if pm2 pid aws-weather >/dev/null 2>&1; then
  pm2 restart aws-weather --update-env || true
else
  # start via npm start in the current directory
  cd "$CURRENT_SYMLINK"
  pm2 start npm --name aws-weather -- start || true
fi

pm2 save || true

echo "Cleaning up"
rm -f "$TMP_ARCHIVE"

echo "Deploy finished"
