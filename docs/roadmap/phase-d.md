# フェーズ D — サーバーレス移行（継続）

目的

- サーバーレス技術を導入して、運用コスト削減とスケーラビリティの確保を学ぶ。

ゴール（成果物）

- 静的アセットが S3 + CloudFront で配信される
- API が Lambda + API Gateway へ移行される（必要に応じて）
- 必要なら DynamoDB を用いたデータ保存設計

ステップ（詳細）

1. 静的コンテンツの分離

   - Next.js の `next export` が使えれば静的部分を S3 にホスティング
   - または ISR/SSG 用の設定を見直して静的化できる箇所を増やす

2. S3 + CloudFront の設定

   - S3 バケットを作成し静的ファイルをアップロード
   - CloudFront ディストリビューションを作成しキャッシュ設定を最適化

3. API 層を Lambda に切り替える

   - Lambda + API Gateway (HTTP API) を検討
   - Node handler を用意し、OpenWeather の呼び出しは Lambda 内 or VPC リソースに切り替え
   - Cold start を意識したパッケージング（軽量化）とタイムアウト設定

4. データ永続化

   - ユーザー設定やお気に入りの永続化が必要なら DynamoDB を導入
   - スキーマ設計: パーティションキー・ソートキーを考慮

5. デプロイと IaC

   - Serverless Framework / SAM / CDK のいずれかで Lambda/API Gateway/S3/CloudFront を管理
   - CI を更新して serverless のデプロイを組み込む

6. 検証とモニタリング
   - CloudWatch Logs / X-Ray で Lambda の動作を確認
   - CloudFront キャッシュヒット率やエラー率を監視

チェックリスト

- [ ] 静的アセットが S3 + CloudFront で配信される
- [ ] 必要な API が Lambda で稼働し、応答が期待どおりである
- [ ] DynamoDB の設計が決まり、必要なら導入されている

注意点

- Lambda の実行時間やコールドスタート、パッケージサイズに注意する
- CloudFront のキャッシュ設定はテスト環境と本番で分ける

次にやること

- フェーズ D の小さい実験（例: OpenWeather を呼ぶ簡易 Lambda をデプロイして応答を確認）から始める
