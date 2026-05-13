// client-side app
(() => {
  const ACCESS_CODE = 'deverr'; // required code (case-sensitive)
  const AUTH_KEY = 'dever_games_unlocked';
  const listUrl = "/gam/games/list.json"; // must be present on server

  const authSection = document.getElementById('auth');
  const gamesSection = document.getElementById('gamesSection');
  const codeInput = document.getElementById('codeInput');
  const unlockBtn = document.getElementById('unlockBtn');
  const clearBtn = document.getElementById('clearBtn');
  const authMsg = document.getElementById('authMsg');
  const gamesContainer = document.getElementById('gamesContainer');
  const errorEl = document.getElementById('error');
  const logoutBtn = document.getElementById('logoutBtn');

  function show(el){ el.classList.remove('hidden'); }
  function hide(el){ el.classList.add('hidden'); }

  function setMessage(text, type='muted'){
    authMsg.textContent = text;
    authMsg.className = type === 'error' ? 'error' : 'muted';
  }

  function loadGames() {
    errorEl.classList.add('hidden');
    gamesContainer.innerHTML = 'Loading...';

    fetch(listUrl, {cache: 'no-store'})
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch games list (check games/list.json)');
        return r.json();
      })
      .then(arr => {
        if (!Array.isArray(arr)) throw new Error('games/list.json must be an array of filenames');
        gamesContainer.innerHTML = '';
        if (arr.length === 0) {
          gamesContainer.innerHTML = '<p class="muted small">No games found. Add .html files to /games and update list.json.</p>';
          return;
        }
        arr.forEach(filename => {
          if (typeof filename !== 'string') return;
          // normalize and filter only .html
          const name = filename.replace(/\.html?$/i, '');
          const btn = document.createElement('button');
          btn.className = 'game-btn';
          btn.innerHTML = `<div class="game-name">${escapeHtml(name)}</div>`;
          btn.addEventListener('click', () => openGame(filename));
          gamesContainer.appendChild(btn);
        });
      })
      .catch(err => {
        gamesContainer.innerHTML = '';
        errorEl.classList.remove('hidden');
        errorEl.textContent = err.message;
      });
  }

  function openGame(filePath) {
  const newTab = window.open('about:blank', '_blank');
  if (!newTab) {
    alert('Pop-up blocked. Allow pop-ups for this site to open games.');
    return;
  }

  const url = filePath.startsWith('/') ? filePath : `/gam/games/${filePath}`;
  const html = `
    <html>
      <head>
        <title>${escapeHtml(filePath.replace(/\.html?$/i, ''))}</title>
        <style>
          html, body {
            margin: 0;
            padding: 0;
            height: 100%;
            background: #000;
          }
          iframe {
            border: none;
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <iframe src="${url}" allowfullscreen></iframe>
      </body>
    </html>
  `;

  newTab.document.open();
  newTab.document.write(html);
  newTab.document.close();
}


  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }

  function unlock() {
    const val = codeInput.value.trim();
    if (!val) { setMessage('Enter the code.', 'error'); return; }
    if (val === ACCESS_CODE) {
      sessionStorage.setItem(AUTH_KEY, '1');
      showGamesView();
    } else {
      setMessage('Wrong code. Try again.', 'error');
    }
  }

  function showGamesView() {
    hide(authSection);
    show(gamesSection);
    setMessage('');
    loadGames();
  }

  function logout() {
    sessionStorage.removeItem(AUTH_KEY);
    hide(gamesSection);
    show(authSection);
    codeInput.value = '';
    setMessage('');
  }

  // wire
  unlockBtn.addEventListener('click', unlock);
  clearBtn.addEventListener('click', () => {
    codeInput.value = '';
    setMessage('');
  });

  logoutBtn.addEventListener('click', logout);

  // enter key
  codeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') unlock();
  });

  // on load if already unlocked in this session
  if (sessionStorage.getItem(AUTH_KEY) === '1') {
    showGamesView();
  }
})();
