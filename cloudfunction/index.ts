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
    // res.send('Hello World!');
};

const puppeteer = require('puppeteer') 

const main = async (url: string) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'networkidle0' });
    const action = await page.evaluate(() => {
        const form = document.querySelector('form')
        if (form !== null) return form.action
    })

    const inputs = await page.evaluate(() => {
        const nodes: NodeListOf<HTMLInputElement> = document.querySelectorAll('form input')
        return Array.from(nodes).map(input => input.name).filter((input) => input.match(/^entry/))
    })

    const labels = await page.evaluate(() => {
        const nodes: NodeListOf<HTMLInputElement> = document.querySelectorAll('form .exportItemTitle')
        return Array.from(nodes).map(label => label.innerText.replace(/ \*$/, ''))
    })

    const params = await page.evaluate(() => {
        const nodes: NodeListOf<HTMLInputElement> = document.querySelectorAll('div[data-params]')
        return Array.from(nodes).map(node => node.getAttribute('data-params'))
    })

    const data = {
        action: action,
        labels: labels,
        inputs: inputs,
        params: params
    }
    await browser.close();
    return data
}
