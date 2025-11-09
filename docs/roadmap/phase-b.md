# フェーズ B — EC2 デプロイ（2〜4 日）

目的

- EC2 上で Next.js アプリをホストして、ネットワーク・セキュリティ・SSL 等の運用知識を得る。

ゴール（成果物）

- EC2 インスタンス上でアプリが稼働している（HTTPS 経由でアクセス可能）
- nginx（リバースプロキシ） + PM2（または systemd）でプロセス管理
- ドメイン（Route53）設定、証明書（Let's Encrypt または ACM）

前提

- AWS アカウントと Route53 にドメインがある想定

ステップ（詳細）

1. インスタンスの作成

   - AMI: Ubuntu LTS または Amazon Linux 2
   - インスタンスタイプ: t3.small（学習）
   - キーペアを作成、セキュリティグループは SSH(22) を自分の IP、HTTP(80), HTTPS(443) を開ける

2. サーバー初期設定

   - SSH 接続
   - 必要パッケージインストール

   ```bash
   sudo apt update && sudo apt upgrade -y
   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
   sudo apt install -y nodejs build-essential nginx git
   ```

3. アプリ配置

   - アプリを `/srv/aws-weather-lab` 等にクローン
   - ディレクトリで `npm ci`、`npm run build`

4. プロセス管理

   - PM2 を使う場合

   ```bash
   sudo npm install -g pm2
   pm2 start npm --name "aws-weather-lab" -- start
   pm2 save
   pm2 startup
   ```

   - systemd を使う場合は `service` ユニットを作成して管理

5. nginx 設定（リバースプロキシ）

   - `/etc/nginx/sites-available/aws-weather-lab` を作成して 80/443 を Node プロセスへプロキシ
   - 設定反映: `sudo nginx -t && sudo systemctl reload nginx`

6. SSL 証明書

   - Let's Encrypt (certbot) を利用して証明書を取得

   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.example.com
   ```

7. 環境変数の管理

   - 学習段階では `/srv/aws-weather-lab/.env` を使ってもよいが、長期的には AWS SSM Parameter Store や Secrets Manager を学ぶ

8. ドメインの DNS 設定

   - Route53 で A レコードを EC2 の Elastic IP または ALB に向ける

9. ログ・監視
   - CloudWatch Logs / CloudWatch Agent を導入してアプリログとメトリクスを収集

チェックリスト

- [ ] EC2 にアクセスできる
- [ ] アプリが PM2/systemd で稼働している
- [ ] https://yourdomain.example.com でアクセスできる
- [ ] CloudWatch にログが流れている（簡易）

注意点

- SSH は可能な限り IP 制限する
- 学習後はインスタンスを停止・削除してコストを抑える

次にやること

- CI/CD（GitHub Actions）と IaC（CDK/CloudFormation）を作成して自動化する（フェーズ C）
