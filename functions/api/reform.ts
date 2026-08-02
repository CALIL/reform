/**
 * フォーム解析 API（Cloudflare Pages Functions）
 *
 *   GET /api/reform?url=<フォームのURL>
 *
 * Google フォーム / Microsoft Forms を取得して、各項目に対応する
 * 入力欄の ID を返す。フロントエンド（src/js/index.js）から呼ぶ。
 *
 * HTML の解析には Cloudflare 標準の HTMLRewriter を使う。
 * 拾うのは属性2種類だけなので DOM を組み立てる必要がなく、依存はゼロ。
 */

const USER_AGENT = 'calil.jp/reform';

// 外部への fetch はこの API の入口だけなので、宛先は先頭から照合して絞る
const GOOGLE_FORM = /^https:\/\/docs\.google\.com\/.*viewform/;
const GOOGLE_SHORT = /^https:\/\/forms\.gle\//;
const MS_FORM = /^https:\/\/forms\.(?:office\.com|cloud\.microsoft)\//;

// 取得先が応答しないときに握ったままにしない
const FETCH_TIMEOUT = 20000;

const CORS = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, HEAD'
};

type Comparison = Record<string, string>;

interface Parsed {
    action: string;
    params: unknown;
    comparison: Comparison[];
}

class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

/** クエリ文字列を素朴に分解する。値に = が含まれていても壊さない */
function getQueryString(url: string): Record<string, string> {
    const params: Record<string, string> = {};
    const query = url.split('?')[1];
    if (!query) return params;

    for (const pair of query.split('&')) {
        if (!pair) continue;
        const sep = pair.indexOf('=');
        const key = sep === -1 ? pair : pair.slice(0, sep);
        const value = sep === -1 ? '' : pair.slice(sep + 1);
        try {
            params[key] = decodeURIComponent(value);
        } catch {
            // 壊れたパーセントエスケープはそのまま渡す
            params[key] = value;
        }
    }
    return params;
}

const NAMED_ENTITY: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: '\u00a0'
};

function fromCodePoint(code: number): string | null {
    // 範囲外とサロゲートは戻さない
    if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return null;
    if (code >= 0xd800 && code <= 0xdfff) return null;
    return String.fromCodePoint(code);
}

/**
 * 属性値の文字参照を戻す。
 *
 * HTMLRewriter は属性値を生のまま返すので `&quot;` などが残る。
 * jsdom は解決済みの値を返していたので、ここで揃えておかないと
 * data-params を JSON として読めない。
 * 一度の走査で置換するので `&amp;quot;` が二重に解決されることはない。
 */
function decodeEntities(value: string): string {
    if (!value.includes('&')) return value;
    return value.replace(
        /&(?:#(\d+)|#[xX]([\da-fA-F]+)|([a-zA-Z]+));/g,
        (whole, dec, hex, name) => {
            if (dec !== undefined) return fromCodePoint(Number(dec)) ?? whole;
            if (hex !== undefined) return fromCodePoint(parseInt(hex, 16)) ?? whole;
            // 知らない実体参照は触らない
            return NAMED_ENTITY[name] ?? whole;
        }
    );
}

function fetchForm(url: string, init: RequestInit = {}): Promise<Response> {
    return fetch(url, {
        ...init,
        headers: {'user-agent': USER_AGENT},
        signal: AbortSignal.timeout(FETCH_TIMEOUT)
    });
}

/** data-params の中身から「項目名 → entry.XXX」を取り出す */
function toEntry(param: string): Comparison | null {
    try {
        const parsed = JSON.parse(param.replace('%.@.', '['));
        return {[parsed[0][1]]: 'entry.' + parsed[0][4][0][0]};
    } catch {
        // 入力欄以外の data-params は形が違うので無視する
        return null;
    }
}

async function parseGoogleForm(url: string): Promise<Parsed> {
    const res = await fetchForm(url);
    if (!res.ok) {
        throw new ApiError(502, `フォームを取得できませんでした（HTTP ${res.status}）`);
    }

    let action: string | null = null;
    const params: string[] = [];

    const scanned = new HTMLRewriter()
        .on('form', {
            element(el) {
                const attr = el.getAttribute('action');
                if (action === null && attr !== null) action = decodeEntities(attr);
            }
        })
        .on('div[data-params]', {
            element(el) {
                const param = el.getAttribute('data-params');
                if (param !== null) params.push(decodeEntities(param));
            }
        })
        .transform(res);

    // 本文を最後まで流さないとハンドラが呼ばれない
    await scanned.arrayBuffer();

    if (action === null) {
        throw new ApiError(422, 'フォームが見つかりませんでした。');
    }

    return {
        // action 属性が相対パスでも絶対 URL にして返す
        action: new URL(action, res.url).toString(),
        params,
        comparison: params
            .map(toEntry)
            .filter((entry): entry is Comparison => entry !== null)
    };
}

async function parseMsForm(url: string): Promise<Parsed> {
    let params = getQueryString(url);

    // 短縮 URL は転送先から id を拾う
    if (params['id'] === undefined) {
        const redirected = await fetchForm(url, {method: 'HEAD'});
        params = getQueryString(redirected.url);
    }
    if (params['id'] === undefined) {
        throw new ApiError(422, 'フォームの id が見つかりませんでした。');
    }

    const res = await fetchForm(
        'https://forms.office.com/handlers/ResponsePageStartup.ashx'
        + `?id=${encodeURIComponent(params['id'])}`
    );
    if (!res.ok) {
        throw new ApiError(502, `フォームを取得できませんでした（HTTP ${res.status}）`);
    }
    const body = (await res.json()) as any;

    const comparison: Comparison[] = [{MSFormsId: params['id']}];
    for (const question of body?.data?.form?.questions ?? []) {
        const title = question.type === 'Question.Choice'
            ? `${question.title} (選択肢)`
            : question.title;
        comparison.push({[title]: question.id});
    }

    return {
        action: 'https://forms.office.com/Pages/ResponsePage.aspx',
        params,
        comparison
    };
}

function respond(status: number, body: unknown, contentType: string): Response {
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    return new Response(payload, {
        status,
        headers: {...CORS, 'content-type': contentType}
    });
}

/** どちらのフォームとして扱うかを決める */
function classify(url: string): 'google' | 'ms' | null {
    if (GOOGLE_FORM.test(url) || GOOGLE_SHORT.test(url)) return 'google';
    if (MS_FORM.test(url)) return 'ms';
    return null;
}

export const onRequestGet = async (context: {request: Request}): Promise<Response> => {
    const url = (new URL(context.request.url).searchParams.get('url') ?? '').trim();

    try {
        const kind = classify(url);
        if (kind === null) {
            throw new ApiError(400, 'URLが正しくありません。');
        }
        const data = kind === 'google'
            ? await parseGoogleForm(url)
            : await parseMsForm(url);
        return respond(200, data, 'application/json; charset=utf-8');
    } catch (error) {
        const known = error instanceof ApiError
            ? error
            : new ApiError(500, '解析に失敗しました。');
        if (!(error instanceof ApiError)) {
            console.error(`${url}: ${error instanceof Error ? error.message : error}`);
        }
        return respond(known.status, known.message, 'text/plain; charset=utf-8');
    }
};

// テストから内部の関数を触れるようにする。
// Cloudflare がルーティングに使うのは onRequestGet だけなので本番には影響しない。
export const _internal = {classify, getQueryString, decodeEntities, toEntry};
