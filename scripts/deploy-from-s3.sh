#!/bin/bash
set -euo pipefail

#!/bin/bash
set -euo pipefail

# Robust deploy-from-s3.sh
# Usage: deploy-from-s3.sh <bucket> <artifact-key> [app-name]
# If APP_NAME env var is set it will be used. Otherwise default to 'ttenanndakke'.
BUCKET="$1"
KEY="$2"
APP_NAME="${3:-${APP_NAME:-aws-weather}}"

LOG=/var/log/aws-weather-deploy.log
exec > >(tee -a "$LOG") 2>&1

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Starting deploy-from-s3.sh: bucket=$BUCKET key=$KEY"

RELEASES_DIR="/home/ec2-user/apps/aws-weather/releases"
CURRENT_SYMLINK="/home/ec2-user/apps/aws-weather/current"
TMP_ARCHIVE="/tmp/aws-weather-release.tgz"

mkdir -p "$RELEASES_DIR"
TS=$(date -u +%Y%m%dT%H%M%SZ)
RELEASE_DIR="$RELEASES_DIR/$TS"
mkdir -p "$RELEASE_DIR"

echo "Checking disk space"
df -h / | sed -n '1,200p'
free -m || true

echo "Downloading s3://$BUCKET/$KEY to $TMP_ARCHIVE"
# retry download a few times to handle transient S3/network issues
for i in 1 2 3; do
  if aws s3 cp "s3://$BUCKET/$KEY" "$TMP_ARCHIVE" --only-show-errors; then
    echo "Downloaded artifact (attempt $i)"
    break
  else
    echo "Download attempt $i failed, retrying..."
    sleep 3
  fi
  if [ $i -eq 3 ]; then
    echo "Failed to download artifact after 3 attempts" >&2
    exit 2
  fi
done


echo "Extracting to $RELEASE_DIR"
tar -xzf "$TMP_ARCHIVE" -C "$RELEASE_DIR"

echo "Fix ownership and clean node_modules before install"
# ensure ec2-user owns the extracted files so npm can operate
chown -R ec2-user:ec2-user "$RELEASE_DIR" || true
# remove any bundled node_modules in the artifact to avoid permission/content conflicts
rm -rf "$RELEASE_DIR/node_modules" || true

echo "Installing production dependencies (non-interactive) as ec2-user"
cd "$RELEASE_DIR"
# run npm as ec2-user with CI env to avoid prompts
if sudo -u ec2-user bash -lc "CI=true NPM_CONFIG_LOGLEVEL=error npm ci --production --no-audit --no-fund --silent"; then
  echo "npm install succeeded"
else
  echo "npm ci failed; collecting debug log" >&2
  sudo -u ec2-user ls -la /home/ec2-user/.npm/_logs || true
  exit 3
fi

echo "Updating current symlink to $RELEASE_DIR"
ln -sfn "$RELEASE_DIR" "$CURRENT_SYMLINK"

echo "Ensuring ownership"
chown -R ec2-user:ec2-user /home/ec2-user/apps/aws-weather || true

echo "Restarting pm2 process (name: $APP_NAME)"
# ensure we don't leave duplicate processes: remove any existing process with same name
pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
if pm2 pid "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env || true
else
  # start via npm start in the current directory using the app name
  cd "$CURRENT_SYMLINK"
  pm2 start npm --name "$APP_NAME" -- start || true
fi

pm2 save || true

echo "Cleaning up"
rm -f "$TMP_ARCHIVE"

echo "Deploy finished at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
