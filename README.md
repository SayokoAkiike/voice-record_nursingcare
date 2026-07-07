# 🏥 看護記録 音声/テキスト入力 支援プロトタイプ

患者・看護師の会話やメモを **音声またはテキスト** で入力し、バックエンドAPI（`nurse-intake-assistant`）と連携して **SOAP下書き・構造化情報・追加問診・優先度** を整理するReact/Viteフロントエンドです。

> ⚠️ これはデモ/プロトタイプです。実患者の氏名・ID等の個人情報は入力しないでください。AI出力は看護記録作成の**参考情報**であり、診断・治療方針・緊急度（トリアージ）判定を代替するものではありません。

## このリポジトリの役割

- 音声入力開始／停止、テキスト入力
- 入力メモのブラウザ内保存（ローカルストレージ、この端末のみ）
- 「AIで整理する」ボタンでバックエンドAPI（またはデモ用サンプル）を呼び出し
- SOAP下書き・構造化情報・追加問診・優先度の表示

バックエンド（SOAP生成・音声文字起こし本体）は別リポジトリ [`nurse-intake-assistant`](https://github.com/SayokoAkiike/nurse-intake-assistant) です。

## 2つの動作モード

### 1. デモモード（`VITE_DEMO_MODE=true`）

バックエンドに一切接続せず、サンプルのSOAP下書き・構造化情報・追加問診・優先度をその場で生成して表示します。外部の方にUI・体験だけを見せたいときに使います。音声文字起こしAPI（`/api/transcribe`）も呼び出さず、押すと案内メッセージを表示します。

### 2. 本接続モード（`VITE_DEMO_MODE=false`）

`VITE_API_BASE_URL` に指定したバックエンド（`nurse-intake-assistant`）に接続し、`/api/intake`・`/api/transcribe` を実際に呼び出します。

デプロイの詳しい手順（Vercel + Render）は [`docs/deployment.md`](./docs/deployment.md) を参照してください。

## セットアップ（ローカル開発）

```bash
# 1. リポジトリをクローン
git clone https://github.com/SayokoAkiike/voice-record_nursingcare.git
cd voice-record_nursingcare

# 2. 依存関係をインストール
npm install

# 3. 環境変数を設定
cp .env.example .env
# .env を開いて必要に応じて値を編集する
#   VITE_DEMO_MODE=true          … バックエンドなしでデモ動作
#   VITE_API_BASE_URL=...        … バックエンドのURL（本接続モード時）
#   VITE_APP_API_KEY=...         … バックエンドの APP_API_KEY と同じ値（本接続モード時）

# 4. 開発サーバー起動
npm run dev
```

## 使い方

1. 患者ID／仮名（実名不可）・記録タイトルを入力する
2. 「音声入力開始」を押して話す、またはテキスト欄に直接入力する
3. 「AIで整理する」を押すとSOAP下書き・構造化情報・追加問診・優先度が表示される（デモモードではサンプル、本接続モードでは実際のAPI結果）
4. 「記録を保存」でこの端末にメモを保存する

## 音声入力の仕組み

1. **Web Speech API**（Chrome / Edge 推奨）でリアルタイム文字起こしを試みます。
2. 非対応ブラウザ、またはWeb Speech APIが使えない場合は **MediaRecorderで録音 → バックエンドの `/api/transcribe` に送信 → 文字起こし結果を入力メモに反映** するフォールバックに切り替わります。
3. どちらも使えない環境では、テキスト入力のみで利用できます。

音声入力がうまく動かない場合のチェックリストは [`HTTPS_DEPLOYMENT.md`](./HTTPS_DEPLOYMENT.md) と [`docs/deployment.md`](./docs/deployment.md) のトラブルシューティング欄を確認してください（HTTPS必須、マイク許可、ブラウザ対応状況など）。

## 注意事項

- **実患者の個人情報（氏名・ID・生年月日など）は入力しないでください。** デモ・プロトタイプ用途です。
- AI出力は看護記録作成の**参考情報**です。診断・治療方針・緊急度（トリアージ）判定の代替ではありません。
- `VITE_APP_API_KEY` はブラウザバンドルに含まれ外部から見える値です。本番の秘密鍵としては扱わず、簡易的なデモ用ゲートとしてのみ使用してください。
- 入力メモはブラウザのローカルストレージに保存されます。共有端末での利用には注意してください。
