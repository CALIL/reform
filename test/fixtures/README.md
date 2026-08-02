# テスト用のフィクスチャ

`google-form.json` は、README のサンプル Google フォームの HTML から
`action` と `data-params` を**生のまま**切り出したものです。

「生のまま」が重要です。Cloudflare の HTMLRewriter は属性値の文字参照を
解決せずに返すので、`data-params` には `&quot;` が残ったままになります。
フィクスチャも同じ状態で持っておかないと、テストが実際の入力とずれます。

## 取り直すとき

```bash
URL='https://docs.google.com/forms/d/e/1FAIpQLSe7t2OIId9cpX7mcYnOYnz7Z9K9AOlMhSV7OdY8Xfqg9YkNdw/viewform'

curl -s -H 'User-Agent: calil.jp/reform' "$URL" | python3 -c '
import json, re, sys
html = sys.stdin.read()
print(json.dumps({
    "url": "'"$URL"'",
    "action": re.search(r"<form[^>]*\saction=\"([^\"]*)\"", html).group(1),
    "rawDataParams": re.findall(r"<div[^>]*\sdata-params=\"([^\"]*)\"", html),
}, ensure_ascii=False, indent=2))
' > google-form.json
```

フォームの項目を変えると入力欄の ID も変わるので、
取り直したら `test/reform.test.js` の期待値も合わせてください。
