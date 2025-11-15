#!/usr/bin/env bash
set -euo pipefail

# 学習向け EC2 セットアップスクリプト（注釈付き）
# - `--explain` を付けると、スクリプトを「セクションごとに説明」して終了します（実行しません）。
# - `--dry-run` を付けるとコマンドを実行せずに表示します（学習・検証向け）。
# - 通常モードは指定されたリポジトリをクローンし、ビルドして pm2/nginx を設定します。

REPO=""
BRANCH=main
APP_DIR=/srv/aws-weather-lab
DRY_RUN=0
EXPLAIN=0

print_usage() {
  cat <<USAGE
Usage: $0 [--explain] [--dry-run] <git-repo-url> [branch] [app-dir]

Options:
  --explain   Print section-by-section explanations and exit (no changes).
  --dry-run   Print the commands that would run, but don't execute them.

Examples:
  $0 --explain
  $0 --dry-run https://github.com/Meerkat39/aws-weather-lab.git main /srv/aws-weather-lab
USAGE
}

# Simple command runner that respects DRY_RUN
run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "+ $*"
  else
    echo "-> $*"
    eval "$@"
  fi
}

# Print a human-friendly explanation of each section for learning
show_explain() {
  cat <<'EXPLAIN'
説明モード: このスクリプトは以下のセクションで動作します。

1) 前提チェックと変数の準備
   - 引数でリポジトリ URL, branch, app-dir を受け取る
   - 学習用に --explain と --dry-run を用意

2) パッケージ更新とインストール
   - apt update/upgrade でパッケージリストを更新
   - Node.js (LTS)、build-essential、nginx、git をインストール
   - なぜ: Node と nginx がないとビルド・配信ができない

3) pm2 のインストール
   - pm2 は Node のプロセスマネージャ。学習では可視性と復帰の練習に便利

4) アプリ配置（クローン or 更新）
   - 指定ディレクトリが既に git 管理されていれば pull、なければ clone
   - 事前条件: 適切なディレクトリ権限とネットワークアクセス

5) 依存関係インストールとビルド
   - npm ci, npm run build
   - なぜ: Next.js はビルド後に `next start` で本番モードを起動する

6) pm2 での起動と永続化
   - pm2 start npm -- start で起動
   - pm2 save + pm2 startup で再起動時に自動復帰させる（startup の出力を root で実行する必要あり）

7) nginx リバースプロキシ設定
   - /etc/nginx/sites-available にサイト定義を置き、127.0.0.1:3000 をプロキシ
   - nginx -t で設定検証し、reload で反映

8) 仕上げと検証
   - curl でローカルアクセスを確認
   - TLS を有効にするには certbot 等を追加で実行する

学習のコツ:
  - まずは `--explain` で流れを読む。
  - 次に `--dry-run` で実際にどのコマンドが走るか確認する。
  - 最後に実行する（必要なら各コマンドを手動で1つずつ実行して理解を深める）。

EXPLAIN
}

# Parse flags
while [ "$#" -gt 0 ]; do
  case "$1" in
    --explain)
      EXPLAIN=1; shift ;;
    --dry-run)
      DRY_RUN=1; shift ;;
    -h|--help)
      print_usage; exit 0 ;;
    *)
      if [ -z "$REPO" ]; then
        REPO=$1
      elif [ -z "$BRANCH" ]; then
        BRANCH=$1
      elif [ -z "$APP_DIR" ]; then
        APP_DIR=$1
      fi
      shift ;;
  esac
done

if [ "$EXPLAIN" -eq 1 ]; then
  show_explain
  exit 0
fi

if [ -z "$REPO" ]; then
  echo "Error: git repo URL is required (or run with --explain)." >&2
  print_usage
  exit 1
fi

echo "Repository: $REPO"
echo "Branch:     $BRANCH"
echo "App dir:    $APP_DIR"
echo "Dry run:    $DRY_RUN"

echo "Updating apt and installing prerequisites..."
run sudo apt update && run sudo apt upgrade -y

echo "Installing Node.js (LTS) and system packages..."
run curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
run sudo apt install -y nodejs build-essential nginx git

echo "Installing pm2 globally..."
run sudo npm install -g pm2

echo "Preparing app directory: $APP_DIR"
run sudo mkdir -p "$APP_DIR"
run sudo chown $(whoami):$(whoami) "$APP_DIR"

if [ -d "$APP_DIR/.git" ]; then
  echo "Repository already cloned in $APP_DIR. Fetching latest..."
  run cd "$APP_DIR"
  run git fetch --all
  run git checkout "$BRANCH"
  run git pull origin "$BRANCH"
else
  echo "Cloning $REPO (branch: $BRANCH) into $APP_DIR"
  run git clone --depth 1 --branch "$BRANCH" "$REPO" "$APP_DIR"
  run cd "$APP_DIR"
fi

echo "Installing dependencies and building..."
run npm ci
run npm run build

echo "Starting app with pm2..."
run pm2 start npm --name "aws-weather-lab" -- start
run pm2 save

echo "Enabling pm2 startup (you may need to run the printed command as root)"
run pm2 startup -u $(whoami) --hp $(eval echo ~$USER) || true

echo "Configuring nginx reverse proxy..."
NGINX_CONF="/etc/nginx/sites-available/aws-weather-lab"
run sudo tee "$NGINX_CONF" > /dev/null <<'NGCONF'
server {
  listen 80;
  server_name _;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
NGCONF

run sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/aws-weather-lab
run sudo rm -f /etc/nginx/sites-enabled/default
run sudo nginx -t
run sudo systemctl reload nginx

echo "Setup complete. Check app with: curl http://localhost or http://<EC2_PUBLIC_IP>"
echo "If pm2 startup printed a command earlier, run it now as root to enable startup on boot."
echo "To enable HTTPS later: install certbot and run: sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d yourdomain.example.com"

exit 0
