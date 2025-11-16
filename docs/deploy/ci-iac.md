# CI/CD と IaC（学習用）ガイド

このドキュメントは、学習目的で用意した最小限の CI/CD ワークフロー（GitHub Actions）と IaC（Terraform）雛形の使い方を説明します。

## 目的

- GitHub Actions でビルド → EC2 へデプロイする流れを体験する。
- Terraform を使って EC2 の作成を学ぶ（基本的なプロビジョニングとセキュリティグループ設定）。

## GitHub Actions（自動デプロイ）

ワークフロー: `.github/workflows/deploy-ec2.yml`

必要なリポジトリシークレット（Settings → Secrets）:

- `EC2_HOST` — EC2 のパブリック IP またはホスト名
- `EC2_USER` — 接続ユーザー（例: `ec2-user`）
- `EC2_SSH_KEY` — デプロイ用の秘密鍵（OpenSSH 形式、改行を含めて登録）
- `EC2_SSH_PORT` — SSH ポート（通常 `22`）
- `EC2_DEPLOY_DIR` — デプロイ先ディレクトリ（例: `/home/ec2-user/aws-weather-deploy`）

ワークフローの流れ:

1. コード checkout
2. Node で `npm ci` → `npm run build`
3. アーティファクトを tar でまとめて EC2 に scp
4. EC2 上で展開して `npm ci --production` → `pm2 restart` を実行

注意点:

- 秘密鍵はリポジトリに保存しないでください。GitHub Secrets を利用してください。
- デプロイ先での権限や `pm2` のユーザー設定（`~/.pm2` 所有者など）に注意してください。

## ローカル・ワンライナー（手動デプロイ）

用意したスクリプト: `scripts/deploy-to-ec2.sh`

使い方例:

```bash
./scripts/deploy-to-ec2.sh ec2-user 54.95.169.65 /home/ec2-user/aws-weather-deploy
```

スクリプトはローカルでビルド → tar にパッケージ → scp で転送 → SSH で展開・pm2 再起動を行います。

## Terraform（学習用スケルトン）

ファイル: `infra/main.tf`

注意: これは学習用の最低限の例です。実運用では AMI の選定、キー管理、サブネット / IAM ロール / userdata によるブートストラップなどを追加してください。

基本的な使い方:

1. `cd infra`
2. `terraform init`
3. `terraform plan -var 'key_name=your-key' -out plan.tfplan`
4. `terraform apply plan.tfplan`

このサンプルは、SSH と HTTP を開けたセキュリティグループを作成します。運用では `0.0.0.0/0` を避け、自分の IP に限定してください。

## 次に学ぶべきこと（推奨）

- デプロイ時のロールバック戦略（artifact バージョン管理）
- GitHub Actions のジョブ分割（テスト／ビルド／デプロイ）
- Terraform による IAM / Instance Profile の自動作成と連携
- Secrets Manager / Parameter Store と連携したシークレット注入
