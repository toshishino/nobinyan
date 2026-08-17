# CLAUDE.md

このファイルはClaude Codeがセッション開始時に自動で読み込む、プロジェクトの永続的なコンテキストです。詳細は都度貼り付けず、必要な時に該当ドキュメントを読みに行ってください。

## プロジェクト概要

配信支援ツール「のびニャン」（仮称、正式名未確定）。歌枠用の加算式カウントダウンタイマーと、Twitch/YouTubeのチャットイベント（初コメ・投げ銭・サブスク・サブスクギフト）を自動検知して時間を延長する中継サーバーで構成される。

対象ユーザーは配信者本人（作者）。将来的に他配信者への配布も視野に入れている。

## 詳細ドキュメント（必要な時に読むこと）

- `docs/SPEC.md` — 仕様書。タイマーのルール、システム構成、DB設計、開発フェーズの状態はここが正
- `uta-timer-server/README.md` — サーバーのセットアップ手順・環境変数・トラブルシューティング

開発タスク一覧は[GitHub Issues](https://github.com/toshishino/nobinyan/issues)で管理する（旧`docs/ISSUES.md`は移行済みのため削除）。Milestone 1〜4がフェーズに対応し、優先度未定のタスクは`backlog`ラベルを付与している。

**コードを変更する前に、関連する仕様が`docs/SPEC.md`と食い違っていないか確認すること。** 変更後、仕様が変わった場合は`docs/SPEC.md`も一緒に更新する。

## 構成

```
uta-timer-server/        … 中継サーバー(Node.js, ESM)
  ├─ server.js           … サーバー本体(Twitch/YouTube監視、HTTP/WebSocket、public/の静的配信)
  ├─ db.js                … SQLite(node:sqlite)。視聴者DBと設定の永続化
  ├─ public/
  │   ├─ uta-timer.html    … タイマー画面(ブラウザ/OBS用。http://localhost:8787/uta-timer.htmlで配信)
  │   └─ settings.html     … Web設定画面(http://localhost:8787/で配信)
  └─ ranking.js            … 常連ランキングCLI
docs/
  └─ SPEC.md
```

## 現在の状態（詳細はdocs/SPEC.md参照）

- **Twitchのみ運用中**。YouTube連携は実装済みだが設定画面で無効化がデフォルト
- 初コメ判定は「その配信で初めての発言」（セッション単位、生涯初コメントではない）
- ギフト加算対象（投げ銭/サブスク/サブスクギフト）は設定画面で個別にon/off可能
- 設定はDB(`app_settings`テーブル)に永続化され、`.env`はサーバー初回起動時の初期値としてのみ使う
- 実配信での動作検証はまだ実施していない

## 開発上の注意点

- **視聴者のID・表示名をDBに保存する仕組み**なので、他配信者への配布時はプライバシーへの配慮を忘れないこと
- DB層は標準の`node:sqlite`(Node.js 22.5+)を使用。ネイティブアドオン不要のため、pkgでの.exe化を見据えて`better-sqlite3`から移行済み
- YouTube再起動時の二重カウント防止のため、`pageToken`はDBに永続化してある。この仕組みを壊さないこと
- 初コメ判定用のセッション(`seenThisStream`)はメモリ上のみ。DBの`viewers`テーブルは常連ランキング用の生涯累計データであり、初コメ判定には使わない

## コーディングスタイル

- コメント・ログメッセージは日本語
- Node.js標準機能を優先し、依存パッケージは最小限に留める（現状: `dotenv`, `tmi.js`, `ws`のみ）
