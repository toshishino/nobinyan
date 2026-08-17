// db.js
// 視聴者(コメントした人)を streamer_id + platform + viewer_channel_id 単位で蓄積するDB層。
//
// 注意: 「初コメ」の判定(タイマー加算のトリガー)には使わない。
// 初コメは「その配信で初めて発言したか」で判定するため、server.js側でセッション単位の
// メモリ管理(Set)を使っている。このDBはあくまで生涯累計データであり、
// フェーズ4の常連ランキング機能のための記録用。
//
// 将来、他配信者に配布することを見据えて streamer_id を必ず持たせる(マルチテナント前提)。

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// esbuildでCJSにバンドルするとimport.meta.urlが使えなくなる(空になる)ため、
// バンドル後に実体を持つCJSの__filenameがあればそちらを優先する。
const __dirname = typeof __filename !== 'undefined'
  ? path.dirname(__filename)
  : path.dirname(fileURLToPath(import.meta.url));
// pkgで.exe化した場合、__dirnameは読み取り専用の仮想スナップショット内を指すため、
// DBの書き込み先としては使えない。その場合は実行ファイル自身のあるフォルダを使う。
const baseDir = process.pkg ? path.dirname(process.execPath) : __dirname;
const DB_PATH = process.env.DB_PATH || path.join(baseDir, 'viewers.db');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS viewers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    streamer_id TEXT NOT NULL,
    platform TEXT NOT NULL,               -- 'twitch' | 'youtube'
    viewer_channel_id TEXT NOT NULL,      -- プラットフォーム側のユーザーID
    display_name TEXT,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    comment_count INTEGER NOT NULL DEFAULT 0,
    gift_count INTEGER NOT NULL DEFAULT 0,     -- サブギフト/投げ銭の累計回数(将来の常連ランキング用)
    UNIQUE(streamer_id, platform, viewer_channel_id)
  );

  CREATE INDEX IF NOT EXISTS idx_viewers_lookup
    ON viewers(streamer_id, platform, viewer_channel_id);
`);

const selectStmt = db.prepare(`
  SELECT * FROM viewers WHERE streamer_id = ? AND platform = ? AND viewer_channel_id = ?
`);

const insertStmt = db.prepare(`
  INSERT INTO viewers (streamer_id, platform, viewer_channel_id, display_name, first_seen_at, last_seen_at, comment_count)
  VALUES (?, ?, ?, ?, ?, ?, 1)
`);

const touchStmt = db.prepare(`
  UPDATE viewers
  SET last_seen_at = ?, comment_count = comment_count + 1, display_name = ?
  WHERE streamer_id = ? AND platform = ? AND viewer_channel_id = ?
`);

const addGiftStmt = db.prepare(`
  UPDATE viewers
  SET gift_count = gift_count + ?, last_seen_at = ?
  WHERE streamer_id = ? AND platform = ? AND viewer_channel_id = ?
`);

const topCommentersStmt = db.prepare(`
  SELECT display_name, viewer_channel_id, comment_count, gift_count, first_seen_at, last_seen_at
  FROM viewers
  WHERE streamer_id = ? AND platform = ?
  ORDER BY comment_count DESC
  LIMIT ?
`);

const topGiftersStmt = db.prepare(`
  SELECT display_name, viewer_channel_id, comment_count, gift_count, first_seen_at, last_seen_at
  FROM viewers
  WHERE streamer_id = ? AND (? = 'all' OR platform = ?)
  ORDER BY gift_count DESC
  LIMIT ?
`);

// --- YouTube ポーリング状態の永続化 ---
// サーバー再起動時に pageToken をメモリで失うと、直近チャットを再取得してしまい
// スパチャ/ギフトを二重カウントする恐れがある。videoIdごとに最後の位置を覚えておく。
db.exec(`
  CREATE TABLE IF NOT EXISTS youtube_state (
    streamer_id TEXT NOT NULL,
    video_id TEXT NOT NULL,
    page_token TEXT,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (streamer_id, video_id)
  );
