
// WWM Battle Royale - Game Logic (without A-Frame, 2D Grid)

const gameState = {
    playerName: 'none',
    playerId: null,
    players: [],
    currentQuestion: null,
    currentQuestionIndex: 0,
    playerAnswers: {},
    timer: 0,
    timerInterval: null,
    eliminated: false,
    gameOver: false,
    myAnswerTime: null,
    isHost: false,
    gameStarted: false, // Explicitly false at start
    numPlayersReady: 0,
};

let socket = null;

// Initialize game
function initGame() {
    console.log('🎮 Initializing game...');

    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    gameState.playerName = urlParams.get('player');

    // Connect WebSocket
    connectWebSocket();
}

function addPlayer(playerId, name) {
    const player = {
        id: playerId,
        name: name,
        eliminated: false
    };

    gameState.players.push(player);
}

function deletePlayer(playerId) {
    for (let player of gameState.players) {
        if (player.id === playerId) {
            const index = gameState.players.indexOf(player);
            gameState.players.splice(index, 1);
            break;
        }
    }
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
        sendRequest('*enter-room*', 'wwm-battle-royale');
        sendRequest('*subscribe-client-enter-exit*');

        keepAliveInterval = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send('');
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

    if (data.length > 0) {
        const parsed = JSON.parse(data);
        const selector = parsed[0];

        switch (selector) {
            case '*client-id*': {
                const id = parsed[1];
                const playerId = `player-${id}`;
                gameState.playerId = playerId;
                addPlayer(playerId, gameState.playerName);
                updatePlayerNameDisplay();
                updatePlayersGrid();
                break;
            }

            case '*client-enter*': {
                const id = parsed[1];
                sendRequest('*send-message*', id, ['player-ready', gameState.playerId, gameState.playerName]);
                break;
            }

            case '*client-exit*': {
                const id = parsed[1];
                const playerId = `player-${id}`;
                deletePlayer(playerId);
                updatePlayersGrid();
                break;
            }

            case 'player-ready': {
                const id = parsed[1];
                const name = parsed[2];
                handlePlayerReady(id, name);
                break;
            }

            case 'start-game':
                handleGameStart();
                break;

            case 'player-answer':
                handleOtherPlayersAnswer(parsed);
                break;

            case 'player-eliminated':
                handlePlayerEliminated(parsed);
                break;
        }
    }
}

// Handle player ready
function handlePlayerReady(playerId, name) {
    addPlayer(playerId, name);
    updatePlayersGrid();

    if (gameState.playerId === 'player-0' && gameState.players.length >= 6 && !gameState.gameStarted) {
        // Broadcast game start
        sendRequest('*broadcast-message*', ['start-game']);
        handleGameStart();
    }
}

// Handle game start
function handleGameStart() {
    console.log('🎮 handleGameStart called, gameStarted:', gameState.gameStarted, 'questionIndex:', gameState.currentQuestionIndex);

    gameState.gameStarted = true;

    // Prevent duplicate starts
    if (gameState.currentQuestionIndex > 0) {
        console.log('⏭️ Game already in progress (question > 0), ignoring');
        return;
    }

    console.log('✅ Starting game - showing countdown!');

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
    document.getElementById('question-number').textContent = ` ${index + 1}`;
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
function submitOwnAnswer() {
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

        // NO success feedback - keep them in suspense!
        // Just show that they answered
        showFeedback(`Antwort abgegeben (${gameState.timer.toFixed(1)}s)`, true);

        // Broadcast answer
        sendRequest('*broadcast-message*', ['player-answer', gameState.playerId, gameState.playerName, gameState.timer, gameState.currentQuestionIndex]);

        console.log('📡 Broadcasted my answer');

        // Disable submit button
        document.getElementById('submit-btn').disabled = true;

        // Go to waiting room immediately (no delay)
            showWaitingScreen();

        // Check if all answered (including me!)
        const activePlayers = gameState.players.filter(p => !p.eliminated);
        const answeredCount = Object.keys(gameState.playerAnswers).length;
        console.log('📊 Check: ' + answeredCount + '/' + activePlayers.length + ' players answered');

        if (answeredCount === activePlayers.length) {
            console.log('✅ ALL PLAYERS ANSWERED! Starting elimination...');
            // Wait so everyone is in waiting room, then find slowest
            setTimeout(() => {
                findAndEliminateSlowest();
            }, 2000); // 2 seconds - everyone should be in waiting room now
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
function handleOtherPlayersAnswer(arrayData) {
    const playerId = arrayData[1];
    const playerName = arrayData[2];
    const time = arrayData[3];
    const questionIndex = arrayData[4];

    console.log('📨 Received player-answer message:');
    console.log('   Player ID:', playerId);
    console.log('   My ID:', playerId);
    console.log('   Is from me?', playerId === gameState.playerId);

    // Don't process your own broadcasted answer again!
    if (playerId === gameState.playerId) {
        console.log('⏭️ Ignoring my own broadcasted answer');
        return;
    }

    console.log('✅ Player answered:', playerName, 'Time:', time + 's');

    // Store answer
    gameState.playerAnswers[playerId] = {
        time: time,
        name: playerName
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

    // Find slowest
    const slowest = answers.reduce((prev, curr) => {
        return curr[1].time > prev[1].time ? curr : prev;
    });

    const slowestId = slowest[0];
    const slowestPlayer = gameState.players.find(p => p.id === slowestId);

    console.log('💀 Slowest player:', slowestPlayer.name, 'Time:', slowest[1].time + 's');

    // Broadcast elimination
    sendRequest('*broadcast-message*', ['player-eliminated', slowestId, slowestPlayer.name, slowest[1].time]);

    // Handle locally
    handlePlayerEliminated([slowestId, slowestPlayer.name]);
}

// Handle player elimination
function handlePlayerEliminated(arrayData) {
    const playerId = arrayData[1];
    const playerName = arrayData[2];
    const time = arrayData[3];

    console.log('💀 Player eliminated:', playerName);

    // Mark player as eliminated
    const player = gameState.players.find(p => p.id === playerId);
    if (player) {
        player.eliminated = true;
    }

    // Check if I was eliminated
    if (playerId === gameState.playerId) {
        gameState.eliminated = true;
        gameState.gameOver = true; // Mark game as over for eliminated player

        // Show elimination in waiting room first
        document.getElementById('waiting-title').textContent = '💀 Eliminiert!';
        document.getElementById('status-text').textContent = `Du warst zu langsam (${time?.toFixed(1)}s)`;
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
    document.getElementById('waiting-title').textContent = '';
    document.getElementById('status-text').textContent = `${playerName} wurde eliminiert! (${time?.toFixed(1)}s)`;

    // Check remaining players
    const remaining = gameState.players.filter(p => !p.eliminated);

    console.log('👥 Remaining players:', remaining.length);

    if (remaining.length === 1) {
        // Only one left - winner!
        console.log('🏆 We have a winner!');
        gameState.gameOver = true; // Mark game as over

        // Show winner message
        document.getElementById('waiting-title').textContent = '🏆 Gewinner ermittelt!';
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
document.getElementById('submit-btn')?.addEventListener('click', submitOwnAnswer);

// Initialize on load
window.addEventListener('DOMContentLoaded', initGame);


