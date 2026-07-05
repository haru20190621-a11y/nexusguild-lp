# NexusGuild LP

NexusGuild の公式ランディングページ。

## ファイル構成

```
nexusguild_lp/
├── index.html      ← 完全な単一ファイル（CSS/JS全部内蔵）
└── README.md
```

シングルファイル設計。これだけで完結。

## デザイン方針（2026-07-06 全面リニューアル）

- **2本柱構成**: ①地域店舗のWebサイト制作（先に作って無料でお見せする）②AI導入サポート。コンセプトは「先に作って、お見せする。」
- **エディトリアル・ミニマル**: 生成り #f6f3ec × 墨 #1f1c18 × 朱 #c73e1d。細罫線グリッド・余白広め・ストック写真なし
- **明朝メイン + 等幅サブ**: Shippori Mincho（見出し）+ JetBrains Mono（メタ）+ Zen Kaku Gothic New（本文）
- **動き**: テロップ帯マーキー・スクロール出現・AIターミナル実演・縦書き。prefers-reduced-motion 対応
- **批評エージェント審査済み**: local-web-factoryスキルの品質基準（AI感5点セット禁止等）で2周審査→合格

## ローカルプレビュー

```bash
cd nexusguild_lp
python3 -m http.server 8000
```

ブラウザで http://localhost:8000 を開く。

## デプロイ手順（GitHub Pages・無料）

### 1. GitHub リポジトリ作成
- GitHub にログインして「New repository」
- リポジトリ名: `nexusguild-lp`（公開設定）

### 2. ファイルをプッシュ

```bash
cd nexusguild_lp
git init
git add .
git commit -m "Initial commit: NexusGuild LP"
git branch -M main
git remote add origin https://github.com/<ユーザー名>/nexusguild-lp.git
git push -u origin main
```

### 3. GitHub Pages 有効化
- リポジトリ → Settings → Pages
- Source: `Deploy from a branch`
- Branch: `main` / `/ (root)`
- Save

数分後、`https://<ユーザー名>.github.io/nexusguild-lp/` で公開される。

## 独自ドメインを設定する場合（後回しでOK）

1. お名前.com or Cloudflare Registrar でドメイン取得（`.com` は年1,500円程度）
2. リポジトリの Settings → Pages → Custom domain
3. ドメインのDNS設定でCNAMEを設定

## 編集ポイント（公開前に確認）

### 必ず変える
- `mailto:halu.nexusguild@example.com` → 実際のメールアドレス
- `https://x.com/aiharu_ng` → 実際のXアカウントURL

### 状況に応じて変える
- うさねこ社長の名前出しは事前に許可取り済みか確認
- 「2026 / Saitama, Japan」の年・地域
- 「尚美学園大学 1年」の学年

## 改修のコツ

セクションを足したい場合、既存の `<section>` 構造をコピーすれば違和感なく拡張できる。

CSS変数（`:root` の中）を変えれば全体の色味を一気に変えられる:
- `--bg`: 背景色
- `--accent`: アクセントカラー（現在は赤系 #d63a1c）
- `--ink`: 文字色
