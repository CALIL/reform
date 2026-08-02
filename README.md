# reform

https://reform.calil.dev/

Cloudflare Pagesでホスティング中

## Develop

```
npm install
npm start
```

http://localhost:8788/ で開きます。開発サーバは wrangler なので、
静的ファイルと API を同じところから配信します。

sass / pug / js は変更を監視して自動でビルドしますが、
ブラウザの自動リロードはないので手で更新してください。

## Sample Form

Google Form  
https://docs.google.com/forms/d/e/1FAIpQLSe7t2OIId9cpX7mcYnOYnz7Z9K9AOlMhSV7OdY8Xfqg9YkNdw/viewform  

Microsoft Forms  
https://forms.office.com/Pages/ResponsePage.aspx?id=7WfPbJrphEGmDEOVvJK_g9_p78ecuD9IpjJt1jxJ-TVUMEE5SENUSjI0UkI1VUlWNUZRVkdWQ0YwMi4u

## Deploy

コミットすると自動的に展開される

Cloudflare Pages  
https://reform.pages.dev/

### ビルドに使う Node.js のバージョン

リポジトリの `.node-version`（と `package.json` の `engines.node`）で固定しています。
Cloudflare Pages はこのファイルを読んで Node を切り替えます。

**Build Image は v3 を使ってください。** v1 は Node 12.18.0 が既定で、
ビルドに使う npm-run-all2 / cpx2 / sass などが動きません。
（設定 → ビルド → Production と Preview の両方で v3 を選択）

> Build Image v1 は 2026年9月15日に廃止されます。

依存を更新して Node の要求が上がったときは `.node-version` も合わせて上げてください。

## API

フォームの取得と解析は `functions/api/reform.ts`（Cloudflare Pages Functions）で動いています。

```
npm test
```

## Cloudflare Analytics

https://dash.cloudflare.com/9f2a842113dbb9618c3d37c24fa23af4/web-analytics/overview?siteTag~in=febe2aa8da7c43a78754bef02a144544

## License

The MIT License (MIT)

Copyright (c) 2019 CALIL Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
