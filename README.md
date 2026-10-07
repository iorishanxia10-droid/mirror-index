# MIRROR INDEX

Limbus Company の鏡ダンジョン用 E.G.Oギフト逆引き・合成プランナーです。

## 使い方

`start.bat` をダブルクリックするだけで起動します。インストールやサーバーは不要です。

- カテゴリー、ランク、入手方法、日本語名・英語名で絞り込み
- E.G.Oギフトを複数選択
- 全ギフトの日本語名と日本語効果を表示
- 限定テーマパックをまとめて表示
- 固定合成の直接レシピと、再帰展開した基礎素材を表示
- ダーク／ライトモードを端末に保存
- 単騎人格のキーワード・スキル属性から、他11名のおすすめサポートパッシブを表示

## データ

- [Limbus Company Wiki](https://limbuscompany.wiki.gg/wiki/List_of_E.G.O_Gifts)
- [Limbus Company Tools](https://limbus.eldritchtools.com/gifts)
- [Eldritch Tools 公開データ](https://github.com/eldritchtools/limbus-shared-library)

2026-10-07 に取得した非公式データを使用しています。ゲーム更新後は内容が古くなる可能性があります。画像は Eldritch Tools の WebP アセットを表示します。

## ゲーム更新後

`npm run update:gifts` でギフト・合成・パック（Eldritch Tools）と日本語名・効果（LimbusCompany攻略 Wiki）を取り直し、`npm run update:supports` で人格・サポートパッシブを取り直します。Wiki 未掲載のものは前回の日本語、無ければ英語のまま入ります。更新後は `node test-data.js` で欠損や参照切れを検査できます。

## Android アプリ

`android/` は `public/tool` を同梱して WebView で表示するだけのアプリです（ギフト画像以外はオフラインで動きます）。

1. `node scripts/sync-public.mjs`（データ更新後に必ず実行）
2. `android` で `JAVA_HOME=E:\jdk21\jdk-21.0.12.1+1` にして `gradlew.bat assembleDebug`
3. `android/app/build/outputs/apk/debug/app-debug.apk` をインストール（`adb install -r`）
