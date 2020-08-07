document.querySelector('form').addEventListener('submit', async (event) => {
    event.preventDefault();
    document.querySelector('form button').disabled = true;
    let url = document.querySelector('form input').value;
    document.querySelector('form').setAttribute('data-url', url);
    console.log(url)
    if (!url.match(/^https:\/\/docs\.google.com.*?(viewform|edit)/)) {
        alert('urlが正しくありません。GoogleフォームのURLを入れてください。')
        document.querySelector('form button').disabled = false;
        return;
    }
    url = url.replace('edit', 'viewform');
    url = 'https://asia-northeast1-calil-sandbox.cloudfunctions.net/reform?url=' + url;
    console.log(url)
    let percent = 10;
    let timer = setInterval(() => {
        document.querySelector('form progress').value = percent;
        percent += 1;
    }, 40);

    const result = await fetch(url).then((r) => r.json());
    console.log(result)

    clearInterval(timer);
    document.querySelector('form progress').value = 100;
    document.getElementById('result').innerHTML = `<ul>
    <li>PRE-FIL</li>
    <li class="active">POST</li>
    <li>DETAIL</li>
</ul>`;

   
    const table = document.createElement('table');
    table.className = 'active';
    // const tr = document.createElement('tr');
    // const th1 = document.createElement('th');
    // const th2 = document.createElement('th');
    // th1.innerHTML = 'id';
    // th2.innerHTML = 'label';
    // tr.appendChild(th1);
    // tr.appendChild(th2);
    // table.appendChild(tr);
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
        }
    });
    document.getElementById('result').appendChild(table);

    const createTextarea = (method, endpoint) => {
        const textarea = document.createElement('textarea');
        textarea.className = 'active';
        textarea.addEventListener('click', () => textarea.select());
    
        let inputs = [];
        result.comparison.map((item) => {
            for (key in item) {
                inputs.push(`    <label for="">${key}</label>
    <input id="" type="text" name="${item[key]}" placeholder="">`)
            }
        });
    
        textarea.value = `<form action="${result.action.replace('formResponse', endpoint)}" method="${method}">
${inputs.join('\n')}
<button type="submit" name="button">送信</button>
</form>`
        document.getElementById('result').appendChild(textarea);
    }

    createTextarea('GET', 'viewform');
    createTextarea('POST', 'formResponse');
    
    document.querySelector('form progress').value = 0;
    document.querySelector('form button').disabled = false;
});
