# NexusGuild LP

NexusGuild の公式ランディングページ。公開先: https://haru20190621-a11y.github.io/nexusguild-lp/

## ファイル構成

```
nexusguild_lp/
├── index.html              ← 単一ファイル（CSS/JS内蔵）
├── web.html                ← 旧・料金ページ。いまはトップへ転送するだけ（古いDMのリンク用に残す）
├── og-image.png            ← SNS共有用の画像（1200×630）
├── assets/
│   ├── shot-web.png        ← ケーキ予約サイト見本のトップ（自社制作物の実画面）
│   ├── shot-reserve.png    ← 同・受け取り日時を選ぶ画面
│   ├── shot-reserve-list.png ← 同・お店側の管理画面
│   └── shot-app.png        ← GymKeep（ジム会員向けアプリ）試用版の来館カレンダー
├── kyomachi/privacy.html   ← 京町ごはんボットのプライバシーポリシー（Meta審査の登録URL・消さない）
├── mail-processor-privacy/ ← メール処理AIのプライバシーポリシー（Google OAuth 審査用・消さない）
└── ushikubo/ chiecoffee/   ← 過去のデモサイト（トップからはリンクしていない）
```

## デザイン方針（2026-10-08 全面リニューアル）

- 参考: https://12-office.com/ の静かな作り（白地・縦書きナビ・番号付きセクション・余白広め）
- **3本柱**: Webサイト制作／予約サイト制作／アプリ制作。**料金は載せない**（ハル指示）
- **AI生成の画像・動画は使わない**（ハル指示）。載せる画像は自社制作物の実画面のスクリーンショットだけ
  - 予約サイト: `D:\dev\cake-reserve` の見本店（slug `sample`・架空店・画像は SVG のイラスト）を `npm run dev` → `http://127.0.0.1:5173/?shop=sample` で開き、390×844 で撮影。上のデモ帯と右のスクロールバーは切り落とす
  - アプリ: `gymkeep\v02_shots\m_calendar.png` の上 140px（ジム名＝個人名が入る部分）を切り落としたもの
- 色は白 #fff・薄灰 #f6f5f2・墨 #1b1b1b の3つだけ。アクセント色なし。書体は Shippori Mincho（見出し・縦書き）＋ Zen Kaku Gothic New（本文）
- 動きはスクロール出現のみ。`prefers-reduced-motion` で止まる。`?review=1` を付けると全部表示した状態で開く（スクショ用）
- 個人名・生年・出身は載せない（2026-10 の方針）。運営の欄は「尚美学園大学の学生が運営」まで

## ローカルプレビュー

```bash
python -m http.server 8011 --directory nexusguild_lp/nexusguild_lp
```

## デプロイ

`main` に push すると GitHub Pages に反映される（反映まで数分・キャッシュ約10分）。画像を差し替えたら `?v=N` を上げる。
