#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/deploy-to-ec2.sh <ec2_user> <ec2_host> <target_dir>
# Requires ssh key in SSH_AUTH_SOCK or default ssh-agent, or use -i in scp/ssh calls.

USER=${1:-ec2-user}
HOST=${2:-}
TARGET_DIR=${3:-/home/ec2-user/aws-weather-release}

if [ -z "$HOST" ]; then
  echo "Usage: $0 <ec2_host> [target_dir]"
  exit 1
fi

echo "Building..."
npm ci
npm run build

echo "Packaging..."
tar -czf /tmp/aws-weather-release.tgz .next package.json package-lock.json public next.config.js

echo "Copying to ${USER}@${HOST}:${TARGET_DIR}"
ssh ${USER}@${HOST} "mkdir -p ${TARGET_DIR}"
scp /tmp/aws-weather-release.tgz ${USER}@${HOST}:${TARGET_DIR}/

echo "Remote deploy commands..."
ssh ${USER}@${HOST} <<'EOF'
set -e
cd "${TARGET_DIR}"
tar -xzf aws-weather-release.tgz -C release_tmp
cd release_tmp
npm ci --production
mv ../current ../previous || true
mv release_tmp ../current
cd ../current
pm2 restart aws-weather --update-env || pm2 start npm --name aws-weather -- start
pm2 save
EOF

echo "Done."