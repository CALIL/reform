function getQueryString() {
    var params = {}
    location.search.substr(1).split('&').map(function(param) {
        var pairs = param.split('=');
        params[pairs[0]] = decodeURIComponent(pairs[1]);
    });
    return params;    
}

const reform = async (url) => {
    document.querySelector('form button').disabled = true;

    url = url.replace('edit', 'viewform').trim();
    history.pushState(null,null,location.pathname+'?url='+encodeURIComponent(url));
    url = 'https://asia-northeast1-libmuteki2.cloudfunctions.net/reform?url=' + encodeURIComponent(url);

    let percent = 10;
    let timer = setInterval(() => {
        document.querySelector('form progress').value = percent;
        percent += 0.1;
    }, 10);

    const result = await fetch(url).then((r) => r.json()).catch((e) => {
        console.log(e);
        document.querySelector('form button').disabled = false;
        clearInterval(timer);
        alert('Error. Sorry.')
        document.querySelector('form progress').value = 0;
    });

    if (!result) return;

    clearInterval(timer);
    document.querySelector('form progress').value = 100;
    document.getElementById('result').innerHTML = '';

   
    const table = document.createElement('table');
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

    const submitText = (location.pathname === '/en/') ? 'submit' : '送信';
    const createTextarea = (method, endpoint) => {
        const textarea = document.createElement('textarea');
        // textarea.addEventListener('focus', () => textarea.select());
    
        let inputs = [];
        result.comparison.map((item) => {
            for (key in item) {
                // MS Formの場合は、IDをvalueに入れる
                if (key === 'MSFormId') {
                    inputs.push(`    <label for="${item[key]}">${key}</label>
    <input id="${item[key]}" type="text" name="${item[key]}" value="${item[key]}">`)
                } else {
                    inputs.push(`    <label for="${item[key]}">${key}</label>
    <input id="${item[key]}" type="text" name="${item[key]}">`)
                }
            }
        });
    
        textarea.value = `<form action="${result.action.replace('formResponse', endpoint)}" method="${method}">
${inputs.join('\n')}
    <button>${submitText}</button>
</form>`
        return textarea;
    }
    const textarea1 = createTextarea('GET', 'viewform');
    textarea1.className = 'active';
    const textarea2 = createTextarea('POST', 'formResponse');

    const ul = document.createElement('ul')
    const li1 = document.createElement('li')
    const li2 = document.createElement('li')
    const li3 = document.createElement('li')
    li1.innerHTML = 'PRE-FILL';
    li1.className = 'tab1 active';
    li2.innerHTML = 'POST';
    li2.className = 'tab2';
    li3.innerHTML = 'DETAIL';
    li3.className = 'tab3';
    const clickTab = (event) => {
        li1.classList.remove('active');
        li2.classList.remove('active');
        li3.classList.remove('active');
        console.log(event.target.classList)
        event.target.classList.add('active');

        textarea1.classList.remove('active');
        textarea2.classList.remove('active');
        table.classList.remove('active');
        if ([...event.target.classList].indexOf('tab1') > -1) {
            textarea1.classList.add('active');
        }
        if ([...event.target.classList].indexOf('tab2') > -1) {
            textarea2.classList.add('active');
        }
        if ([...event.target.classList].indexOf('tab3') > -1) {
            table.classList.add('active');
        }
    }
    li1.addEventListener('click', clickTab);
    li2.addEventListener('click', clickTab);
    li3.addEventListener('click', clickTab);


    const div = document.createElement('div');
    ul.appendChild(li1);
    ul.appendChild(li2);
    ul.appendChild(li3);
    div.appendChild(ul);

    div.appendChild(textarea1);
    div.appendChild(textarea2);
    div.appendChild(table);
    document.getElementById('result').appendChild(div);
    
    document.querySelector('form progress').value = 0;
    document.querySelector('form button').disabled = false;
}

const params = getQueryString();
if (params.url) {
    document.querySelector('form input').value = params.url;
    reform(params.url);
} 

document.querySelector('form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const url = document.querySelector('form input').value;
    reform(url);
});
