const validCodes = [
    'westonisawesomeatlifeandeverythingelse',
    'johnisgoodatbaseball',
    'sqirly03',
    'apple27x',
    'ballswoggler',
    'ilovefakinginjuries552',
    'mattyboi',
    'drakemayelover900',
    'lucas',
    'apscott'
];

let allGames = []; // Store all games for filtering

// Check if user is already logged in
window.onload = function() {
    if (sessionStorage.getItem('accessGranted') === 'true') {
        showGamesScreen();
    }
    
    // Allow Enter key to submit code
    document.getElementById('codeInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            checkCode();
        }
    });
};

function checkCode() {
    const input = document.getElementById('codeInput').value;
    const errorMsg = document.getElementById('errorMsg');
    
    if (validCodes.includes(input.toLowerCase())) {
        sessionStorage.setItem('accessGranted', 'true');
        errorMsg.textContent = '';
        showGamesScreen();
    } else {
        errorMsg.textContent = 'Invalid access code | Invoice not paid';
        document.getElementById('codeInput').value = '';
    }
}

function showGamesScreen() {
    document.getElementById('accessScreen').classList.add('hidden');
    document.getElementById('gamesScreen').classList.remove('hidden');
    loadGames();
}

async function loadGames() {
    const gamesList = document.getElementById('gamesList');
    const noGames = document.getElementById('noGames');
    
    try {
        // Fetch the games list from list.json
        const response = await fetch('list.json');
        allGames = await response.json();
        
        displayGames(allGames);
    } catch (error) {
        console.error('Error loading games:', error);
        noGames.textContent = 'Error loading games';
        noGames.classList.remove('hidden');
    }
}

function displayGames(games) {
    const gamesList = document.getElementById('gamesList');
    const noGames = document.getElementById('noGames');
    
    if (games.length === 0) {
        gamesList.innerHTML = '';
        noGames.classList.remove('hidden');
        return;
    }
    
    noGames.classList.add('hidden');
    gamesList.innerHTML = '';
    
    games.forEach((game, index) => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.style.animationDelay = `${index * 0.05}s`;
        card.onclick = () => openGame(game.name);
        
        card.innerHTML = `
            <h3>${game.display}</h3>
            <p>Click to play</p>
        `;
        
        gamesList.appendChild(card);
    });
}

function filterGames() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filteredGames = allGames.filter(game => 
        game.display.toLowerCase().includes(searchTerm) ||
        game.name.toLowerCase().includes(searchTerm)
    );
    displayGames(filteredGames);
}

