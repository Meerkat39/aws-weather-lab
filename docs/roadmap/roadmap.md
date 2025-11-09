# 進め方ドキュメント（EC2 → サーバーレス移行を見据えたロードマップ）

このドキュメントは、個人の AWS 学習用 Next.js 天気アプリ（TypeScript + Tailwind + ESLint + App Router）に対する実装・運用の進め方を示します。
目的は「小規模でも本番っぽいアプリを AWS にデプロイする体験」を安全に得ることです。

## 1) 要点（短く）

- まずはローカルで Next.js（TypeScript + Tailwind）アプリを完成させる。
- 次に EC2 上へデプロイして「フルコントロールでの運用」を体験する（インスタンス・ネットワーク・セキュリティ・SSL 等）。
- 最終的にサーバーレスへ段階的に移行（Lambda/API Gateway、S3+CloudFront、DynamoDB 等）する。
- CI/CD と IaC（CloudFormation / CDK）は早めに取り入れ、デプロイ手順を自動化・再現可能にする。

## 2) フェーズ（各フェーズの目的と成果物）

フェーズ A — 準備（ローカル）

- 目的: アプリの機能（OpenWeather 取得・表示）をローカルで動かし、品質ゲートを通す。
- 成果物:
  - `src/lib/openWeather.ts`（API クライアント）
  - `src/app/(components)/WeatherCard.tsx` と `page.tsx` の UI
  - `.env.local.example`
  - ローカルでのビルドが通ること

フェーズ B — EC2 デプロイ（学習目的で最初にやる）

- 目的: AWS 上での一連の構築（EC2, Security Group, IAM, Route53/ALB, SSL）を理解する。
- 成果物:
  - EC2 上に Next.js をホスト（PM2 or systemd + nginx リバースプロキシ）
  - ドメイン（Route53）を紐づけて HTTPS（Let's Encrypt / ACM）で公開
  - CloudWatch に簡易ログ/アラームを設定

フェーズ C — CI/CD と IaC

- 目的: デプロイを自動化し、インフラをコードで管理する。
- 成果物:
  - GitHub Actions（Lint/TypeCheck/Test/Build/Deploy）
  - CloudFormation または CDK で EC2 用の簡易テンプレート（VPC・SG・EC2）
  - 手順書（README のデプロイ章）

フェーズ D — サーバーレス移行（段階的）

- 目的: 運用コスト削減やスケーラビリティ向上を学ぶ。
- 戦略（ステップ）:
  1. 静的部分を S3 + CloudFront に切り出す（Next.js の static export or next export）。
  2. API 層を Lambda + API Gateway（または Lambda@Edge / CloudFront Functions）へ移行。
  3. 必要なら DynamoDB へデータ保存（お気に入り機能など）。
  4. Next.js の Server-side rendering が必要なら serverless-next.js や Vercel/Render を検討。
- 成果物:
  - S3/CloudFront 配信、Lambda での API、IaC の更新、CI/CD の serverless 対応

## 3) EC2 デプロイ手順（実務手順：学習用に簡潔に）

1. EC2 準備

   - インスタンスタイプ: t3.small などで十分（学習）
   - AMI: Amazon Linux 2 / Ubuntu LTS
   - セキュリティグループ: 22(SSH), 80, 443 を適切に制限（SSH は自分の IP のみに）
   - キーペアを作成してダウンロード

2. サーバーセットアップ（例: Ubuntu）

   - SSH で接続
   - Node.js（推奨: LTS）と npm をインストール
   - nginx をインストール（リバースプロキシ）
   - アプリをクローン、`npm ci`、`npm run build`、`npm run start`（または PM2 で永続化）
   - nginx を設定して 80/443 をプロキシし、Let's Encrypt（certbot）で SSL を取得

3. 環境変数

   - EC2 の環境（例: systemd の ExecStart 環境変数、もしくは `.env` を /srv/app に配置し権限を限定）
   - API キーは EC2 上に平文で置かない（学習段階では少量許容）。本番では Secrets Manager や SSM Parameter Store を使用。

4. ドメイン & DNS

   - Route53 でホストゾーン作成、A レコードを ELB/CloudFront/EC2 に割当て

5. ログと監視
   - CloudWatch Logs にアプリログを送るか、EC2 エージェントを設定
   - CloudWatch アラーム（CPU/メモリ/レスポンスタイム閾値）

