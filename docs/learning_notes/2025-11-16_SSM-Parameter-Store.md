# SSM（Parameter Store）へ API キー移行

## 📅 学習日時

2025 年 11 月 16 日

## ✅ 結論

`OPENWEATHER_API_KEY` をローカルの `.env.local` から AWS Systems Manager Parameter Store の `SecureString` に移行し、EC2 のインスタンスプロファイル経由で安全に読み取って pm2 に注入することで、秘密情報の露出リスクを下げつつ運用を安定化できた。

## 🧠 背景・目的

- リポジトリやワークステーションに API キーを平文で残すと漏洩リスクがある。`.gitignore` に入れていても既にコミット済みだと履歴に残るため危険。今回の目標はキーを安全に保存し、実行環境（EC2）から安全に参照できる運用に切り替えること。
- Parameter Store の `SecureString` を使い、インスタンスに最小権限ロール（`ssm:GetParameter`）を付与して読み取る設計にした。

## 🔧 実施したこと（短く）

1. EC2 に IAM ロールが付いているかを IMDSv2 で確認（最初はロール未付与だったため、コンソールで割り当てた）。
2. Parameter Store に予約名前空間を避けた名前（例: `/meerkat39/aws-weather-lab/OPENWEATHER_API_KEY`）で `SecureString` を作成。
3. EC2 側で `aws ssm get-parameter --with-decryption` によって値を取得し、`export OPENWEATHER_API_KEY=...` で環境に入れて `pm2 restart aws-weather --update-env` で反映、`pm2 save` で dump を更新した。
4. 動作確認として `pm2 logs` と `curl` で API 呼び出しを行い、Unauthorized 等のエラーが出ないことを確認した。

## 🔁 手順（再現可能メモ）

### 1) IAM ロールの確認（EC2 上）

```bash
# IMDSv2 でトークン取得
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/iam/security-credentials/
```

- 404 が返ればインスタンスにロールが付与されていない。コンソールでロールを割り当てる必要がある。

### 2) 最小権限ポリシー（IAM）

ポリシー例（対象リージョンとアカウント ID を置き換える）:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ssm:GetParameter", "ssm:GetParameters"],
      "Resource": [
        "arn:aws:ssm:<region>:<account-id>:parameter/meerkat39/aws-weather-lab/*"
      ]
    }
  ]
}
```

### 3) Parameter Store に `SecureString` を作成（コンソールまたは CLI）

CLI 例（予約名前空間を避ける）:

```bash
aws ssm put-parameter \
  --name "/meerkat39/aws-weather-lab/OPENWEATHER_API_KEY" \
  --type "SecureString" \
  --value "<YOUR_API_KEY>" \
  --overwrite
```

※ 先頭のパス要素が `aws` や `ssm` にならないようにする（予約語回避）。

### 4) EC2 上で取得して pm2 に注入

```bash
export OPENWEATHER_API_KEY=$(aws ssm get-parameter \
  --name "/meerkat39/aws-weather-lab/OPENWEATHER_API_KEY" \
  --with-decryption --query Parameter.Value --output text)

pm2 restart aws-weather --update-env
pm2 save
```

### 5) 動作確認

```bash
pm2 status
pm2 logs aws-weather --lines 50
curl -I http://localhost:3000/
# または public IP 経由で HTTP 200 を確認
curl -I http://<PUBLIC_IP>/
```

## ✅ 確認ポイント

- EC2 の `IMDS` でロール名が返ってくること（ロール割当済み）。
- `aws ssm get-parameter` が `AccessDenied` ではなく値（or NoSuchParameter）を返すこと。
- `pm2 status` で `aws-weather` が `online`、`pm2 logs` に Unauthorized エラーが出ないこと。
- Parameter Store のリージョンが EC2 と一致していること。

## ⚠️ よくある失敗（トラブルシュート）

- 名前空間の先頭に `aws` を使ってパラメータ作成しようとすると "reserved parameter name" エラーになる → 名前を `/meerkat39/...` のように変更する。
- インスタンスにロールが付与されていない / ポリシーが足りない → `AccessDenied` が返る（コンソールでロールをアタッチ、またはポリシー確認）。
- `.env.local` を忘れてリポジトリにコミットしていた場合はキーをローテーション（再発行）し、必要なら履歴から削除（BFG / git filter-repo）。

## 次の推奨アクション

1. リポジトリに `scripts/fetch-ssm-and-start.sh` と `docs/deploy/ssm.md` を追加して運用手順を固定化する（再現性向上）。
2. `/healthz` などのヘルスチェックを実装して CloudWatch アラームや ALB ヘルスチェックと連携する。
3. CloudWatch Logs に pm2 のログを送る設定を行い、アラートを作る。

---

このメモは `docs/rules/learning-notes-guide.md` のテンプレートに従って作成しました。必要なら具体的ファイル（スクリプト・ドキュメント）をリポジトリに追加します。
