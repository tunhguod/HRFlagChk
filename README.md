# ハイパラフラグチェッカー

ハイパーラッシュ系機種のリール制御を確認するための Web ツールです。
停止したリール位置・滑りコマ数・押し順から、成立している可能性のあるボーナスフラグと小役を表示します。

**公開ページ：https://tunhguod.github.io/HRFlagChk/**

判定ロジックと画面は共通部分 [slot-flag-checker-core](https://github.com/tunhguod/slot-flag-checker-core) を使い、このリポジトリには機種定義だけを置いています。

## 使い方

1. 左のリールをドラッグ（またはリールを選択して ↑ / ↓ キー）して、停止した図柄の位置に合わせます。
2. 右のパネルで条件を選びます。
   | 項目 | 内容 |
   | --- | --- |
   | 滑りコマ数 | ボタンを押してから停止するまでに滑ったコマ数（0〜4） |
   | 設定 | 1〜6。フラグ合算の確率と各フラグの割合に反映されます |
   | リールの位置 | 表示中のリール位置を「リール停止時」と「ボタン押下時」のどちらとして扱うか |
   | 押し順 | 左1st / 中1st（リール画像と制御表が切り替わります） |
3. 下のパネルに判別結果が表示されます。
   - **フラグ (BB) / フラグ (RB)**：該当するフラグと、該当フラグ全体（BB・RB合算）に対する割合
   - **フラグ合算**：該当フラグの合成確率（1/65536 換算）
   - **小役**：その位置・滑りコマ数で停止し得る小役

画面はスマホ・タブレット・PCのどのサイズでもスクロールせずに全体が収まるよう、縦長／横長のレイアウトを自動で切り替えて拡大縮小します。

制御表の元データは [スプレッドシート](https://docs.google.com/spreadsheets/d/1UNeeJEg-8OYhitDBvvdec_t7KXVm53Dh3pOAyrQQS9M/edit?gid=157777121#gid=157777121) を参照してください。

## ファイル構成

```
.
├── index.html        判別ページ
├── core.js           コアの読み込み元（CORE_VERSION でバージョンを指定）
├── machine.js        機種定義（制御表・フラグの置数・色分けなど）
├── img/
│   ├── reel.png      リール画像（左1st用）
│   └── reel_c.png    リール画像（中1st用）
├── test.html         照合テスト
└── test/golden.json  正解データ（コア導入前の版で記録した全状態の判定結果）
```

## データの更新

制御表やフラグの置数を変更する場合は `machine.js` を編集します。書き方は [slot-flag-checker-core の README](https://github.com/tunhguod/slot-flag-checker-core#機種定義) を参照してください。
行数・列数が合っていない場合は、ページを開いたときにブラウザのコンソールへエラーが表示されます。

制御表を意図して変更した場合は、`test/golden.json` の該当箇所も更新してください。

## 手元で動かす

ES モジュールを使うため、`index.html` をファイルとして直接開いても動きません。簡易サーバーで配信してください。

```bash
py -m http.server 8000
```

その後 http://localhost:8000 を開きます。`test.html` を開くと、全状態の判定結果を正解データと照合します。

コアも手元で変更しながら確認する場合は、[slot-flag-checker-core の README](https://github.com/tunhguod/slot-flag-checker-core#手元での確認) の手順で、`?core=local` を付けて開きます。

## 公開ページの更新

`main` ブランチに push すると、1〜2分で GitHub Pages に反映されます。

- `core.js` / `machine.js` を変更したときは、`index.html` で読み込んでいる `?v=1` の数字を上げてください。ブラウザに残った古いファイルが新しいページと組み合わさるのを防ぎます。
- コアを更新するときは、`core.js` の `CORE_VERSION` を上げ、`test.html` が PASS になることを確認してから push してください。

## 不具合報告・お問い合わせ

[@doughnut_777](https://x.com/doughnut_777) までお願いします。
