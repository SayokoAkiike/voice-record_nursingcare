# デプロイ手順（初心者向け）

このプロトタイプは2つのリポジトリに分かれています。

- `voice-record_nursingcare`: React/Vite フロントエンド（音声・テキスト入力、SOAP表示）
- `nurse-intake-assistant`: FastAPI バックエンド（SOAP下書き生成・構造化情報抽出・追加問診・優先度補助・音声文字起こし）

大きく分けて **Step 1: Vercelだけでデモを動かす** → **Step 2: Renderでバックエンドも動かして本接続する** の2段階で進めます。

---

## Step 1: Vercelだけでデモモードを動かす

まずはバックエンドなしで、UI・操作感だけを外部の方に見せられる状態を作ります。

1. [Vercel](https://vercel.com/) にログインし、「Add New... → Project」から `voice-record_nursingcare` リポジトリをImportする。
2. ビルド設定（`vercel.json` に書いてあるので基本は自動検出されます）。
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Vercelプロジェクトの Environment Variables に以下を設定する。

   ```env
   VITE_DEMO_MODE=true
   VITE_API_BASE_URL=http://localhost:8000
   VITE_APP_API_KEY=change-me-for-demo
   ```

4. Deployを実行する。
5. 発行されたURL（`https://xxxx.vercel.app`）を開き、テキストを入力して「AIで整理する」を押す。サンプルのSOAP下書きが表示されれば成功です。

この状態では、

- テキスト入力は必ず動作します（デモ用のサンプル出力）。
- バックエンドには一切接続しません。
- 音声入力（Web Speech API）はブラウザによって動く/動かないがありますが、動かなくてもテキスト入力でデモは成立します。
- 音声のサーバー文字起こし（`/api/transcribe`）はデモモードでは使えず、その旨のメッセージが表示されます。

---

## Step 2: Renderでバックエンドを動かす

音声のサーバー文字起こしや、実際のAI推論によるSOAP生成を動かすには、バックエンドをデプロイします。

1. [Render](https://render.com/) にログインし、「New +→ Web Service」から `nurse-intake-assistant` リポジトリを接続する。`render.yaml` があるので設定はほぼ自動で読み込まれます。
2. 手動で設定する場合は以下の内容にする。

   ```bash
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn app.api.main:app --host 0.0.0.0 --port $PORT
   ```

3. Environment Variables に以下を設定する。

   ```env
   APP_API_KEY=change-me-for-demo
   OPENAI_API_KEY=<実際のOpenAI APIキー>
   OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
   ALLOWED_ORIGINS=https://<VercelのURL>,http://localhost:5173
   ALLOWED_METHODS=GET,POST,OPTIONS
   ALLOWED_HEADERS=Content-Type,X-App-API-Key
   ```

   - `APP_API_KEY` は好きな文字列でよいですが、後でVercel側の `VITE_APP_API_KEY` と必ず同じ値にします。
   - `ALLOWED_ORIGINS` にはVercelで発行された実際のURLを入れてください（デプロイ後に確定します）。
4. デプロイが完了したら、`https://<Renderで発行されたURL>/` にアクセスし、404にならず何かしらレスポンスが返ることを確認する。

---

## Step 3: Render URLをVercelに入れて本接続する

1. Vercelプロジェクトの Environment Variables を以下に変更する。

   ```env
   VITE_DEMO_MODE=false
   VITE_API_BASE_URL=https://<Step 2で発行されたRenderのURL>
   VITE_APP_API_KEY=change-me-for-demo
   ```

   `VITE_APP_API_KEY` はRender側の `APP_API_KEY` と必ず同じ値にしてください。

2. Vercelで再デプロイ（Redeploy）する。
3. Vercel上のアプリでテキストを入力し「AIで整理する」を押す。実際にバックエンドで生成されたSOAP下書きが表示されれば成功です。
4. 可能であれば音声入力も試す（下記「音声入力が動かない場合」を参照）。

---

## 音声入力が動かない場合

音声入力は環境によって挙動が変わります。以下を順番に確認してください。

- **ブラウザは Chrome または Edge を推奨します。** Web Speech API はSafari/iPhoneでは制限があり、不安定または利用できない場合があります。
- **HTTPS必須です。** Vercel/Renderは自動でHTTPSになりますが、ローカル開発でhttpのままだと音声系APIがブロックされます。
- **マイクの使用許可が必要です。** ブラウザの権限設定でマイクがブロックされていないか確認してください。
- **デモモード（`VITE_DEMO_MODE=true`）ではサーバー文字起こし（`/api/transcribe`）は利用できません。** テキスト入力でお試しください。
- **Safari/iPhoneではWeb Speech APIもMediaRecorderも制限がある可能性があります。** その場合は画面の案内に従いテキスト入力に切り替えてください。
- 上記を確認しても改善しない場合は、より詳しいチェックリストを [`../HTTPS_DEPLOYMENT.md`](../HTTPS_DEPLOYMENT.md) に記載しています。

---

## 重要な注意事項

- **実患者の氏名・ID・生年月日などの個人情報は絶対に入力しないでください。** これはデモ・プロトタイプです。
- AI出力（SOAP下書き・構造化情報・追加問診・優先度）は看護記録作成の**参考情報**です。診断・治療方針・緊急度（トリアージ）判定を代替するものではありません。
- GitHubリポジトリに `OPENAI_API_KEY` などの秘密情報を直接コミットしないでください。必ずVercel/Renderの環境変数機能を使ってください。
- `VITE_APP_API_KEY` はブラウザバンドルに含まれるため外部から見える値です。本番の秘密鍵としては扱わず、簡易的なデモ用ゲートとしてのみ使用してください。
- 本格的な臨床利用には、認証・認可・監査ログ・暗号化・院内の倫理審査などが別途必要です。
