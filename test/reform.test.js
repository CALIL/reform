// Node 標準のテストランナーを使う（外部依存なし）
//   npm test  →  node --test
//
// Cloudflare の HTMLRewriter は Node では動かないので、ここで確かめるのは
// フォームの中身を解釈する側の関数だけ。HTML から属性を拾えるかどうかは
// wrangler pages dev で実際のフォームを叩いて確認する（README を参照）。
//
// フィクスチャは実際の Google フォームの HTML から生のまま切り出したもの。
// test/fixtures/README.md に取得方法を書いてある。

'use strict'

const {test, describe} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Node 24 は TypeScript をそのまま読める（型注釈を落として実行する）
const {_internal} = require('../functions/api/reform.ts');

const {classify, getQueryString, decodeEntities, toEntry} = _internal;

const FIXTURE = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'fixtures', 'google-form.json'), 'utf8')
);

describe('classify', () => {
    test('Google フォームを見分ける', () => {
        assert.equal(classify(FIXTURE.url), 'google');
        assert.equal(classify('https://forms.gle/abcdef'), 'google');
    });

    test('Microsoft Forms を見分ける', () => {
        assert.equal(classify('https://forms.office.com/Pages/ResponsePage.aspx?id=x'), 'ms');
        assert.equal(classify('https://forms.cloud.microsoft/r/abcdef'), 'ms');
    });

    test('対象外の URL は null を返す', () => {
        assert.equal(classify(''), null);
        assert.equal(classify('https://example.com/'), null);
        assert.equal(classify('http://docs.google.com/forms/viewform'), null, 'http は通さない');
    });

    test('別ドメインに正規のURLを紛れ込ませても通さない', () => {
        // ここが唯一の入口なので、想定外の宛先を fetch しないことを確かめる
        for (const url of [
            'https://example.com/?x=https://forms.gle/abcdef',
            'https://example.com/#https://docs.google.com/forms/viewform',
            'https://docs.google.com.example.com/forms/viewform',
            'https://forms.office.com.example.com/r/abc'
        ]) {
            assert.equal(classify(url), null, `通してはいけない: ${url}`);
        }
    });
});

describe('decodeEntities', () => {
    test('属性値に残る文字参照を戻す', () => {
        assert.equal(decodeEntities('&quot;x&quot;'), '"x"');
        assert.equal(decodeEntities('a&amp;b'), 'a&b');
        assert.equal(decodeEntities('&lt;tag&gt;'), '<tag>');
        assert.equal(decodeEntities('&#39;'), "'");
        assert.equal(decodeEntities('&#x3042;'), 'あ');
    });

    test('二重に解決しない', () => {
        // &amp;quot; は「&quot;」という文字列であって、引用符ではない
        assert.equal(decodeEntities('&amp;quot;'), '&quot;');
    });

    test('知らない実体参照は触らない', () => {
        assert.equal(decodeEntities('&zzz;'), '&zzz;');
        assert.equal(decodeEntities('A&B'), 'A&B');
    });

    test('壊れた数値参照は触らない', () => {
        assert.equal(decodeEntities('&#0;'), '&#0;');
        assert.equal(decodeEntities('&#xD800;'), '&#xD800;', 'サロゲートは戻さない');
        assert.equal(decodeEntities('&#99999999;'), '&#99999999;');
    });

    test('& が無ければそのまま返す', () => {
        assert.equal(decodeEntities('ふつうの文字列'), 'ふつうの文字列');
    });
});

describe('getQueryString', () => {
    test('クエリを分解する', () => {
        assert.deepEqual(getQueryString('https://x.test/?a=1&b=2'), {a: '1', b: '2'});
    });

    test('パーセントエスケープを戻す', () => {
        assert.deepEqual(getQueryString('https://x.test/?q=%E6%9C%AC'), {q: '本'});
    });

    test('値に = が含まれていても切らない', () => {
        // base64 の padding などで起きる
        assert.deepEqual(getQueryString('https://x.test/?id=YWJj=='), {id: 'YWJj=='});
    });

    test('クエリが無ければ空を返す', () => {
        assert.deepEqual(getQueryString('https://x.test/'), {});
        assert.deepEqual(getQueryString('https://x.test/?'), {});
    });

    test('壊れたエスケープでも落ちない', () => {
        assert.deepEqual(getQueryString('https://x.test/?a=%zz'), {a: '%zz'});
    });
});

describe('toEntry（実データ）', () => {
    test('生の data-params から項目名と入力欄IDを取り出す', () => {
        const entries = FIXTURE.rawDataParams
            .map((raw) => toEntry(decodeEntities(raw)))
            .filter((entry) => entry !== null);

        assert.deepEqual(entries, [
            {'本のなまえ': 'entry.979612543'},
            {'ISBN': 'entry.1917292338'},
            {'学年': 'entry.2062138030'},
            {'名前': 'entry.1994445067'}
        ]);
    });

    test('デコードしないと読めない（移行時に踏んだ）', () => {
        // HTMLRewriter は属性値を生のまま返すので、そのままでは JSON にならない
        assert.equal(toEntry(FIXTURE.rawDataParams[0]), null);
    });

    test('入力欄以外の形は null を返す', () => {
        assert.equal(toEntry('%.@.[]'), null);
        assert.equal(toEntry('こわれた'), null);
        assert.equal(toEntry(''), null);
    });
});
