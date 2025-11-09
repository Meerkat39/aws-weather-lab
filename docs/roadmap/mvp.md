# MVP（最小実用プロダクト）要件

目的

- ローカルで動作する最小限の天気予報アプリを作成し、その後 AWS にデプロイしやすい設計にする。

スコープ（MVP）

- 都市名で現在の天気を検索して表示する（気温、天気説明、湿度、風速、アイコン）。
- OpenWeather の API キーを環境変数（`.env.local`）で管理する。
- `npm run build` が成功すること（重大な型エラーや ESLint エラーがない状態）。

画面（最小）

1. Home (`/`)
   - 検索フォーム（都市名入力）
   - 検索結果表示領域（`WeatherCard`）
   - （任意）最近の検索/お気に入りの簡易リスト

画面遷移の方針

- 当面は Home 内で検索から結果表示まで完結（ページ遷移なし）。
- 将来的に詳細ページを作る場合は `/city/[name]` を追加し SSR でブックマーク可能にする。

主要機能（MVP）

- 都市検索 → 現在の天気を取得して表示
- エラーハンドリング（API キー未設定、都市未検出、ネットワークエラー、レート制限）
- 簡易的なローディング表示

データ契約（最小）

- 関数: `fetchWeatherByCity(city: string): Promise<WeatherData>`
- 型（例）:

```ts
export type WeatherData = {
  cityName: string;
  coord: { lat: number; lon: number };
  tempC: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeedMps: number;
  timestamp: number;
};
```

API（Next.js の API route / server function）

- GET `/api/weather?city={city}` → { data: WeatherData }
- エラー: 400 / 404 / 429 / 500 を適切に返す

受け入れ基準（MVP）

- 検索で有効な都市名を入れると天気が表示される
- API キー未設定時はユーザーにわかりやすいエラーメッセージが表示される
- `npm run build` が成功する（重大な型エラー・lint エラーがない）

優先実装タスク（順序）

1. `src/lib/types.ts` に `WeatherData` 型を追加
2. `src/lib/openWeather.ts` を作成（API クライアント・環境変数読み込み・基本エラーハンドリング）
3. `src/app/(components)/WeatherCard.tsx` の雛形作成（受け取った `WeatherData` を表示）
4. `src/app/page.tsx` に `SearchForm` を置き、クライアント側で `/api/weather` を叩いて `WeatherCard` を差し替える実装
5. `.env.local.example` を追加（`OPENWEATHER_API_KEY` のプレースホルダ）
6. `npm run build` と簡易テストを実行して品質ゲートを確認

短期テストケース（優先）

- fetch client のユニットテスト: 正常系、404（NOT_FOUND）、429（RATE_LIMIT）、キー未設定
- `WeatherCard` のレンダリングテスト（props に基づく表示）

次のアクション候補

- A: 私が `src/lib/openWeather.ts` の雛形（TypeScript・エラーハンドリング・簡易テスト）を作成します。
- B: まず `WeatherCard` と `SearchForm` の雛形を作って画面を動かせるようにします。

このファイルはロードマップの一部として随時更新してください。
