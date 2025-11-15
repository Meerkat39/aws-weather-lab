# EC2 デプロイ手順（学習用・HTTP のみ）

目的

- 学習目的で EC2 上に Next.js アプリを配置し、nginx + PM2 で公開（HTTP）する手順を学ぶ。

前提・注意点

- 今回は「HTTP のみ（開発用）」方針です。公開運用や機密データの取り扱いには HTTPS が必須です。
- AWS アカウントを持っていること。Route53 は使いません。
- コスト発生に注意（インスタンスは作業後停止または削除してください）。
- このドキュメントは学習用。コマンドは手元で一つずつ実行して理解を深めてください。

推奨インスタンス

- AMI: Ubuntu LTS（最新の LTS）
- インスタンスタイプ: t3.small（学習）
- ストレージ: 8–20GB（プロジェクト規模に合わせて）

準備（ローカル）

1. SSH 鍵の作成（ローカル）

```bash
ssh-keygen -t ed25519 -C "aws-weather-lab-key" -f ~/.ssh/aws-weather-lab -N ""
# 公開鍵の確認
cat ~/.ssh/aws-weather-lab.pub
```

2. セキュリティグループ（推奨設定）

- インバウンド:
  - SSH (TCP 22): あなたの固定 IP のみ（例: x.x.x.x/32）
  - HTTP (TCP 80): 0.0.0.0/0（学習で公開する場合のみ）
- アウトバウンド: すべて許可（デフォルト）

EC2 インスタンスの作成（コンソール） — 概要

- AMI で Ubuntu を選択
- インスタンスタイプ選択（t3.small 推奨）
- キーペア: 既存の公開鍵をアップロードするか、作成したキーペアを選択
- セキュリティグループ: 上記のルールを適用
- 起動後、パブリック IPv4 またはパブリック DNS を控える

サーバー上での操作（SSH 接続後）

※ 以降のコマンドは EC2 上で実行してください（ローカルで実行しないでください）。

1. ベースパッケージの更新と Node.js の準備

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs build-essential nginx git
```

説明: Node.js、nginx、git をインストールします。Next.js のビルドと nginx のリバースプロキシに必要です。

2. pm2 のインストール

```bash
sudo npm install -g pm2
```

3. アプリ配置（例: `/srv/aws-weather-lab`）

```bash
sudo mkdir -p /srv/aws-weather-lab
sudo chown $(whoami):$(whoami) /srv/aws-weather-lab
cd /srv/aws-weather-lab
# クローン（初回）
git clone https://github.com/Meerkat39/aws-weather-lab.git .
# あるいは既にある場合は pull
# git fetch --all && git checkout main && git pull origin main

# 依存関係とビルド
npm ci
npm run build
```

注意: プライベートリポジトリなら SSH キーや token を使う手順が追加で必要です。

4. 環境変数（学習用）

- 簡易: リポジトリルートに `.env.local` を作成して `OPENWEATHER_API_KEY` を設定できます。

```bash
cat > .env.local <<'ENV'
OPENWEATHER_API_KEY=あなたのキー
ENV
```

5. pm2 で起動

```bash
# production モードで start を利用
pm2 start npm --name "aws-weather-lab" -- start
pm2 save
# 永続化のためのコマンドを出力（表示されたコマンドを root で実行してください）
pm2 startup -u $(whoami) --hp $(eval echo ~$USER)
```

注: `pm2 startup` 実行後に表示されるコマンドを root（sudo）で実行すると、再起動後も pm2 が自動起動します。

6. nginx のリバースプロキシ設定

- サイト設定例: `/etc/nginx/sites-available/aws-weather-lab`

```nginx
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
```

配置と反映:

```bash
sudo tee /etc/nginx/sites-available/aws-weather-lab > /dev/null <<'NG'
# 上の nginx 設定をここに貼る
NG
sudo ln -sf /etc/nginx/sites-available/aws-weather-lab /etc/nginx/sites-enabled/aws-weather-lab
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

7. 動作確認

- サーバでローカル確認:

```bash
curl -I http://localhost:3000
# nginx を経由して確認
curl -I http://localhost
```

- ブラウザで: `http://<EC2_PUBLIC_IP>` にアクセスしてトップページが表示されることを確認
- API 動作確認（例）:

```bash
curl -s 'http://<EC2_PUBLIC_IP>/api/weather?city=Tokyo' | jq .
```

トラブルシュート（よくある問題）

- ポート 80 が開いていない: セキュリティグループのインバウンドを確認
- npm run build が失敗: ローカルで `npm run build` が成功していることを再確認
- pm2 が起動しない: `pm2 logs aws-weather-lab` と `journalctl -u nginx` を確認

後片付け（コスト削減）

- インスタンスを停止または終了:
  - AWS コンソールから Instance を Stop/Terminate
- 不要な Elastic IP が付与されている場合は Release

追加（任意）: HTTPS を後から追加する場合

- ドメインを持っている場合は DNS で A レコードを EC2 の Elastic IP に向け、certbot を使って証明書を取得できます（学習後に実施）:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.example.com
```

便利な補助スクリプト

- リポジトリに `scripts/setup-ec2-explain.sh` がある場合、まず `--explain` → `--dry-run` で流れを確認してから手動でコマンドを実行してください。例えば:

```bash
# 説明を読むだけ
bash scripts/setup-ec2-explain.sh --explain

# 実行されるコマンドを表示（実行はされない）
bash scripts/setup-ec2-explain.sh --dry-run https://github.com/Meerkat39/aws-weather-lab.git main /srv/aws-weather-lab
```

学習チェックリスト

- [ ] ローカルで `npm run build` が通っている
- [ ] SSH 鍵を作成している
- [ ] セキュリティグループを適切に設定している
- [ ] EC2 にアプリを配置して HTTP でアクセスできる
- [ ] 作業後にインスタンスを停止/削除してコストを抑える

参考

- Next.js 本番モード: `next start` を使用
- pm2 ドキュメント: https://pm2.keymetrics.io/
- nginx の基本: https://nginx.org/

---

作業をどこまで進めますか？

- 私が次にガイドするオプション:
  1. SSH 鍵とセキュリティグループの作り方を一緒にやる（コンソール手順／コマンド両方）
  2. 上記手順を EC2 上で順に実行するためのチェックリストを対話形式で実行（あなたがコマンドを貼る／実行する）
  3. いまの段階でドキュメントの追加修正を希望する箇所を指定する

許可が出たら次に進みます。
