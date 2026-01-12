// WWM Battle Royale - Game Logic (without A-Frame, 2D Grid)

const gameState = {
    roomCode: '',
    playerName: '',
    playerId: null,
    players: [],
    currentQuestion: null,
    currentQuestionIndex: 0,
    playerAnswers: {},
    timer: 0,
    timerInterval: null,
    eliminated: false,
    gameOver: false,
    myAnswerTime: null
};

let socket = null;

// Initialize game
function initGame() {
    console.log('🎮 Initializing game...');
    
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    gameState.roomCode = urlParams.get('room');
    gameState.playerName = urlParams.get('player');
    gameState.playerId = parseInt(urlParams.get('playerId'));
    
    // Get players from URL (passed from lobby)
    const playersParam = urlParams.get('players');
    if (playersParam) {
        try {
            gameState.players = JSON.parse(decodeURIComponent(playersParam));
            console.log('📋 Loaded players from lobby:', gameState.players);
        } catch (e) {
            console.error('Error parsing players:', e);
            gameState.players = [{
                id: gameState.playerId,
                name: gameState.playerName,
                eliminated: false
            }];
        }
    } else {
        // No players parameter - start with just this player
        gameState.players = [{
            id: gameState.playerId,
            name: gameState.playerName,
            eliminated: false
        }];
    }
    
    console.log('Room:', gameState.roomCode);
    console.log('Player:', gameState.playerName);
    console.log('Player ID:', gameState.playerId);
    console.log('Total players:', gameState.players.length);
    
    // Update UI
    updatePlayerNameDisplay();
    updatePlayersGrid();
    
    // Connect WebSocket
    connectWebSocket();
}

// Update player name in header
function updatePlayerNameDisplay() {
    const elem = document.getElementById('player-name-display');
    if (elem) {
        elem.textContent = gameState.playerName;
    }
}

