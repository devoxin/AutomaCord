async function searchBots (e) {
  document.querySelector('.search-bar input').style.color = 'white';

  if (e.keyCode !== 13) {
    return;
  }

  const { value: query } = document.querySelector('.search-bar input');

  if (query.length === 0 || !/^[a-zA-Z0-9 ]+$/.test(query)) {
    return;
  }

  const resultContainer = document.getElementById('search-result');
  resultContainer.innerHTML = '';

  const results = await fetch(`/api/search?query=${query}`)
    .then(r => r.json());

  if (results.length === 0) {
    document.querySelector('.search-bar input').style.color = 'red';
  } else {
    for (const bot of results) {
      const card = document.createElement('div');
      card.className = 'bot-card';
      card.setAttribute('onclick', `window.location.href = '/bot/${bot.id}'`);

      const icon = document.createElement('img');
      icon.src = `https://cdn.discordapp.com/avatars/${bot.id}/${bot.avatar}.png?size=512`;

      const name = document.createElement('span');
      const description = document.createElement('span');

      name.innerText = bot.username;

      description.className = 'description';
      description.innerText = bot.shortDesc;

      name.appendChild(description);
      card.appendChild(icon);
      card.append(name);
      resultContainer.appendChild(card);
    }
  }
}