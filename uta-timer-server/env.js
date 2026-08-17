// env.js
// .env読み込み専用モジュール。db.js等が起動時にprocess.envを参照するより先に
// 確実に実行される必要があるため、server.jsの一番最初でside-effect importする。
//
// dotenv.config()にpathを指定せず呼ぶと、既定ではprocess.cwd()基準で.envを探す。
// これはpkgで.exe化した場合、ダブルクリック起動時などにcwdが実行ファイルの
// フォルダと一致するとは限らないため、db.jsのDB_PATHと同じパターンで
// 実行ファイル(pkgの場合はexe自身)のあるフォルダを明示的に基準にする。

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// esbuildでCJSにバンドルするとimport.meta.urlが使えなくなる(空になる)ため、
// バンドル後に実体を持つCJSの__filenameがあればそちらを優先する。
const __dirname = typeof __filename !== 'undefined'
  ? path.dirname(__filename)
  : path.dirname(fileURLToPath(import.meta.url));
const baseDir = process.pkg ? path.dirname(process.execPath) : __dirname;
const envPath = path.join(baseDir, '.env');

dotenv.config({ path: envPath });
