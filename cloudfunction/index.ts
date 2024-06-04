export const reform = async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, HEAD');
    const url = req.query.url
    if (url.match(/^https:\/\/docs.google.com.*?viewform|https:\/\/forms\.gle\/.*?/)) {
        const data = await parseGoogleForm(url)
        res.send(data);
    } else if (url.match(/^https:\/\/forms\.office\.com\//)) {
        const data = await parseMSForm(url)
        res.send(data);
    } else {
        res.status(500).send('URLが正しくありません。').end();
        return;
    }
};

import { JSDOM } from 'jsdom';
function getQueryString(url: string) {
    var params = {}
    url.split('?')[1].split('&').map(function(param) {
        var pairs = param.split('=');
        params[pairs[0]] = decodeURIComponent(pairs[1]);
    });
    return params;    
}
const parseMSForm = async (url: string) => {
    let params = getQueryString(url)
    // 短縮URLの場合
    if (typeof params['id']===undefined) {
        const res = await fetch(url, { method: 'HEAD' });
        params = getQueryString(res.url);
    }
    const fromDataUrl = `https://forms.office.com/handlers/ResponsePageStartup.ashx?id=${params['id']}`
    const res = await fetch(fromDataUrl)
    const json:any = await res.json();
    const comparison:any = [{'MSFormsId': params['id']}]
    json.data.form.questions.map((question) => {
        // if (question.type === 'Question.TextField') {
            const result = {}
            const title = question.type === 'Question.Choice' ? question.title + ' (選択肢)' : question.title
            result[title] = question.id
            comparison.push(result)
        // }
    })
    const data = {
        action: `https://forms.office.com/Pages/ResponsePage.aspx`,
        params: params,
        comparison: comparison
    }
    return data
}

const parseGoogleForm = async (url: string) => {

    const res = await fetch(url);
    const html = await res.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const form = document.querySelector('form')
    const action = form.action

    const paramNodes: NodeListOf<HTMLInputElement> = document.querySelectorAll('div[data-params]')
    const params = Array.from(paramNodes).map(node => node.getAttribute('data-params'))

    const comparison = params.map((param) => {
        param = JSON.parse(param.replace('%.@.', '['))
        const key = param[0][1]
        const value = 'entry.' + param[0][4][0][0]
        let result = {}
        result[key] = value
        return result
    })

    const data = {
        action: action,
        params: params,
        comparison: comparison
    }
    return data
}

(async () => {
    console.log(await parseGoogleForm('https://docs.google.com/forms/d/e/1FAIpQLSfNzaEDWldsbWqS5DQOK2sZCxGbXd6dwLqG5---K-vaBZE2Zw/viewform'))
    console.log(await parseMSForm('https://forms.office.com/Pages/ResponsePage.aspx?id=7WfPbJrphEGmDEOVvJK_g7O-ItJsl5VOqIc2WNyhCw1UOUcwMlVDNEJUVEZXTTVaNlJRWjBWWDJFMS4u'))
})()