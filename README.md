# 🌱 ひとあし — Next.js セットアップ

## ファイル構成

```
hitohashi-web/
├── app/
│   ├── api/claude/route.js   ← Anthropic API（サーバーサイド）
│   ├── layout.js             ← HTML・フォント・PWAメタ
│   ├── page.js               ← アプリ本体（全コンポーネント）
│   └── globals.css           ← アニメーション・グローバルCSS
├── public/
│   └── manifest.json         ← PWA設定
├── .env.local.example        ← APIキーのテンプレート
├── next.config.js
└── package.json
```

---

## セットアップ手順（5分）

### 1. 依存関係インストール
```bash
cd hitohashi-web
npm install
```

### 2. APIキーを設定
```bash
cp .env.local.example .env.local
```
`.env.local` を開いて `sk-ant-xxx...` を自分のキーに書き換える。
→ APIキーは https://console.anthropic.com/ で取得

### 3. 開発サーバー起動
```bash
npm run dev
```
→ http://localhost:3000 で開く

---

## Vercelにデプロイ

### 1. GitHubにプッシュ
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/yourname/hitohashi.git
git push -u origin main
```

### 2. Vercelでインポート
1. https://vercel.com → New Project
2. GitHubリポジトリを選択 → Import
3. **Environment Variables** に追加：
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-xxxxx...`
4. Deploy ボタン

---

## iOS（XcodeのWKWebView）との連携

`app/page.js` の先頭に定義済みのネイティブブリッジ：

```js
// iOSネイティブブリッジ検出
const isNative = typeof window !== 'undefined' && window.nativeApp?.isNative;

// 触覚フィードバック（ボタンタップ時など）
haptic('light' | 'medium' | 'heavy' | 'success' | 'error');

// チャレンジ完了をSwiftに通知
notifyChallengeComplete();

// 通知スケジュール（毎朝8時）
scheduleNotification(8, 'タイトル', '本文');
```

Xcodeの `ContentView.swift` の `appURL` を Vercel の URL に変更するだけで動作します。

---

## ローカルストレージについて

- **本番（Next.js）**: `localStorage` を使用
- **Claude Artifact環境**: `window.storage` を使用（自動切替済み）

両方に対応したラッパーが `sget` / `sset` として実装されています。
