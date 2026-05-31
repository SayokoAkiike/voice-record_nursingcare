# 🏥 看護記録音声入力システム

患者との会話から音声入力し、**AIが看護記録を自動整形**するWebアプリです。  
キーワード検出による自動保存・録音停止にも対応しています。

## 特徴

- 🎤 音声入力をリアルタイムで下書きメモに反映
- 🤖 Claude AIによる看護記録の自動整形
- 🔍 キーワード検出で保存・録音停止を音声操作
- 📱 タブレット（Chrome）最適化

## 動作環境

- **推奨ブラウザ**: Google Chrome（Android / iPad）
- **必須**: HTTPS環境（音声認識APIの要件）

## セットアップ

```bash
# 1. リポジトリをクローン
git clone https://github.com/SayokoAkiike/voice-record_nursingcare.git
cd voice-record_nursingcare

# 2. 依存関係をインストール
npm install

# 3. 環境変数を設定
cp .env.example .env
# .envを開いて VITE_ANTHROPIC_API_KEY にAPIキーを入力

# 4. 開発サーバー起動
npm run dev
```

## 使い方

1. 患者名・記録タイトルを入力する
2. 「音声入力開始」ボタンを押して話す
3. 話した内容が「下書きメモ」にリアルタイムで反映される
4. 「AIで整形」ボタンを押すと Claude が記録を整形してくれる
5. 「記録を保存」ボタンで保存する

> 「保存」「終了」などのキーワードを声で言うと、
> 保存・録音停止を自動で実行することもできます。

## 注意事項

- Anthropic APIキーが必要です（[取得はこちら](https://console.anthropic.com/)）
- APIキーはブラウザのローカルストレージに保存されます。共有端末での利用には注意してください
- 音声データはサーバーに送信されません。文字起こしテキストのみAPIに送信されます
