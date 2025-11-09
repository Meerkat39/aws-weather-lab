# フェーズ A — ローカル実装（2〜4 日）

目的

- ローカルで Next.js アプリを完成させ、型チェック・ビルドが通る状態にする。

ゴール（成果物）

- `src/lib/openWeather.ts`（OpenWeather API クライアント）
- `src/app/(components)/WeatherCard.tsx`（Server/Client コンポーネント設計）
- `.env.local.example` と README のローカル手順追記
- 最低 1 件のユニットテスト（API クライアント）

ステップ（詳細）

1. 環境セットアップ

   - Node.js LTS をインストール
   - リポジトリをクローンして依存をインストール

   ```bash
   npm ci
   ```

2. 環境変数の準備

   - プロジェクトルートに `.env.local` を作成（コミットしない）
   - 例: `.env.local.example` を作成して以下を記載

   ```text
   OPENWEATHER_API_KEY=your_api_key_here
   NEXT_PUBLIC_APP_NAME=aws-weather-lab
   ```

3. OpenWeather クライアント実装（サンプル契約）

   - ファイル: `src/lib/openWeather.ts`
   - 関数: `export async function fetchWeather(city: string): Promise<WeatherData>`
   - 挙動: `.env.local` の `OPENWEATHER_API_KEY` を使って fetch。エラー時はわかりやすい例外を投げる。
   - 型: `WeatherData` に (temp, description, icon, humidity, windSpeed) を含める。

4. コンポーネント実装

   - `src/app/(components)/WeatherCard.tsx` を作り、サーバーコンポーネントで `fetchWeather` を呼ぶ形で最初は実装。
   - 都市検索は最初は簡易フォーム（server action または client component を利用）で実装する。複雑化させない。

5. ビルド & 型チェック

   ```bash
   npm run build
   ```

   - TypeScript の型エラーを解消する
   - ESLint の警告を可能な範囲で修正する

6. テスト

   - Jest（またはプロジェクトのテストフレームワーク）で `fetchWeather` の正常系・エラー系をモックしてテストを書く
   - 例: `src/lib/__tests__/openWeather.test.ts`

7. ドキュメント
   - `.env.local.example` と `README.md` の「ローカルでの起動」セクションを更新

チェックリスト

- [ ] `npm ci` が成功する
- [ ] `.env.local.example` がリポジトリに追加されている
- [ ] `npm run build` が成功する
- [ ] OpenWeather クライアントのユニットテストが 1 件以上ある

注意点

- OpenWeather の API キーは公開しない。`.gitignore` により `.env.local` は除外されているか確認する。

次にやること

- フェーズ B（EC2 デプロイ）に進む準備として、アプリが正常に動くことを確認しておく。
