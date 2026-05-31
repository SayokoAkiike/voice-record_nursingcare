# HTTPS デプロイメント ガイド

このアプリケーションは開発環境では HTTP で動作していますが、本番環境では HTTPS が必須です（Web Audio API / SpeechRecognition API の仕様）。

## 方法 1: Nginx / Apache + Let's Encrypt（推奨・本番向け）

### 前提条件
- ドメイン名（例: nurse-record.example.com）
- Nginx または Apache がインストールされたサーバー

### セットアップ手順

```bash
# 1. Let's Encrypt 証明書を取得
sudo certbot certonly --webroot -w /var/www/nurse-record -d nurse-record.example.com

# 2. Certbot と Nginx を自動更新するよう設定
sudo systemctl enable certbot
sudo systemctl enable certbot.timer

# 3. Nginx 設定例
server {
    listen 443 ssl http2;
    server_name nurse-record.example.com;

    ssl_certificate /etc/letsencrypt/live/nurse-record.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nurse-record.example.com/privkey.pem;

    # SSL セキュリティ設定
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Node.js アプリへのプロキシ
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTP → HTTPS リダイレクト
server {
    listen 80;
    server_name nurse-record.example.com;
    return 301 https://$server_name$request_uri;
}
```

## 方法 2: Vercel / Railway / Heroku（ノーコードデプロイ）

Vercel や Railway では HTTPS が自動で設定されます。

```bash
# Vercel にデプロイ
npm install -g vercel
vercel
```

## 方法 3: Docker + Traefik（本社内サーバー向け）

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 5173
CMD ["npm", "run", "preview"]
```

docker-compose.yml で Traefik と連携し、自動 HTTPS 化。

## 開発環境での HTTPS テスト（mkcert 使用）

### macOS / Linux

```bash
brew install mkcert
mkcert -install
mkcert localhost 127.0.0.1 ::1
```

### Windows（Git Bash 推奨）

```bash
choco install mkcert
mkcert -install
mkcert localhost 127.0.0.1
```

その後、`vite.config.ts` に証明書パスを設定：

```typescript
import fs from 'fs';

export default defineConfig({
  server: {
    https: {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost.pem')
    }
  }
});
```

## 音声認識がうまく動かない場合

### チェックリスト

- [ ] **localhost でテスト？** → 外部ネットワーク IP では HTTP 利用不可
- [ ] **HTTPS が有効？** → Chrome DevTools Console でエラーコードを確認
- [ ] **マイク権限は許可？** → ブラウザ設定 → サイト権限 → マイク
- [ ] **firewall がマイク遮断していないか？** → Windows Defender / アンチウイルスを確認

### エラーコード別対応

| コード | 原因 | 対応 |
|-------|------|------|
| `not-allowed` | HTTP（非 HTTPS） | HTTPS に切り替え |
| `network` | マイク未接続 | マイクを確認 |
| `no-speech` | 音声検出されず | マイクをテスト・増幅 |
| `permission-denied` | ブラウザが拒否 | ブラウザ権限設定をリセット |

## 参考リンク

- [Let's Encrypt 公式](https://letsencrypt.org/)
- [Certbot ドキュメント](https://certbot.eff.org/)
- [Web Audio API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [SpeechRecognition API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
