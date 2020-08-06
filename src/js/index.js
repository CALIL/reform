document.querySelector('form').addEventListener('submit', async (event) => {
    event.preventDefault();
    let url = document.querySelector('form input').value;
    console.log(url)
    if (!url.match(/^https:\/\/docs.google.com.*?viewform/)) {
        alert('urlが正しくありません。GoogleフォームのURLを入れてください。')
        return;
    }
    url = 'https://asia-northeast1-calil-sandbox.cloudfunctions.net/reform?url=' + url;
    console.log(url)
    let percent = 10;
    let timer = setInterval(() => {
        document.getElementById('result').innerHTML = '<progress value="' + percent + '" max="100">' + percent + ' %</progress>';
        percent += 2;
    }, 100);
    const result = await fetch(url).then((r) => r.json());
    clearInterval(timer);
    console.log(result)
    const table = document.createElement('table');
    let inputs = [];
    result.comparison.map((item) => {
        for (key in item) {
            const tr = document.createElement('tr');
            const td1 = document.createElement('td');
            const td2 = document.createElement('td');
            td1.innerHTML = item[key];
            td2.innerHTML = key;
            tr.appendChild(td1);
            tr.appendChild(td2);
            table.appendChild(tr);
            inputs.push(`    <label for="">${key}</label>
<input id="" type="text" name="${item[key]}" placeholder="">`)
        }
    });
    document.getElementById('result').innerHTML = '';
    document.getElementById('result').appendChild(table);

    const textarea = document.createElement('textarea');
    textarea.addEventListener('click', () => textarea.select());
    textarea.value = `<form action="${result.action}">
${inputs.join('\n')}
<button type="submit" name="button">送信</button>
</form>`
    document.getElementById('result').appendChild(textarea);
});
