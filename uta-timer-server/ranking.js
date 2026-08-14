// ranking.js
// 蓄積したDBから常連ランキングを表示する簡易CLI。
// フェーズ4「常連ランキング機能」の土台。将来はここをAPI化してタイマー画面や
// 別のダッシュボードから叩けるようにする想定。
//
// 使い方:
//   node ranking.js                       -> 全プラットフォーム合算、発言数トップ10
//   node ranking.js twitch                -> Twitchのみ、発言数トップ10
//   node ranking.js youtube gifts         -> YouTubeのみ、ギフト数トップ10
//   node ranking.js all gifts 20          -> 全プラットフォーム、ギフト数トップ20

import 'dotenv/config';
import { getTopCommenters, getTopGifters } from './db.js';

const STREAMER_ID = process.env.STREAMER_ID || 'default';

const [, , platformArg, metricArg, limitArg] = process.argv;
const platform = platformArg || 'all';
const metric = metricArg || 'comments';
const limit = Number(limitArg) || 10;

const rows = metric === 'gifts'
  ? getTopGifters(STREAMER_ID, platform, limit)
  : getTopCommenters(STREAMER_ID, platform, limit);

console.log(`\n=== ${metric === 'gifts' ? 'ギフト数' : '発言数'} ランキング (${platform}) ===\n`);

if (rows.length === 0) {
  console.log('まだデータがありません。配信中にサーバーを起動して蓄積してください。');
} else {
  rows.forEach((r, i) => {
    const rank = String(i + 1).padStart(2, ' ');
    const name = (r.display_name || r.viewer_channel_id).padEnd(20, ' ');
    console.log(`${rank}. ${name}  発言:${r.comment_count}  ギフト:${r.gift_count}`);
  });
}
console.log('');
