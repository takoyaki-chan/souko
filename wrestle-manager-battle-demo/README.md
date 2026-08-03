# Wrestle-Manager 無料バトルデモ

ブラウザで1試合を観戦できる公開用の静的サイトです。

このディレクトリは `takoyaki-chan/wrestle-manager` でビルドした公開成果物だけを置く場所です。製品版の全選手データ、セーブデータ、開発用ファイルは含めません。

## Cloudflare Pages

| 項目 | 値 |
| --- | --- |
| リポジトリ | `takoyaki-chan/souko` |
| ルートディレクトリ | `wrestle-manager-battle-demo` |
| 本番ブランチ | `main` |
| ビルドコマンド | `exit 0` |
| 出力ディレクトリ | `public` |

`public/_redirects` と `public/_headers` はCloudflare Pagesの設定として必ず含めます。

## 更新手順

製品版リポジトリで以下を実行してから、生成物だけをこのディレクトリの `public/` へ同期します。

```powershell
npm.cmd run test:demo
npm.cmd run demo:build
```

`public/` 以外に製品版のコード・データ・画像を追加しないでください。

## 販売リンク

`public/config.js` の `productLinks` にBOOTH、DLsite、FANZAのURLを設定します。空欄のリンクは画面に表示されません。
