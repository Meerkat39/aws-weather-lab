# フェーズ B — EC2 デプロイ（2〜4 日、学習用）

目的

- EC2 上で Next.js アプリをホストして、ネットワーク・セキュリティやプロセス管理の基礎を学ぶ。

ゴール（成果物）

- EC2 インスタンス上でアプリが稼働している（学習段階では HTTP 経由での動作確認を行う）
- nginx（リバースプロキシ） + PM2（または systemd）でプロセス管理
- 将来的にドメイン/HTTPS を追加するための手順を理解していること

前提

- AWS アカウントを持っていること。今回の学習では Route53 を使わず「HTTP のみ（開発用）」を選択します。

ステップ（詳細）

1. インスタンスの作成

   - AMI: Ubuntu LTS または Amazon Linux 2
   - インスタンスタイプ: t3.small（学習）
   - キーペアを作成、セキュリティグループは SSH(22) を自分の IP、HTTP(80) を開ける（HTTPS は今回は不要）

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

   - `/etc/nginx/sites-available/aws-weather-lab` を作成して 80 を Node プロセスへプロキシ
   - 設定反映: `sudo nginx -t && sudo systemctl reload nginx`

6. SSL（今回の学習方針）

   - 本学習フェーズでは「HTTP のみ」を採用します。学習の前提を単純化して動作確認に集中するためです。
   - 将来的に HTTPS を追加する場合のオプション:

     - 既にドメインを持っている場合: certbot（Let's Encrypt）で証明書を取得して nginx に組み込む。
     - ドメインを持たないが一時的に TLS が必要な場合: `ngrok` 等のトンネルを利用して HTTPS のエンドポイントを得る。
     - 自己署名証明書: 学習用に試せるがブラウザの警告を受け入れる必要あり。

   - 例（ドメインがある場合、後で実行）:

   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.example.com
   ```

7. 環境変数の管理

   - 学習段階では `/srv/aws-weather-lab/.env` を使ってもよいが、長期的には AWS SSM Parameter Store や Secrets Manager を学ぶ

8. ドメインの DNS 設定（任意）

   - Route53 を使わない場合、ドメインがあるならその DNS 管理画面で A レコードを EC2 の Elastic IP に向ける。

9. ログ・監視
   - CloudWatch Logs / CloudWatch Agent を導入してアプリログとメトリクスを収集（学習の後半で検討）

チェックリスト

- [ ] EC2 にアクセスできる
- [ ] アプリが PM2/systemd で稼働している
- [ ] HTTP でアプリにアクセスできる（学習フェーズの要件）
- [ ] CloudWatch にログが流れている（簡易、任意）

注意点

- SSH は可能な限り IP 制限する
- 学習後はインスタンスを停止・削除してコストを抑える

次にやること

- CI/CD（GitHub Actions）と IaC（CDK/CloudFormation）を作成して自動化する（フェーズ C）
