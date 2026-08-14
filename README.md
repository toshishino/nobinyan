# のびニャン（仮称）

配信支援ツール一式。歌枠用のカウントダウンタイマーと、Twitch/YouTubeのチャットイベント（初コメ・投げ銭・サブスク・サブスクギフト）を自動検知して時間を延長する中継サーバーで構成されています。

## 構成

```
uta-timer.html          … タイマー画面(ブラウザで開く。OBSでキャプチャして配信に載せる)
uta-timer-server/       … 中継サーバー(Twitch/YouTube監視、Web設定画面、視聴者DB)
  ├─ server.js          … サーバー本体
  ├─ db.js              … SQLite(視聴者DB・設定の永続化)
  ├─ settings.html      … Web設定画面
  ├─ ranking.js          … 常連ランキング表示CLI
  └─ README.md          … サーバーのセットアップ・使い方詳細
docs/                   … 仕様書・タスク一覧
  ├─ SPEC.md            … 仕様書(タイマールール・システム構成・DB設計など)
  └─ ISSUES.md          … 開発タスク一覧(フェーズ1〜4)
```

## クイックスタート(GitHub Codespaces推奨)

1. 「Code」→「Create codespace on main」でCodespaceを起動
   （`.devcontainer`の設定により、起動時に自動で依存パッケージがインストールされます）
2. ターミナルで以下を実行

   ```bash
   cd uta-timer-server
   cp .env.example .env
   npm start
   ```
3. Codespacesの「PORTS」タブで8787番のVisibilityを **Public** に変更し、転送用URLをコピー
4. コピーしたURLをブラウザで開く → **設定画面**。Twitchチャンネル名などを入力して保存
5. `uta-timer.html` を `?ws=wss://<転送用URL>` を付けて開く → **タイマー画面**（OBSでキャプチャ）

詳しい設定項目・トラブルシューティングは [`uta-timer-server/README.md`](uta-timer-server/README.md) を参照してください。

## ドキュメント

- [仕様書 (docs/SPEC.md)](docs/SPEC.md) — タイマーのルール、システム構成、DB設計、開発フェーズ
- [タスク一覧 (docs/ISSUES.md)](docs/ISSUES.md) — フェーズ1〜4の詳細タスク

## 現在の状態

- Twitchのみ運用中（YouTube連携は実装済み・設定画面から有効化可能）
- 実配信での動作検証は未実施