function openGame(gameName) {
    const gameUrl = `games/${gameName}.html`;
    const sessionId = Math.floor(10000 + Math.random() * 90000); // 5-digit random id
    
    // Check if session is blocked
    const blocked = localStorage.getItem('blockedSessions');
    const blockedSessions = blocked ? JSON.parse(blocked) : [];
    const isBlocked = blockedSessions.find(s => s.id === sessionId.toString());
    
    const newWindow = window.open('', '_blank');
    
    if (isBlocked) {
        // Show blocked message
        newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Access Denied</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        background: #000;
                        color: #ffb3d9;
                        font-family: Arial, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        text-align: center;
                    }
                    .blocked-container {
                        max-width: 500px;
                        padding: 40px;
                        border: 2px solid #ff1a75;
                        border-radius: 16px;
                        background: rgba(255, 26, 117, 0.1);
                        box-shadow: 0 0 30px rgba(255, 26, 117, 0.3);
                    }
                    h1 {
                        color: #ff1a75;
                        font-size: 2.5em;
                        margin-bottom: 20px;
                        text-shadow: 0 0 20px rgba(255, 26, 117, 0.5);
                    }
                    p {
                        font-size: 1.1em;
                        opacity: 0.8;
                        margin-bottom: 15px;
                    }
                    .session-id {
                        font-family: monospace;
                        color: #ff99cc;
                        font-size: 0.9em;
                        margin-top: 30px;
                    }
                </style>
            </head>
            <body>
                <div class="blocked-container">
                    <h1>💔 Access Denied</h1>
                    <p>This session has been blocked by an administrator.</p>
                    <p>If you believe this is an error, please contact support.</p>
                    <div class="session-id">Session ID: ${sessionId}</div>
                </div>
            </body>
            </html>
        `);
        newWindow.document.close();
        return;
    }
    
    newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${gameName}</title>
            <style>
                body { 
                    margin: 0; 
                    padding: 0; 
                    overflow: hidden; 
                    font-family: Arial, sans-serif; 
                    background: #000;
                    color: #ffb3d9;
                }
                .loader { 
                    position: absolute; 
                    top: 50%; 
                    left: 50%; 
                    transform: translate(-50%, -50%); 
                    text-align: center; 
                    animation: fadeIn 0.4s ease; 
                }
                .loader h1 { 
                    font-size: 2.1em; 
                    font-weight: 700; 
                    margin-bottom: 10px;
                    color: #ffcceb;
                    text-shadow: 0 0 20px rgba(255, 26, 117, 0.5);
                }
                .loader p { 
                    opacity: 0.7; 
                    margin-bottom: 20px;
                    color: #ff99cc;
                }
                .progress-box { 
                    width: 420px; 
                    border: 2px solid #ff1a75; 
                    padding: 8px 12px; 
                    text-align: left; 
                    font-size: 1.1em;
                    border-radius: 8px;
                    background: rgba(255, 26, 117, 0.1);
                    box-shadow: 0 0 20px rgba(255, 26, 117, 0.2);
                }
                .progress-bar { 
                    height: 6px; 
                    width: 0%; 
                    background: linear-gradient(90deg, #ff1a75 0%, #ff4d94 100%);
                    margin-top: 10px; 
                    transition: width .15s;
                    border-radius: 3px;
                    box-shadow: 0 0 10px rgba(255, 26, 117, 0.6);
                }
                iframe { 
                    width: 100vw; 
                    height: 100vh; 
                    border: none; 
                    display: none; 
                }
                @keyframes fadeIn { 
                    from { opacity: 0; } 
                    to { opacity: 1; } 
                }
                .session { 
                    position: fixed; 
                    bottom: 8px; 
                    right: 12px; 
                    opacity: 0.4; 
                    font-size: 12px;
                    color: #ff99cc;
                }
                .heart-loader {
                    font-size: 60px;
                    margin-bottom: 20px;
                    animation: heartbeat 1.5s ease-in-out infinite;
                }
                @keyframes heartbeat {
                    0%, 100% { transform: scale(1); }
                    10%, 30% { transform: scale(1.15); }
                    20%, 40% { transform: scale(1); }
                }
            </style>
        </head>
        <body>
            <div id="loader" class="loader">
                <div class="heart-loader">💝</div>
                <p>Loading…</p>
                <h1>PLEASE WAIT...</h1>
                <p>The system is currently:</p>
                <div class="progress-box">
                    <span id="status">Retrieving game data… 0%</span>
                    <div id="bar" class="progress-bar"></div>
                </div>
            </div>
            <iframe id="gameFrame" src="${gameUrl}"></iframe>
            <div class="session">sess id: ${sessionId}</div>
            <script>
                // Check if blocked periodically
                setInterval(() => {
                    const blocked = localStorage.getItem('blockedSessions');
                    if (blocked) {
                        const sessions = JSON.parse(blocked);
                        if (sessions.find(s => s.id === '${sessionId}')) {
                            document.body.innerHTML = \`
                                <div style="display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center;">
                                    <div style="border: 2px solid #ff1a75; border-radius: 16px; padding: 40px; background: rgba(255, 26, 117, 0.1); box-shadow: 0 0 30px rgba(255, 26, 117, 0.3);">
                                        <h1 style="color: #ff1a75; font-size: 2.5em; margin-bottom: 20px; text-shadow: 0 0 20px rgba(255, 26, 117, 0.5);">💔 Session Terminated</h1>
                                        <p style="font-size: 1.1em; opacity: 0.8; color: #ffb3d9;">This session has been blocked by an administrator.</p>
                                        <p style="font-family: monospace; color: #ff99cc; margin-top: 30px;">Session ID: ${sessionId}</p>
                                    </div>
                                </div>
                            \`;
                        }
                    }
                }, 2000);
                
                let progress = 0;
                const bar = document.getElementById("bar");
                const status = document.getElementById("status");
                const iframe = document.getElementById("gameFrame");
                const loader = document.getElementById("loader");
                
                const loadInterval = setInterval(() => {
                    progress += Math.random() * 8 + 4;
                    if (progress >= 100) progress = 100;
                    
                    bar.style.width = progress + "%";
                    status.textContent = "Retrieving game data… " + Math.floor(progress) + "%";
                    
                    if (progress === 100) {
                        clearInterval(loadInterval);
                        setTimeout(() => {
                            loader.style.display = "none";
                            iframe.style.display = "block";
                        }, 600);
                    }
                }, 140);
            </script>
        </body>
        </html>
    `);
    newWindow.document.close();
}

function logout() {
    sessionStorage.removeItem('accessGranted');
    document.getElementById('gamesScreen').classList.add('hidden');
    document.getElementById('accessScreen').classList.remove('hidden');
    document.getElementById('codeInput').value = '';
}