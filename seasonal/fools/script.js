// Access codes - add more here
const validCodes = [
    'westonisawesomeatlifeandeverythingelse',
    'johnisgoodatbaseball',
    'sqirly03',
    'apple27x',
    'ballswoggler',
    'dofootbal!$@64',
    'ilovefakinginjuries552'
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
        errorMsg.textContent = 'Invalid access code';
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
        
        // Add random initial transform for variety
        const randomDelay = Math.random() * 2;
        card.style.setProperty('--float-delay', `${randomDelay}s`);
        
        card.innerHTML = `
            <h3>${game.display}</h3>
            <p>Click to play</p>
        `;
        
        gamesList.appendChild(card);
        
        // Add stickman to each card
        createStickmanForCard(card, index);
    });
    
    // Start stickman throwing chaos
    startStickmanChaos();
}

function createStickmanForCard(card, index) {
    // Create stickman container
    const stickman = document.createElement('div');
    stickman.className = 'stickman-container';
    stickman.innerHTML = `
        <div class="stickman-head"></div>
        <div class="stickman-body"></div>
        <div class="stickman-arm-left"></div>
        <div class="stickman-arm-right"></div>
        <div class="stickman-leg-left"></div>
        <div class="stickman-leg-right"></div>
    `;
    card.appendChild(stickman);
    
    // Stickman appears and starts throwing
    setTimeout(() => {
        setInterval(() => {
            stickman.classList.add('active');
            
            // Grab and throw an element
            setTimeout(() => {
                grabAndThrowElement(card);
            }, 1000);
            
            // Hide stickman after throwing
            setTimeout(() => {
                stickman.classList.remove('active');
            }, 3000);
        }, 12000 + (index * 1000)); // Stagger each stickman
    }, 3000 + (index * 500));
}

function grabAndThrowElement(sourceCard) {
    const elements = [
        { el: document.getElementById('announcementBar'), name: 'announcement' },
        { el: document.getElementById('mainTitle'), name: 'title' },
        { el: document.querySelector('.search-container'), name: 'search' },
        { el: document.getElementById('logoutBtn'), name: 'logout' }
    ];
    
    const target = elements[Math.floor(Math.random() * elements.length)];
    if (!target.el) return;
    
    const cardRect = sourceCard.getBoundingClientRect();
    const targetRect = target.el.getBoundingClientRect();
    
    // Calculate grab position (towards the card)
    const grabX = cardRect.left - targetRect.left + cardRect.width / 2;
    const grabY = cardRect.top - targetRect.top + cardRect.height / 2;
    
    // Add grabbed class for visual feedback
    target.el.classList.add('being-grabbed');
    
    // Animate towards card (getting grabbed)
    target.el.style.transition = 'all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    target.el.style.transform = `translate(${grabX}px, ${grabY}px) scale(0.5) rotate(${Math.random() * 360}deg)`;
    
    // Then throw it away
    setTimeout(() => {
        const throwDistance = 800;
        const throwX = (Math.random() - 0.5) * throwDistance;
        const throwY = (Math.random() - 0.5) * throwDistance;
        const throwRotation = (Math.random() - 0.5) * 1440;
        const throwScale = Math.random() * 1.5 + 0.5;
        
        target.el.style.transition = 'all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
        target.el.style.transform = `translate(${throwX}px, ${throwY}px) scale(${throwScale}) rotate(${throwRotation}deg)`;
        
        // Return to original position
        setTimeout(() => {
            target.el.classList.remove('being-grabbed');
            target.el.style.transition = 'all 1s ease-out';
            target.el.style.transform = '';
        }, 1200);
    }, 600);
}

function startStickmanChaos() {
    // Additional random throwing every few seconds
    setInterval(() => {
        const cards = document.querySelectorAll('.game-card');
        const randomCard = cards[Math.floor(Math.random() * cards.length)];
        
        if (randomCard && Math.random() > 0.5) {
            grabAndThrowElement(randomCard);
        }
    }, 3000);
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
                        color: #fff;
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
                    }
                    h1 {
                        color: #d70000;
                        font-size: 2.5em;
                        margin-bottom: 20px;
                    }
                    p {
                        font-size: 1.1em;
                        opacity: 0.7;
                        margin-bottom: 15px;
                    }
                    .session-id {
                        font-family: monospace;
                        color: #888;
                        font-size: 0.9em;
                        margin-top: 30px;
                    }
                </style>
            </head>
            <body>
                <div class="blocked-container">
                    <h1>🚫 Access Denied</h1>
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
                body { margin: 0; padding: 0; overflow: hidden; font-family: Arial, sans-serif; background: #000; color: #fff; }
                .loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; animation: fadeIn 0.4s ease; }
                .loader h1 { font-size: 2.1em; font-weight: 700; margin-bottom: 10px; }
                .loader p { opacity: 0.6; margin-bottom: 20px; }
                .progress-box { width: 420px; border: 1px solid #444; padding: 8px 12px; text-align: left; font-size: 1.1em; }
                .progress-bar { height: 6px; width: 0%; background: #d70000; margin-top: 10px; transition: width .15s; }
                iframe { width: 100vw; height: 100vh; border: none; display: none; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .session { position: fixed; bottom: 8px; right: 12px; opacity: 0.3; font-size: 12px; }
            </style>
        </head>
        <body>
            <div id="loader" class="loader">
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
                                    <div>
                                        <h1 style="color: #d70000; font-size: 2.5em; margin-bottom: 20px;">🚫 Session Terminated</h1>
                                        <p style="font-size: 1.1em; opacity: 0.7;">This session has been blocked by an administrator.</p>
                                        <p style="font-family: monospace; color: #888; margin-top: 30px;">Session ID: ${sessionId}</p>
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