# Junior Soccer Score Memo

Vercel デプロイ前提の Next.js + Prisma + LINE LIFF 構成です。

## 実装済み

- LINE LIFF ログイン前提の保存・更新
- 保存者 / 更新者の記録と表示
- Postgres 保存用 Prisma スキーマ
- スコア入力中のローカル自動保存
- 試合結果の表形式一覧
- CSV import / export
- 年代タグの複数選択

## セットアップ

1. `.env.example` を `.env.local` にコピー
2. `DATABASE_URL`, `LINE_CHANNEL_ID`, `NEXT_PUBLIC_LIFF_ID` を設定
3. `npm install`
4. `npx prisma generate`
5. DB作成後に `npx prisma migrate deploy`
6. `npm run dev`

## Vercel

- Vercel では Postgres 系の Marketplace 連携を使う想定です
- 環境変数は Vercel Project Settings に設定してください
- LIFF の Endpoint URL には Vercel の本番URLを設定してください
- 詳細手順は `DEPLOYMENT.md` を参照してください

## 参考モック

- `ui-mock.html`
- `ui-mock.css`
## Guides

- [スケジュール管理 使い方](/Users/kazuhiro/Documents/score-manager/docs/schedule-guide.md)
- [スコア管理 使い方](/Users/kazuhiro/Documents/score-manager/docs/score-guide.md)
