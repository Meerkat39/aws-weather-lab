**S3 + SSM デプロイ（概要）**

- **目的**: GitHub Actions がビルドアーティファクトを S3 にアップロードし、EC2 は SSM の Run Command でリモート実行されるスクリプトで S3 から取得してデプロイします。これにより、GitHub ホストランナーから EC2 の SSH を直接許可する必要がなくなります。

- **必要な Secrets / 設定（リポジトリ Secrets）**

  - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` — Actions から S3 アップロードと SSM 呼び出しを行うための権限（または OIDC ロールを使う）
  - `DEPLOY_S3_BUCKET` — アップロード先の S3 バケット名
  - `EC2_INSTANCE_ID` — デプロイ対象の EC2 インスタンス ID（もしくはタグを使ってターゲティングする）

- **必要な IAM 権限（短く）**

  - Actions 用の IAM：`s3:PutObject`, `s3:PutObjectAcl`, `ssm:SendCommand`, `ssm:ListCommandInvocations`, `ssm:GetCommandInvocation`（最小限）
  - EC2 のインスタンスプロファイル（EC2 に付与）：`s3:GetObject`（デプロイスクリプトが S3 から取得するため）、`ssm:ListCommandInvocations` は不要

- **EC2 側の準備**

  - `awscli` がインストールされ、`/home/ec2-user/deploy-from-s3.sh` が配置され実行可能であること
  - `pm2` がインストールされ、デプロイ後に `pm2 restart aws-weather` でアプリを再起動できること
  - EC2 の IAM ロールに `s3:GetObject` 権限があること

- **実行フロー**

  1. Actions がアプリをビルドして `release.tgz` を作る
  2. Actions が `s3://$DEPLOY_S3_BUCKET/${{ sha }}-N.tgz` にアップロード
  3. Actions が `aws ssm send-command` を呼び出し、インスタンス上で `/home/ec2-user/deploy-from-s3.sh <bucket> <key>` を実行
  4. スクリプトが S3 からアーティファクトを落として抽出、依存インストール、シンボリック差し替え、pm2 再起動を行う

- **注意点**
  - Actions に直接平文の長期 AWS キーを保存する代わりに、GitHub OIDC と AssumeRole を使うことを推奨します。
  - S3 のオブジェクトに対するアクセス制御は適切に行ってください（バケットはプライベート）。
  - SSM コマンドは実行ログを出すので、失敗時は `aws ssm list-command-invocations --command-id <id> --details` でデバッグしてください。