`);

const getYtStateStmt = db.prepare(`
  SELECT page_token FROM youtube_state WHERE streamer_id = ? AND video_id = ?
`);
const upsertYtStateStmt = db.prepare(`
  INSERT INTO youtube_state (streamer_id, video_id, page_token, updated_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(streamer_id, video_id) DO UPDATE SET page_token = excluded.page_token, updated_at = excluded.updated_at
`);

export function getYoutubePageToken(streamerId, videoId) {
  const row = getYtStateStmt.get(streamerId, videoId);
  return row?.page_token || null;
}

export function saveYoutubePageToken(streamerId, videoId, pageToken) {
  upsertYtStateStmt.run(streamerId, videoId, pageToken, new Date().toISOString());
}

// --- ユーザーが設定画面から変更できる項目の永続化 ---
// Twitchチャンネル名やギフト種別のon/offなどを、.envの手動編集なしで
// ブラウザから変更・保存できるようにするための汎用キーバリューテーブル。
db.exec(`
  CREATE TABLE IF NOT EXISTS app_settings (
    streamer_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    PRIMARY KEY (streamer_id, key)
  );
`);

const getSettingStmt = db.prepare(`
  SELECT value FROM app_settings WHERE streamer_id = ? AND key = ?
`);
const setSettingStmt = db.prepare(`
  INSERT INTO app_settings (streamer_id, key, value) VALUES (?, ?, ?)
  ON CONFLICT(streamer_id, key) DO UPDATE SET value = excluded.value
`);

export function getSetting(streamerId, key, fallback = null) {
  const row = getSettingStmt.get(streamerId, key);
  return row ? row.value : fallback;
}

export function setSetting(streamerId, key, value) {
  setSettingStmt.run(streamerId, key, String(value));
}

/**
 * コメントを記録する。既存視聴者なら発言回数を+1、新規なら登録する。
 * 戻り値: { isFirstTime: boolean, commentCount: number }
 */
export function recordComment(streamerId, platform, viewerChannelId, displayName) {
  const now = new Date().toISOString();
  const existing = selectStmt.get(streamerId, platform, viewerChannelId);

  if (!existing) {
    insertStmt.run(streamerId, platform, viewerChannelId, displayName, now, now);
    return { isFirstTime: true, commentCount: 1 };
  }

  touchStmt.run(now, displayName, streamerId, platform, viewerChannelId);
  return { isFirstTime: false, commentCount: existing.comment_count + 1 };
}

/**
 * 投げ銭/サブギフトの回数を記録する(常連ランキング用の付随データ)。
 * 視聴者がまだ登録されていない場合は先にコメントとして登録してから加算する。
 */
export function recordGift(streamerId, platform, viewerChannelId, displayName, count = 1) {
  const existing = selectStmt.get(streamerId, platform, viewerChannelId);
  if (!existing) {
    recordComment(streamerId, platform, viewerChannelId, displayName);
  }
  addGiftStmt.run(count, new Date().toISOString(), streamerId, platform, viewerChannelId);
}

/** 発言数ランキング(フェーズ4: 常連ランキング用) */
export function getTopCommenters(streamerId, platform = 'all', limit = 10) {
  if (platform === 'all') {
    return db.prepare(`
      SELECT display_name, platform, viewer_channel_id, comment_count, gift_count
      FROM viewers WHERE streamer_id = ?
      ORDER BY comment_count DESC LIMIT ?
    `).all(streamerId, limit);
  }
  return topCommentersStmt.all(streamerId, platform, limit);
}

/** ギフト数ランキング(フェーズ4: 常連ランキング用) */
export function getTopGifters(streamerId, platform = 'all', limit = 10) {
  return topGiftersStmt.all(streamerId, platform, platform, limit);
}

export default db;
