exports.reform = async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, HEAD');
    const url = req.query.url
    if (!url.match(/^https:\/\/docs.google.com.*?viewform/)) {
        res.status(500).send('URLが正しくありません。').end();
        return;
    }
    const data = await main(url)
    res.send(data);
};

import fetch from 'node-fetch';
const jsdom = require('jsdom')

const { JSDOM } = jsdom;

const main = async (url: string) => {

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
    console.log(await main('https://docs.google.com/forms/d/e/1FAIpQLSfNzaEDWldsbWqS5DQOK2sZCxGbXd6dwLqG5---K-vaBZE2Zw/viewform'))
})()