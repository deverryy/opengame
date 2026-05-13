// Access codes - add more here
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
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    margin: 0; 
                    padding: 0; 
                    overflow: hidden; 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%);
                    color: #fff; 
                }
                
                iframe { width: 100vw; height: 100vh; border: none; display: none; }
                .session { position: fixed; bottom: 8px; right: 12px; opacity: 0.3; font-size: 12px; z-index: 5; }
                
                /* Loading screen styles */
                #loadingScreen {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%);
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }
                
                /* Stars background */
                .stars { position: absolute; width: 100%; height: 100%; overflow: hidden; }
                .star { position: absolute; background: white; border-radius: 50%; animation: twinkle 3s infinite; }
                @keyframes twinkle { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
                
                /* Loading container */
                .loading-container {
                    text-align: center;
                    z-index: 10;
                    max-width: 600px;
                    padding: 40px 20px;
                }
                
                /* Connection scene */
                .connection-scene {
                    margin-bottom: 40px;
                    height: 400px;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    align-items: center;
                }
                
                /* Satellite at top */
                .satellite-container {
                    animation: float 3s ease-in-out infinite;
                    z-index: 3;
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-15px); }
                }
                .satellite {
                    width: 160px;
                    height: 140px;
                    margin: 0 auto;
                    position: relative;
                }
                .sat-body {
                    width: 80px;
                    height: 60px;
                    background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
                    border-radius: 8px;
                    position: absolute;
                    top: 40px;
                    left: 40px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                }
                .sat-face {
                    width: 50px;
                    height: 30px;
                    background: #1a202c;
                    border-radius: 6px;
                    position: absolute;
                    top: 15px;
                    left: 15px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 24px;
                    color: #3b82f6;
                    font-weight: bold;
                }
                .solar-panel {
                    width: 50px;
                    height: 60px;
                    background: linear-gradient(90deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
                    position: absolute;
                    top: 40px;
                    border: 2px solid #1e40af;
                }
                .solar-panel::before, .solar-panel::after {
                    content: '';
                    position: absolute;
                    width: 100%;
                    height: 1px;
                    background: #1e40af;
                    left: 0;
                }
                .solar-panel::before { top: 33%; }
                .solar-panel::after { top: 66%; }
                .solar-left { left: -10px; transform: rotate(-5deg); }
                .solar-right { right: -10px; transform: rotate(5deg); }
                .sat-antenna {
                    width: 3px;
                    height: 30px;
                    background: #718096;
                    position: absolute;
                    top: 10px;
                    left: 78px;
                }
                .sat-antenna::after {
                    content: '';
                    width: 12px;
                    height: 12px;
                    background: #3b82f6;
                    border-radius: 50%;
                    position: absolute;
                    top: -6px;
                    left: -4.5px;
                    animation: pulse 2s ease-in-out infinite;
                }
                @keyframes pulse {
                    0%, 100% { 
                        transform: scale(1);
                        opacity: 1;
                        box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
                    }
                    50% { 
                        transform: scale(1.2);
                        opacity: 0.8;
                        box-shadow: 0 0 20px 5px rgba(59, 130, 246, 0.4);
                    }
                }
                
                /* Data beam */
                .data-beam {
                    position: absolute;
                    width: 0;
                    height: 0;
                    top: 135px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 2;
                    border-left: 60px solid transparent;
                    border-right: 60px solid transparent;
                    border-bottom: 180px solid rgba(59, 130, 246, 0.3);
                    animation: beam-pulse 2s ease-in-out infinite;
                }
                @keyframes beam-pulse {
                    0%, 100% { 
                        opacity: 0.3;
                        transform: translateX(-50%) scaleY(1);
                    }
                    50% { 
                        opacity: 0.6;
                        transform: translateX(-50%) scaleY(0.97);
                    }
                }
                
                /* Data packets */
                .data-packet {
                    position: absolute;
                    width: 8px;
                    height: 8px;
                    background: #3b82f6;
                    border-radius: 2px;
                    box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);
                    animation: packet-transfer 3s ease-in-out infinite;
                    opacity: 0;
                    z-index: 2;
                }
                .data-packet:nth-child(1) { top: 200px; left: 45%; animation-delay: 0s; }
                .data-packet:nth-child(2) { top: 220px; left: 55%; animation-delay: 0.6s; }
                .data-packet:nth-child(3) { top: 240px; left: 50%; animation-delay: 1.2s; }
                .data-packet:nth-child(4) { top: 210px; left: 52%; animation-delay: 1.8s; }
                
                @keyframes packet-transfer {
                    0% { 
                        opacity: 0;
                        transform: translateY(0) scale(0.5);
                    }
                    20% { 
                        opacity: 1;
                        transform: translateY(-20px) scale(1);
                    }
                    80% { 
                        opacity: 1;
                        transform: translateY(-120px) scale(1);
                    }
                    100% { 
                        opacity: 0;
                        transform: translateY(-150px) scale(0.5);
                    }
                }
                
                /* Server rack on Earth */
                .server-container {
                    position: relative;
                    z-index: 3;
                }
                .server-rack {
                    width: 200px;
                    height: 180px;
                    background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
                    border-radius: 8px;
                    border: 3px solid #4a5568;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
                    position: relative;
                    padding: 15px;
                }
                
                /* Server units */
                .server-unit {
                    width: 100%;
                    height: 35px;
                    background: linear-gradient(90deg, #374151 0%, #1f2937 100%);
                    border-radius: 4px;
                    margin-bottom: 10px;
                    border: 1px solid #4b5563;
                    display: flex;
                    align-items: center;
                    padding: 0 10px;
                    position: relative;
                }
                
                .server-lights {
                    display: flex;
                    gap: 6px;
                }
                
                .server-light {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    animation: blink 1.5s infinite;
                }
                
                .light-green {
                    background: #10b981;
                    box-shadow: 0 0 8px rgba(16, 185, 129, 0.8);
                }
                
                .light-blue {
                    background: #3b82f6;
                    box-shadow: 0 0 8px rgba(59, 130, 246, 0.8);
                    animation-delay: 0.3s;
                }
                
                .light-yellow {
                    background: #f59e0b;
                    box-shadow: 0 0 8px rgba(245, 158, 11, 0.8);
                    animation-delay: 0.6s;
                }
                
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
                
                /* Loading text */
                .loading-title {
                    font-size: 28px;
                    font-weight: 700;
                    margin-bottom: 20px;
                    color: #3b82f6;
                    text-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
                }
                
                .loading-message {
                    font-size: 18px;
                    line-height: 1.6;
                    margin-bottom: 30px;
                    color: #cbd5e0;
                }
                
                /* Progress bar */
                .progress-container {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    padding: 20px;
                    backdrop-filter: blur(10px);
                    width: 100%;
                    max-width: 500px;
                }
                
                .progress-label {
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    color: #a0aec0;
                    margin-bottom: 12px;
                    text-align: left;
                }
                
                .progress-bar-bg {
                    width: 100%;
                    height: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    overflow: hidden;
                    position: relative;
                }
                
                .progress-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
                    border-radius: 4px;
                    width: 0%;
                    transition: width 0.3s ease;
                    box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
                }
                
                .progress-text {
                    font-family: 'Courier New', monospace;
                    font-size: 16px;
                    color: #3b82f6;
                    margin-top: 12px;
                    text-align: left;
                }
            </style>
        </head>
        <body>
            <iframe id="gameFrame" src="${gameUrl}"></iframe>
            <div class="session">sess id: ${sessionId}</div>
            
            <!-- Loading Screen -->
            <div id="loadingScreen">
                <div class="stars" id="stars"></div>
                <div class="loading-container">
                    <div class="connection-scene">
                        <!-- Satellite -->
                        <div class="satellite-container">
                            <div class="satellite">
                                <div class="sat-antenna"></div>
                                <div class="solar-panel solar-left"></div>
                                <div class="sat-body">
                                    <div class="sat-face">:)</div>
                                </div>
                                <div class="solar-panel solar-right"></div>
                            </div>
                        </div>
                        
                        <!-- Data beam and packets -->
                        <div class="data-beam"></div>
                        <div class="data-packet"></div>
                        <div class="data-packet"></div>
                        <div class="data-packet"></div>
                        <div class="data-packet"></div>
                        
                        <!-- Server rack -->
                        <div class="server-container">
                            <div class="server-rack">
                                <div class="server-unit">
                                    <div class="server-lights">
                                        <div class="server-light light-green"></div>
                                        <div class="server-light light-blue"></div>
                                        <div class="server-light light-green"></div>
                                    </div>
                                </div>
                                <div class="server-unit">
                                    <div class="server-lights">
                                        <div class="server-light light-blue"></div>
                                        <div class="server-light light-green"></div>
                                        <div class="server-light light-yellow"></div>
                                    </div>
                                </div>
                                <div class="server-unit">
                                    <div class="server-lights">
                                        <div class="server-light light-green"></div>
                                        <div class="server-light light-blue"></div>
                                        <div class="server-light light-blue"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <h1 class="loading-title">Connecting to Game Server</h1>
                    <p class="loading-message">
                        Establishing secure connection and retrieving game data...
                    </p>
                    
                    <div class="progress-container">
                        <div class="progress-label">Loading Progress</div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" id="progressBar"></div>
                        </div>
                        <div class="progress-text" id="progressText">Initializing... 0%</div>
                    </div>
                </div>
            </div>
            
            <script>
                // Generate stars
                const starsContainer = document.getElementById('stars');
                for (let i = 0; i < 100; i++) {
                    const star = document.createElement('div');
                    star.className = 'star';
                    star.style.width = Math.random() * 3 + 'px';
                    star.style.height = star.style.width;
                    star.style.left = Math.random() * 100 + '%';
                    star.style.top = Math.random() * 100 + '%';
                    star.style.animationDelay = Math.random() * 3 + 's';
                    starsContainer.appendChild(star);
                }
                
                let progress = 0;
                const progressBar = document.getElementById('progressBar');
                const progressText = document.getElementById('progressText');
                const iframe = document.getElementById('gameFrame');
                const loadingScreen = document.getElementById('loadingScreen');
                
                const loadingMessages = [
                    'Establishing connection...',
                    'Authenticating session...',
                    'Retrieving game data...',
                    'Loading assets...',
                    'Preparing game environment...',
                    'Almost ready...'
                ];
                
                let messageIndex = 0;
                
                // Check if blocked periodically
                setInterval(() => {
                    const blocked = localStorage.getItem('blockedSessions');
                    if (blocked) {
                        const sessions = JSON.parse(blocked);
                        if (sessions.find(s => s.id === '${sessionId}')) {
                            document.body.innerHTML = \`
                                <div style="display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center; background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); color: #fff;">
                                    <div>
                                        <h1 style="color: #ef4444; font-size: 2.5em; margin-bottom: 20px;">🚫 Session Terminated</h1>
                                        <p style="font-size: 1.1em; opacity: 0.7;">This session has been blocked by an administrator.</p>
                                        <p style="font-family: monospace; color: #888; margin-top: 30px;">Session ID: ${sessionId}</p>
                                    </div>
                                </div>
                            \`;
                        }
                    }
                }, 2000);
                
                const loadInterval = setInterval(() => {
                    progress += Math.random() * 6 + 3;
                    if (progress >= 100) progress = 100;
                    
                    progressBar.style.width = progress + '%';
                    
                    // Update message based on progress
                    const newMessageIndex = Math.floor(progress / 17);
                    if (newMessageIndex !== messageIndex && newMessageIndex < loadingMessages.length) {
                        messageIndex = newMessageIndex;
                        progressText.textContent = loadingMessages[messageIndex] + ' ' + Math.floor(progress) + '%';
                    } else {
                        progressText.textContent = loadingMessages[messageIndex] + ' ' + Math.floor(progress) + '%';
                    }
                    
                    if (progress === 100) {
                        clearInterval(loadInterval);
                        progressText.textContent = 'Ready! Launching game...';
                        setTimeout(() => {
                            loadingScreen.style.display = 'none';
                            iframe.style.display = 'block';
                        }, 800);
                    }
                }, 120);
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