// Update 2D players grid
function updatePlayersGrid() {
    const container = document.getElementById('players-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    gameState.players.forEach(player => {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.id = `player-${player.id}`;
        
        // Check if this player is YOU
        const isYou = player.id === gameState.playerId;
        if (isYou) {
            card.classList.add('player-you');
        }
        
        // Check if eliminated
        if (player.eliminated) {
            card.classList.add('player-eliminated');
        }
        
        card.innerHTML = `
            <div class="player-card-inner">
                <div class="player-name">${player.name}</div>
                <div class="player-status">${player.eliminated ? '💀 Eliminiert' : '✓ Aktiv'}</div>
                ${isYou ? '<div class="player-badge">DU</div>' : ''}
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Connect to WebSocket
let reconnectTimeout = null;
let keepAliveInterval = null;

function connectWebSocket() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log('⚠️ WebSocket already connected');
        return;
    }
    
    console.log('🔌 Connecting to WebSocket...');
    socket = new WebSocket('wss://nosch.uber.space/web-rooms/');
    
    socket.addEventListener('open', (event) => {
        console.log('✅ WebSocket connected');
        socket.send(JSON.stringify(['*enter-room*', gameState.roomCode]));
        
        // Send player-ready message
        setTimeout(() => {
            sendRequest('*broadcast-message*', JSON.stringify({
                type: 'game-player-ready',
                id: gameState.playerId,
                name: gameState.playerName
            }));
            
            // Check if we can start (in case this is the only player)
            setTimeout(() => {
                checkIfAllReady();
            }, 500);
        }, 100);
        
        // Start keep-alive ping every 30 seconds
        if (keepAliveInterval) clearInterval(keepAliveInterval);
        keepAliveInterval = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                console.log('💓 Keep-alive ping');
                socket.send(JSON.stringify(['*ping*']));
            }
        }, 30000);
    });
    
    socket.addEventListener('message', (event) => {
        handleMessage(event.data);
    });
    
    socket.addEventListener('close', () => {
        console.warn('⚠️ WebSocket disconnected - attempting to reconnect...');
        
        // Clear keep-alive
        if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
        }
        
        // Try to reconnect after 2 seconds
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(() => {
            console.log('🔄 Reconnecting...');
            connectWebSocket();
        }, 2000);
    });
    
    socket.addEventListener('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });
}

// Send WebSocket request
function sendRequest(selector, ...args) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify([selector, ...args]));
    }
}

// Handle incoming messages
function handleMessage(data) {
    console.log('📬 RAW WebSocket message received:', data);
    
    try {
        const parsed = JSON.parse(data);
        console.log('📦 Parsed message:', parsed);
        
        // Check if this is a direct JSON broadcast (single element array)
        if (Array.isArray(parsed) && parsed.length === 1 && typeof parsed[0] === 'string') {
            console.log('📢 Direct broadcast format detected');
            try {
                const broadcastData = JSON.parse(parsed[0]);
                console.log('✅ Parsed broadcast data:', broadcastData);
                handleGameMessage(broadcastData);
                return;
            } catch (e) {
                console.log('⚠️ Could not parse as JSON:', e);
            }
        }
        
        // Original format with selector
        const [selector, ...args] = parsed;
        console.log('🏷️ Selector:', selector, 'Args:', args);
        
        // Handle broadcast messages with selector
        if (Array.isArray(args) && args.length > 0 && typeof args[0] === 'string') {
            console.log('📢 Broadcast message with selector');
            try {
                const broadcastData = JSON.parse(args[0]);
                console.log('✅ Parsed broadcast data:', broadcastData);
                handleGameMessage(broadcastData);
            } catch (e) {
                console.log('⚠️ Not a JSON string broadcast:', e);
            }
        } else {
            console.log('ℹ️ Not a broadcast message (or wrong format)');
        }
        
    } catch (e) {
        console.error('❌ Error handling message:', e);
    }
}

// Handle game-specific messages
function handleGameMessage(data) {
    console.log('Received game message:', data);
    
    switch (data.type) {
        case 'game-player-ready':
            handlePlayerReady(data);
            break;
        case 'start-game':
            handleGameStart();
            break;
        case 'player-answer':
            handlePlayerAnswer(data);
            break;
        case 'player-eliminated':
            handlePlayerEliminated(data);
            break;
    }
}

// Handle player ready
function handlePlayerReady(data) {
    // Add player if not already in list
    const existing = gameState.players.find(p => p.id === data.id);
    if (!existing && data.id !== gameState.playerId) {
        console.log('➕ Player joined:', data.name);
        gameState.players.push({
            id: data.id,
            name: data.name,
            eliminated: false
        });
        updatePlayersGrid();
    }
    
    // Check if all players are ready
    checkIfAllReady();
}

// Check if all players ready
function checkIfAllReady() {
    // Count ready players (assume all in gameState.players are ready)
    const readyCount = gameState.players.length;
    const totalCount = gameState.players.length;
    
    // Update status message
    if (readyCount < 2) {
        document.getElementById('status-text').textContent = 
            `Warte auf weitere Spieler... (${readyCount}/2 Minimum)`;
    } else {
        document.getElementById('status-text').textContent = 
            `${readyCount} Spieler bereit - Spiel startet gleich...`;
    }
    
    // Update players left stat
    const activePlayers = gameState.players.filter(p => !p.eliminated);
    document.getElementById('players-left').textContent = activePlayers.length;
    
    // Start game only with 2 or more players
    if (readyCount >= 2 && !gameState.gameStarted) {
        gameState.gameStarted = true;
        
        console.log('✅ ENOUGH PLAYERS! Starting game...');
        console.log('👥 Player count:', readyCount);
        
        // Broadcast game start
        sendRequest('*broadcast-message*', JSON.stringify({
            type: 'start-game'
        }));
        
        // Start locally after short delay
        setTimeout(() => {
            handleGameStart();
        }, 1500);
    }
}

// Handle game start
function handleGameStart() {
    if (gameState.gameStarted && gameState.currentQuestionIndex > 0) {
        console.log('⏭️ Game already started, ignoring duplicate start message');
        return;
    }
    
    console.log('🎮 ALL PLAYERS READY - Starting game!');
    gameState.gameStarted = true;
    
    // Show countdown before first question
    showCountdown(3, () => {
        startQuestion(0);
    });
}

// Start a question
function startQuestion(index) {
    console.log('🔍 startQuestion called with index:', index);
    
    // Check if game is over
    if (gameState.gameOver) {
        console.log('⏹️ Game is over - not starting new question');
        return;
    }
    
    // Check if QUESTIONS exists
    if (typeof QUESTIONS === 'undefined' || !QUESTIONS || QUESTIONS.length === 0) {
        console.error('❌ FEHLER: questions.js wurde nicht geladen oder QUESTIONS ist leer!');
        console.error('typeof QUESTIONS:', typeof QUESTIONS);
        console.error('QUESTIONS:', QUESTIONS);
        document.getElementById('status-text').innerHTML = 
            '❌ FEHLER: Fragen konnten nicht geladen werden!<br>Bitte prüfe, ob js/questions.js existiert.';
        document.getElementById('waiting-screen').classList.remove('hidden');
        document.getElementById('question-screen').classList.add('hidden');
        return;
    }
    
    console.log('✅ QUESTIONS exists, length:', QUESTIONS.length);
    
    if (index >= QUESTIONS.length) {
        console.log('🏁 No more questions - showing winner');
        // No more questions
        showWinner();
        return;
    }
    
    console.log('📝 Getting question at index:', index);
    gameState.currentQuestionIndex = index;
    gameState.currentQuestion = QUESTIONS[index];
    gameState.myAnswerTime = null;
    
    console.log('✅ Current question:', gameState.currentQuestion);
    
    // Hide waiting screen, show question
    console.log('👁️ Hiding waiting screen, showing question screen');
    document.getElementById('waiting-screen').classList.add('hidden');
    document.getElementById('question-screen').classList.remove('hidden');
    
    // Update players left counter
    const activePlayers = gameState.players.filter(p => !p.eliminated);
    document.getElementById('players-left').textContent = activePlayers.length;
    
    console.log('📄 Setting question text:', gameState.currentQuestion.question);
    // Reset UI
    document.getElementById('question-number').textContent = `Frage ${index + 1}`;
    document.getElementById('question-text').textContent = gameState.currentQuestion.question;
    document.getElementById('feedback').style.display = 'none';
    document.getElementById('submit-btn').disabled = false;
    
    // Make sure elements are visible by removing hidden class
    document.getElementById('question-screen').classList.remove('hidden');
    document.getElementById('waiting-screen').classList.add('hidden');
    
    console.log('🎯 Question type:', gameState.currentQuestion.type);
    // Render answers based on type
    if (gameState.currentQuestion.type === 'sort') {
        console.log('🔀 Rendering sort question');
        renderSortQuestion();
    } else {
        console.log('🔘 Rendering multiple choice');
        renderMultipleChoice();
    }
    
    // Start timer
    console.log('⏱️ Starting timer');
    startTimer();
    
    console.log('✅ startQuestion completed');
}

// Render multiple choice
function renderMultipleChoice() {
    const container = document.getElementById('answers-container');
    container.innerHTML = '';
    container.className = 'answers-grid';
    
    gameState.currentQuestion.answers.forEach((answer, index) => {
        const button = document.createElement('button');
        button.className = 'answer-option';
        button.textContent = `${String.fromCharCode(65 + index)}) ${answer}`;
        button.onclick = () => selectAnswer(index);
        container.appendChild(button);
    });
}

// Render sort question
function renderSortQuestion() {
    const container = document.getElementById('answers-container');
    container.innerHTML = '<div class="sort-instructions">📌 Ziehe die Elemente in die richtige Reihenfolge:</div>';
    container.className = 'sort-container';
    
    const sortList = document.createElement('div');
    sortList.id = 'sort-list';
    sortList.className = 'sort-list';
    
    // Shuffle answers for sorting
    const shuffled = [...gameState.currentQuestion.answers]
        .map((item, index) => ({ item, index, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(obj => obj.item);
    
    shuffled.forEach(item => {
        const div = document.createElement('div');
        div.className = 'sort-item';
        div.draggable = true;
        div.textContent = item;
        
        div.addEventListener('dragstart', handleDragStart);
        div.addEventListener('dragover', handleDragOver);
        div.addEventListener('drop', handleDrop);
        div.addEventListener('dragend', handleDragEnd);
        
        sortList.appendChild(div);
    });
    
    container.appendChild(sortList);
}

// Drag and drop handlers
let draggedElement = null;

function handleDragStart(e) {
    draggedElement = e.target;
    e.target.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    const afterElement = getDragAfterElement(e.target.parentElement, e.clientY);
    if (afterElement == null) {
        e.target.parentElement.appendChild(draggedElement);
    } else {
        e.target.parentElement.insertBefore(draggedElement, afterElement);
    }
}

function handleDrop(e) {
    e.preventDefault();
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.sort-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Select answer
let selectedAnswerIndex = null;

function selectAnswer(index) {
    // Remove previous selection
    document.querySelectorAll('.answer-option').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Select new answer
    const buttons = document.querySelectorAll('.answer-option');
    if (buttons[index]) {
        buttons[index].classList.add('selected');
        selectedAnswerIndex = index;
    }
}

// Submit answer
function submitAnswer() {
    let userAnswer;
    
    if (gameState.currentQuestion.type === 'sort') {
        // Get sorted order
        const sortItems = document.querySelectorAll('.sort-item');
        userAnswer = Array.from(sortItems).map(item => item.textContent);
    } else {
        // Multiple choice
        if (selectedAnswerIndex === null) {
            showFeedback('Bitte wähle eine Antwort!', false);
            return;
        }
        userAnswer = selectedAnswerIndex;
    }
    
    // Check answer
    const isCorrect = checkAnswer(userAnswer);
    
    if (isCorrect) {
        // Stop timer
        stopTimer();
        gameState.myAnswerTime = gameState.timer;
        
        // Store MY OWN answer in playerAnswers!
        gameState.playerAnswers[gameState.playerId] = {
            time: gameState.timer,
            name: gameState.playerName
        };
        
        console.log('✅ I answered! Time:', gameState.timer.toFixed(1) + 's');
        console.log('📊 My playerAnswers:', gameState.playerAnswers);
        
        // Show feedback
        showFeedback(`🎉 Du bist eine Runde weiter! (Zeit: ${gameState.timer.toFixed(1)}s)`, true);
        
        // Broadcast answer
        sendRequest('*broadcast-message*', JSON.stringify({
            type: 'player-answer',
            playerId: gameState.playerId,
            playerName: gameState.playerName,
            time: gameState.timer,
            questionIndex: gameState.currentQuestionIndex
        }));
        
        console.log('📡 Broadcasted my answer');
        
        // Disable submit button
        document.getElementById('submit-btn').disabled = true;
        
        // ALWAYS go to waiting room after answering
        setTimeout(() => {
            showWaitingScreen();
        }, 1500); // Show success message for 1.5s, then go to waiting room
        
        // Check if all answered (including me!)
        const activePlayers = gameState.players.filter(p => !p.eliminated);
        const answeredCount = Object.keys(gameState.playerAnswers).length;
        console.log('📊 Check: ' + answeredCount + '/' + activePlayers.length + ' players answered');
        
        if (answeredCount === activePlayers.length) {
            console.log('✅ ALL PLAYERS ANSWERED! Starting elimination...');
            // Wait a bit so everyone is in waiting room, then find slowest
            setTimeout(() => {
                findAndEliminateSlowest();
            }, 3000); // 3 seconds so everyone sees the waiting room
        }
        
    } else {
        // Wrong answer
        showFeedback('✗ Falsche Antwort! Versuche es erneut...', false);
        // Timer keeps running!
    }
}

// Check if answer is correct
function checkAnswer(userAnswer) {
    if (gameState.currentQuestion.type === 'sort') {
        // Check if arrays are equal
        return JSON.stringify(userAnswer) === JSON.stringify(gameState.currentQuestion.correct);
    } else {
        // Multiple choice
        return userAnswer === gameState.currentQuestion.correct;
    }
}

// Show feedback
function showFeedback(message, isCorrect) {
    const feedback = document.getElementById('feedback');
    feedback.textContent = message;
    feedback.className = 'feedback ' + (isCorrect ? 'correct' : 'incorrect');
    feedback.style.display = 'block';
}

// Timer
function startTimer() {
    gameState.timer = 0;
    
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    gameState.timerInterval = setInterval(() => {
        gameState.timer += 0.1;
        updateTimerDisplay();
    }, 100);
}

function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}

function updateTimerDisplay() {
    const timerElem = document.getElementById('timer');
    if (timerElem) {
        timerElem.textContent = gameState.timer.toFixed(1) + 's';
    }
}

// Show waiting screen
function showWaitingScreen() {
    document.getElementById('question-screen').classList.add('hidden');
    document.getElementById('waiting-screen').classList.remove('hidden');
    
    // Update status based on game state
    const activePlayers = gameState.players.filter(p => !p.eliminated);
    const answeredCount = Object.keys(gameState.playerAnswers).length;
    
    if (answeredCount === activePlayers.length) {
        // Everyone answered
        document.getElementById('waiting-title').textContent = 'Auswertung...';
        document.getElementById('status-text').textContent = 'Alle haben geantwortet!';
    } else {
        // Still waiting
        document.getElementById('waiting-title').textContent = 'Warte auf Spieler...';
        document.getElementById('status-text').textContent = `${answeredCount}/${activePlayers.length} Spieler haben geantwortet`;
    }
    
    updatePlayersGrid();
}

// Show countdown before next question
function showCountdown(seconds, callback) {
    document.getElementById('question-screen').classList.add('hidden');
    document.getElementById('waiting-screen').classList.remove('hidden');
    document.getElementById('waiting-title').textContent = 'Nächste Frage...';
    
    let count = seconds;
    const countdownElement = document.getElementById('status-text');
    countdownElement.classList.add('countdown');
    
    const countdownInterval = setInterval(() => {
        if (count > 0) {
            countdownElement.textContent = count;
            count--;
        } else {
            clearInterval(countdownInterval);
            countdownElement.classList.remove('countdown');
            callback();
        }
    }, 1000);
    
    // Show initial countdown
    countdownElement.textContent = count;
}

// Handle player answer (from other players)
function handlePlayerAnswer(data) {
    console.log('📨 Received player-answer message:', data);
    console.log('   Player ID:', data.playerId);
    console.log('   My ID:', gameState.playerId);
    console.log('   Is from me?', data.playerId === gameState.playerId);
    
    // Don't process your own broadcasted answer again!
    if (data.playerId === gameState.playerId) {
        console.log('⏭️ Ignoring my own broadcasted answer');
        return;
    }
    
    console.log('✅ Player answered:', data.playerName, 'Time:', data.time + 's');
    
    // Store answer
    gameState.playerAnswers[data.playerId] = {
        time: data.time,
        name: data.playerName
    };
    
    console.log('💾 Stored answer in playerAnswers');
    console.log('📊 Current playerAnswers:', gameState.playerAnswers);
    
    // Count how many answered
    const activePlayers = gameState.players.filter(p => !p.eliminated);
    const answeredCount = Object.keys(gameState.playerAnswers).length;
    
    console.log('👥 Active players:', activePlayers.map(p => p.name));
    console.log('📊 Progress:', answeredCount + '/' + activePlayers.length, 'players answered');
    console.log('📝 Who answered:', Object.values(gameState.playerAnswers).map(a => a.name));
    
    // Check if all answered
    if (answeredCount === activePlayers.length) {
        console.log('✅ ALL PLAYERS ANSWERED!');
        
        // Find slowest player
        setTimeout(() => {
            findAndEliminateSlowest();
        }, 1000);
    } else {
        console.log('⏳ Still waiting for ' + (activePlayers.length - answeredCount) + ' more player(s)');
    }
}

// Find and eliminate slowest player
function findAndEliminateSlowest() {
    const answers = Object.entries(gameState.playerAnswers);
    
    if (answers.length === 0) return;
    
    // If only 1 player (solo mode), skip elimination and go to next question
    const activePlayers = gameState.players.filter(p => !p.eliminated);
    if (activePlayers.length === 1) {
        console.log('👤 Solo mode: Skipping elimination, going to next question');
        
        // Show success message
        document.getElementById('status-text').textContent = 
            'Richtig! Nächste Frage...';
        
        // Wait 2 seconds, then start next question
        setTimeout(() => {
            // Reset answers
            gameState.playerAnswers = {};
            
            // Show countdown before next question
            showCountdown(3, () => {
                startQuestion(gameState.currentQuestionIndex + 1);
            });
        }, 2000);
        return;
    }
    
    // Find slowest
    const slowest = answers.reduce((prev, curr) => {
        return curr[1].time > prev[1].time ? curr : prev;
    });
    
    const slowestId = parseInt(slowest[0]);
    const slowestPlayer = gameState.players.find(p => p.id === slowestId);
    
    console.log('💀 Slowest player:', slowestPlayer.name, 'Time:', slowest[1].time + 's');
    
    // Broadcast elimination
    sendRequest('*broadcast-message*', JSON.stringify({
        type: 'player-eliminated',
        playerId: slowestId,
        playerName: slowestPlayer.name,
        time: slowest[1].time
    }));
    
    // Handle locally
    handlePlayerEliminated({
        playerId: slowestId,
        playerName: slowestPlayer.name
    });
}

// Handle player elimination
function handlePlayerEliminated(data) {
    console.log('💀 Player eliminated:', data.playerName);
    
    // Mark player as eliminated
    const player = gameState.players.find(p => p.id === data.playerId);
    if (player) {
        player.eliminated = true;
    }
    
    // Check if I was eliminated
    if (data.playerId === gameState.playerId) {
        gameState.eliminated = true;
        gameState.gameOver = true; // Mark game as over for eliminated player
        
        // Show elimination in waiting room first
        document.getElementById('waiting-title').textContent = '💀 Eliminiert!';
        document.getElementById('status-text').textContent = `Du warst zu langsam (${data.time?.toFixed(1)}s)`;
        updatePlayersGrid();
        
        // Then show eliminated screen
        setTimeout(() => {
            showEliminatedScreen();
        }, 4000);
        return;
    }
    
    // Update grid to show eliminated player
    updatePlayersGrid();
    
    // Show elimination message in waiting room
    document.getElementById('waiting-title').textContent = 'Spieler eliminiert!';
    document.getElementById('status-text').textContent = 
        `${data.playerName} wurde eliminiert! (${data.time?.toFixed(1)}s)`;
    
    // Check remaining players
    const remaining = gameState.players.filter(p => !p.eliminated);
    
    console.log('👥 Remaining players:', remaining.length);
    
    if (remaining.length === 1) {
        // Only one left - winner!
        console.log('🏆 We have a winner!');
        gameState.gameOver = true; // Mark game as over
        
        // Show winner message
        document.getElementById('waiting-title').textContent = '🏆 Gewinner!';
        document.getElementById('status-text').textContent = 'Wir haben einen Sieger!';
        
        setTimeout(() => {
            showWinner();
        }, 4000);
    } else if (remaining.length === 0) {
        // Edge case: all eliminated somehow
        console.log('⚠️ No players remaining - ending game');
        gameState.gameOver = true;
    } else {
        // More than 1 player remaining - continue game
        console.log('▶️ Continuing to next question');
        
        // Show countdown after 3 seconds
        setTimeout(() => {
            // Double check game isn't over
            if (gameState.gameOver) {
                console.log('⏹️ Game ended during countdown - not starting new question');
                return;
            }
            
            // Reset answers
            gameState.playerAnswers = {};
            
            // Show 3 second countdown
            showCountdown(3, () => {
                startQuestion(gameState.currentQuestionIndex + 1);
            });
        }, 3000); // Wait 3 seconds so everyone can see elimination
    }
}

// Show eliminated screen
function showEliminatedScreen() {
    stopTimer();
    
    document.getElementById('question-screen').classList.add('hidden');
    document.getElementById('waiting-screen').classList.add('hidden');
    document.getElementById('eliminated-screen').classList.remove('hidden');
}

// Show winner
function showWinner() {
    stopTimer();
    gameState.gameOver = true;
    
    const remaining = gameState.players.filter(p => !p.eliminated);
    
    if (remaining.length === 1 && remaining[0].id === gameState.playerId) {
        // I won!
        document.getElementById('question-screen').classList.add('hidden');
        document.getElementById('waiting-screen').classList.add('hidden');
        document.getElementById('winner-screen').classList.remove('hidden');
    }
}

// Event listeners
document.getElementById('submit-btn')?.addEventListener('click', submitAnswer);

// Initialize on load
window.addEventListener('DOMContentLoaded', initGame);