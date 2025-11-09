# フェーズ C — CI/CD と IaC（2 日）

目的

- デプロイ手順を自動化し、インフラをコードで管理することで再現性を高める。

ゴール（成果物）

- GitHub Actions ワークフロー（lint / typecheck / test / build / deploy）
- 簡易 CDK (TypeScript) または CloudFormation テンプレート（EC2 スタックの最小構成）

ステップ（詳細）

1. GitHub Actions: 基本ワークフロー

   - ファイル: `.github/workflows/ci.yml`
   - ジョブ:
     - lint: `npm ci` → `npm run lint`
     - test: `npm ci` → `npm run test`
     - build: `npm ci` → `npm run build`
   - 例（概略）: `on: [push, pull_request]` で実行

2. デプロイ戦略（EC2 例）

   - option A (簡易): GitHub Actions で SSH 接続して `rsync` 〜 `pm2 restart` を実行
   - option B (IaC): CDK で EC2/ALB/SG を管理して、CodeDeploy などでデプロイを行う

3. 簡易 CDK の作成（TypeScript）

   - `cdk init app --language=typescript`
   - 最小スタック: VPC (既存 or default), Security Group, EC2 Instance（UserData で Node インストール）
   - デプロイ: `cdk deploy`

4. GitHub Secrets / AWS Credentials

   - Actions から AWS へアクセスするための `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` を GitHub Secrets に登録

5. テストとモニタリングの自動化
   - PR 毎に CI が通ることを必須にする（ブランチ保護ルール）

チェックリスト

- [ ] `.github/workflows/ci.yml` が追加されている
- [ ] GitHub Actions がビルドに成功する（最低で lint/typecheck/build）
- [ ] CDK テンプレートがデプロイできる（学習アカウントで確認）

注意点

- AWS のアクセスキーは必要最小限の権限（例: CodeBuild/EC2 の作成に限定）で発行する
- CDK で大きなリソースを作らない（コストに注意）

次にやること

- フェーズ D（サーバーレス移行）の検討と実験を行う