コマンド（サーバー側の基本例）

```bash
# Ubuntu: Node.js LTS のインストール
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential

# PM2 のインストール（プロセスマネージャ）
sudo npm install -g pm2
pm2 start npm --name "aws-weather-lab" -- start
pm2 save
pm2 startup
```

## 4) サーバーレス移行の具体案（選択肢と利点）

- 静的ホスティング（低コスト）
  - S3 + CloudFront。Next.js の static export が使える箇所は移行すぐ効果有り。
- API を Lambda へ
  - 利点: スケール自動化、管理運用コスト低下
  - 注意点: Cold start、Lambda のタイムアウト、Lambda レイヤーのパッケージサイズ
- Next.js をそのまま移行する場合
  - serverless-next.js や Vercel、CloudFront + Lambda@Edge を検討（実運用は複雑）
- データ永続化
  - シンプル: RDS (if relational needed)
  - サーバーレス向け: DynamoDB（スキーマ設計に注意）

## 5) CI/CD と IaC の推奨（学習優先度順）

1. GitHub Actions: Lint / TypeCheck / Test / Build
2. デプロイ:
   - EC2: SSH + rsync + systemd (学習用, 簡単)
   - Amplify: Git-based auto deploy（Next.js を簡単に使える）
   - Serverless: Serverless Framework / SAM / CDK で Lambda デプロイ
3. IaC: CDK (TypeScript) を推奨（Udemy で学んだ CloudFormation 概念の実務的拡張）
   - 最初は EC2 用の最小 CDK スタック（VPC, SG, EC2）を作ると理解が深まる

## 6) セキュリティとコスト注意点（学習者向け）

- セキュリティ
  - SSH は可能な限り IP 制限
  - IAM ポリシーは最小権限
  - API キーは Secrets Manager / SSM を使う
- コスト
  - EC2 タイプの選択と稼働時間に注意（学習は停止で節約）
  - CloudFront はキャッシュ効率でコストが下がる
  - Lambda はリクエスト数と実行時間で課金

## 7) 品質ゲート（最低限）

- ローカル: npm run build が成功
- Lint: npm run lint が成功
- Type: 型エラーゼロ
- Test: fetch クライアントのユニットテスト（正常系・エラー系）を最低 1 つ
- デプロイ後: エンドポイントに対するヘルスチェック（ステータス 200）

## 8) 学習マッピング（あなたの受講履歴に合わせた優先順）

- Udemy（AWS 基礎コース）で学んだ内容を EC2 運用で復習（ネットワーク / Security Group / Route53 / ELB / CloudWatch）
- サーバーレス講座の学びは移行フェーズで活かす（Lambda, API Gateway, DynamoDB, EventBridge）
- CI/CD と IaC は両講座で触れているため、最初から簡単な GitHub Actions + CDK（小さめ）を実装すると理解が定着

## 9) リスク・回避策

- リスク: 初めての EC2 設定で公開鍵や SG を誤る → 回避: ローカルで SSH 接続確認、最初はパブリック IP を限定、不要時はインスタンスを停止
- リスク: API キー漏えい → 回避: .env.local を gitignore、Secrets Manager 学習
- リスク: コスト増大 → 回避: 学習終了後インスタンス停止/削除、CloudWatch で予算アラーム

## 10) 期間とマイルストーン（提案）

- 1 週目: フェーズ A（ローカル機能 + ビルド通過） — 2〜4 日
- 2 週目: フェーズ B（EC2 デプロイ・ドメイン設定） — 2〜4 日
- 3 週目: フェーズ C（CI/CD + 簡易 IaC） — 2 日
- 4 週目以降: フェーズ D（サーバーレス移行、実験と改善） — 継続

## 11) 次のアクション（提案）

選んでください:

- 1. このドキュメントをリポジトリに追加（`DOCS/roadmap.md`）しておきます。
- 2. フェーズ A（`openWeather` クライアント + WeatherCard）を実装してビルド・型チェックを行います。
- 3. フェーズ B の EC2 デプロイ用の具体的手順ファイル（`DOCS/deploy-ec2.md`）を作成します（手順とコマンド付き）。

---

このファイルは学習の進捗に合わせて随時更新してください。
