# 歌枠タイムカウンター / 開発タスク一覧

GitHub Issuesにそのまま登録できる粒度でまとめています。
`---` で1 Issue分の区切り。タイトル・本文・ラベル案の順に記載。

---

## Milestone 1: Twitch実運用

### Issue: Twitch匿名接続でのイベント実地検証
**Label:** `phase-1`, `verification`

実配信で以下が正しく検知・タイマーに反映されるか確認する。
- [ ] セッション単位の初コメ検知（+5分）。`first-msg`タグ（Twitch公式の生涯初コメント）は使わず、サーバー起動後のセッションSetで判定する
- [ ] `cheer`（Bits投げ銭）検知（+10分）
- [ ] `subgift`（単発サブギフト）検知（+10分）
- [ ] `submysterygift`（まとめ贈り）検知（個数分 ×10分）
- [ ] WebSocket経由でタイマー画面に反映される（`?ws=ws://localhost:8787`）

---

### Issue: 匿名接続でUSERNOTICE系イベントが届かない場合の対応
**Label:** `phase-1`, `bug-candidate`

上記検証で `subgift` / `submysterygift` が匿名IRC接続で届かなかった場合の対応。
- [ ] Twitch Botアカウントを作成
- [ ] OAuthトークン（スコープ不要、ログインのみ）を取得
- [ ] `tmi.js` の接続設定を匿名 → 認証ありに変更
- [ ] `.env` に `TWITCH_BOT_USERNAME` / `TWITCH_OAUTH_TOKEN` を追加

---

### Issue: OBS表示モードの実機確認
**Label:** `phase-1`, `verification`

- [ ] `?obs=1` での大画面表示をOBSのウィンドウ/ディスプレイキャプチャで確認
- [ ] 配信画面上でのレイアウト・視認性の調整（フォントサイズ、余白など）

---

## Milestone 2: YouTube実運用

### Issue: YouTube Data API v3のセットアップ
**Label:** `phase-2`, `setup`

- [ ] Google Cloud ConsoleでプロジェクトSakura作成
- [ ] YouTube Data API v3 有効化
- [ ] APIキー発行、`.env` の `YOUTUBE_API_KEY` に設定
- [ ] クォータ上限の確認（長時間配信での消費量を試算）

---

### Issue: 配信ごとのVIDEO_ID更新フローの検証
**Label:** `phase-2`, `verification`

- [ ] 配信開始時に動画IDを `.env` の `YOUTUBE_VIDEO_ID` に設定してサーバー起動する運用を実際にやってみる
- [ ] 手間であれば「配信URLを貼るだけで自動取得する」仕組みの検討（`liveBroadcasts.list` + OAuth化）

---

### Issue: YouTube初コメ判定（セッション単位）の実配信テスト
**Label:** `phase-2`, `verification`

- [ ] 実際のコメントで、初めて発言した視聴者が正しく「初コメ」として+5分されるか確認
- [ ] 2回目以降の発言で加算されないことを確認
- [ ] 常連さんでも、その配信での最初の発言では初コメ扱いになることの確認（仕様通りの挙動）

---

### Issue: スパチャ・スーパーステッカー・メンバーシップギフト検知の実配信テスト
**Label:** `phase-2`, `verification`

- [ ] スーパーチャット → +10分 が反映されるか
- [ ] スーパーステッカー → +10分 が反映されるか
- [ ] メンバーシップギフト → 個数分 ×10分 が反映されるか

---

### Issue: YouTube再起動時の重複加算防止の動作確認
**Label:** `phase-2`, `verification`

- [ ] 配信中にサーバーを再起動し、`pageToken` がDBから正しく復元されるか確認
- [ ] 再起動前後でスパチャ等が二重加算されないことを確認

---

## Milestone 3: 運用の安定化

### Issue: エラーハンドリング・再接続の堅牢化
**Label:** `phase-3`, `reliability`

- [ ] Twitch/YouTube接続が切れた際の自動再接続の動作確認
- [ ] タイマー画面側WebSocket再接続（5秒間隔）の動作確認
- [ ] ネットワーク瞬断時のログ出力の見直し

---

### Issue: better-sqlite3のネイティブモジュール環境差異対応
**Label:** `phase-3`, `infra`

- [ ] Codespaces環境での動作確認
- [ ] Oracle Cloud環境に移行する場合の再ビルド手順をREADMEに明記
- [ ] （Oracle Cloudのポート到達問題が解決した場合）Oracle環境での動作確認

---

### Issue: グレースフルシャットダウンの検証
**Label:** `phase-3`, `reliability`

- [ ] `Ctrl+C` (SIGINT) でDB/WebSocketが正しくクローズされるか確認
- [ ] WALファイルが異常終了で壊れないか確認

---

## Milestone 4: 常連ランキング機能

### Issue: ランキングのWeb UI化
**Label:** `phase-4`, `feature`

- [ ] `ranking.js` のCLI出力をブラウザで見られるUIにする
- [ ] タイマー画面 or 別ページとして実装するか検討

---

### Issue: 配信回（セッション）単位のランキング集計に対応
**Label:** `phase-4`, `feature`, `db-schema`

現状は生涯累計のみのため、「今回の配信での初コメ一覧」「今月の常連ランキング」等ができない。
- [ ] `streams` テーブル追加（配信回ID・開始日時・終了日時）
- [ ] コメント/ギフト記録に `stream_id` を紐付け
- [ ] 期間指定でのランキング集計クエリ追加

---

### Issue: 視聴者データの扱いに関する方針整備（配布前提）
**Label:** `phase-4`, `privacy`, `distribution`

他配信者への配布を見据え、視聴者の発言履歴をローカルDBに保存する仕組みについて、利用者向けの説明を用意する。
- [ ] READMEに「視聴者のID・ニックネームをローカル保存している」旨を明記
- [ ] 必要であれば「特定視聴者のデータを削除する」CLIコマンドの追加
- [ ] 配布時のプライバシーに関する簡単なポリシー文面のドラフト作成

---

## Backlog（優先度未定）

### Issue: 複数配信者への配布を想定したセットアップドキュメント整備
**Label:** `backlog`, `distribution`

- [ ] `STREAMER_ID` を使った複数配信者運用の手順書
- [ ] `.env` テンプレートの配布用簡素化

### Issue: ギフト種別ごとの加算時間カスタマイズ
**Label:** `backlog`, `feature`

- [ ] スパチャの金額に応じて加算時間を変える等、加算ルールの柔軟化を検討（現状は一律+10分）
