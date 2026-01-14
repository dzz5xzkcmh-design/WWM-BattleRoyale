// Quiz Royale - Gamemaster Architecture
// Host controls everything, other players just respond

const gameState = {
    roomCode: '',
    playerName: '',
    playerId: null,
    isHost: false,
    maxPlayers: 2,
    players: [],
    
    // Game state
    currentQuestion: null,
    currentQuestionIndex: 0,
    playerAnswers: {},
    
    // Timer
    timer: 0,
    timerInterval: null,
    
    // Flags
    eliminated: false,
    gameOver: false,
    myAnswerTime: null
};

let socket = null;
let keepAliveInterval = null;

// Initialize game
function initGame() {
    console.log('🎮 Initializing game...');
    
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    gameState.roomCode = urlParams.get('room');
    gameState.playerName = urlParams.get('player');
    gameState.playerId = parseInt(urlParams.get('playerId'));
    gameState.isHost = urlParams.get('isHost') === 'true';
    gameState.maxPlayers = parseInt(urlParams.get('maxPlayers'));
    
    try {
        gameState.players = JSON.parse(urlParams.get('players'));
    } catch (e) {
        console.error('Error parsing players');
        gameState.players = [];
    }
    
    console.log('👑 Is Host:', gameState.isHost);
    console.log('👥 Players:', gameState.players.length);
    
    // Update UI
    document.getElementById('player-name-display').textContent = gameState.playerName;
    document.getElementById('players-left').textContent = gameState.players.length;
    
    // Connect to WebSocket
    connectWebSocket();
    
    // Update players grid
    updatePlayersGrid();
}

// WebSocket Connection
function connectWebSocket() {
    console.log('🔌 Connecting to WebSocket...');
    
    socket = new WebSocket('wss://nosch.uber.space/web-rooms/');
    
    socket.addEventListener('open', () => {
        console.log('✅ WebSocket connected');
        
        // Join room
        socket.send(JSON.stringify(['join', gameState.roomCode]));
        
        // If host, start game after 3 seconds
        if (gameState.isHost) {
            console.log('👑 I am the Gamemaster - starting game...');
            setTimeout(() => {
                startGameAsHost();
            }, 2000);
        } else {
            console.log('👤 I am a player - waiting for host...');
            document.getElementById('status-text').textContent = 'Warte auf Host...';
        }
        
        // Keep-alive
        keepAliveInterval = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(['*ping*']));
            }
        }, 30000);
    });
    
    socket.addEventListener('message', (event) => {
        handleMessage(event.data);
    });
    
    socket.addEventListener('close', () => {
        console.log('🔌 WebSocket closed');
        clearInterval(keepAliveInterval);
        
        // If host disconnected, end game for everyone
        if (gameState.isHost) {
            // Host left - game over
        } else {
            // Try to reconnect
            setTimeout(() => connectWebSocket(), 2000);
        }
    });
}

function sendRequest(selector, ...args) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify([selector, ...args]));
    }
}

// Handle WebSocket messages
function handleMessage(data) {
    try {
        const parsed = JSON.parse(data);
        
        // Handle broadcast
        if (Array.isArray(parsed) && parsed.length === 1 && typeof parsed[0] === 'string') {
            const message = JSON.parse(parsed[0]);
            handleGameMessage(message);
        } else if (Array.isArray(parsed) && parsed.length > 1) {
            const [selector, ...args] = parsed;
            if (args.length > 0) {
                const message = JSON.parse(args[0]);
                handleGameMessage(message);
            }
        }
    } catch (e) {
        // Ignore
    }
}

function handleGameMessage(message) {
    console.log('📨', message.type);
    
    switch (message.type) {
        case 'host-question':
            // Host sent a question
            if (!gameState.isHost) {
                receiveQuestion(message);
            }
            break;
            
        case 'player-answer':
            // Player sent an answer (only host receives this)
            if (gameState.isHost) {
                receivePlayerAnswer(message);
            }
            break;
            
        case 'host-elimination':
            // Host eliminated someone
            if (!gameState.isHost) {
                handleElimination(message);
            }
            break;
            
        case 'host-winner':
            // Host declared winner
            if (!gameState.isHost) {
                showWinner();
            }
            break;
            
        case 'host-disconnected':
            // Host left - game over
            showHostDisconnected();
            break;
    }
}

// ========================================
// GAMEMASTER (HOST) FUNCTIONS
// ========================================

function startGameAsHost() {
    console.log('🎮 Gamemaster starting game!');
    
    showCountdown(3, () => {
        distributeNextQuestion();
    });
}

function distributeNextQuestion() {
    if (!gameState.isHost) return;
    
    const questionIndex = gameState.currentQuestionIndex;
    
    // Check if game over
    if (questionIndex >= QUESTIONS.length) {
        console.log('🏁 No more questions');
        declareWinner();
        return;
    }
    
    // Check if only 1 player left
    const activePlayers = gameState.players.filter(p => !p.eliminated);
    if (activePlayers.length === 1) {
        console.log('🏆 Winner found!');
        declareWinner();
        return;
    }
    
    const question = QUESTIONS[questionIndex];
    gameState.currentQuestion = question;
    gameState.currentQuestionIndex++;
    gameState.playerAnswers = {};
    
    console.log(`📤 Distributing question ${questionIndex + 1}:`, question.question);
    
    // Broadcast question to all players
    sendRequest('*broadcast-message*', JSON.stringify({
        type: 'host-question',
        questionIndex: questionIndex,
        question: question.question,
        answers: question.answers,
        questionNumber: questionIndex + 1
    }));
    
    // Show question to myself
    showQuestion(question, questionIndex + 1);
    startTimer();
}

function receivePlayerAnswer(data) {
    if (!gameState.isHost) return;
    
    console.log(`📨 Answer from ${data.playerName}: ${data.time}s`);
    
    // Store answer
    gameState.playerAnswers[data.playerId] = {
        name: data.playerName,
        time: data.time,
        answer: data.answer
    };
    
    // Check if all answered
    const activePlayers = gameState.players.filter(p => !p.eliminated);
    const answeredCount = Object.keys(gameState.playerAnswers).length;
    
    console.log(`📊 Answers: ${answeredCount}/${activePlayers.length}`);
    
    // Update waiting screen
    document.getElementById('status-text').textContent = 
        `${answeredCount}/${activePlayers.length} Spieler haben geantwortet`;
    
    if (answeredCount >= activePlayers.length) {
        console.log('✅ All players answered!');
        stopTimer();
        
        // Wait 2 seconds, then eliminate slowest
        setTimeout(() => {
            eliminateSlowest();
        }, 2000);
    }
}

function eliminateSlowest() {
    if (!gameState.isHost) return;
    
    const answers = Object.entries(gameState.playerAnswers);
    if (answers.length === 0) return;
    
    // Find slowest
    const slowest = answers.reduce((prev, curr) => {
        return curr[1].time > prev[1].time ? curr : prev;
    });
    
    const slowestId = parseInt(slowest[0]);
    const slowestPlayer = gameState.players.find(p => p.id === slowestId);
    slowestPlayer.eliminated = true;
    
    console.log(`💀 Eliminating: ${slowestPlayer.name} (${slowest[1].time}s)`);
    
    // Broadcast elimination
    sendRequest('*broadcast-message*', JSON.stringify({
        type: 'host-elimination',
        playerId: slowestId,
        playerName: slowestPlayer.name,
        time: slowest[1].time
    }));
    
    // Handle locally
    showEliminationMessage(slowestPlayer.name, slowest[1].time);
    
    // Check if I was eliminated
    if (slowestId === gameState.playerId) {
        setTimeout(() => {
            showEliminatedScreen();
        }, 4000);
        return;
    }
    
    // Wait 3 seconds, then next question
    setTimeout(() => {
        // Check if winner
        const remaining = gameState.players.filter(p => !p.eliminated);
        if (remaining.length === 1) {
            declareWinner();
        } else {
            showCountdown(3, () => {
                distributeNextQuestion();
            });
        }
    }, 3000);
}

function declareWinner() {
    if (!gameState.isHost) return;
    
    gameState.gameOver = true;
    
    // Broadcast winner
    sendRequest('*broadcast-message*', JSON.stringify({
        type: 'host-winner'
    }));
    
    // Show locally
    const remaining = gameState.players.filter(p => !p.eliminated);
    if (remaining.length === 1 && remaining[0].id === gameState.playerId) {
        showWinner();
    }
}

// ========================================
// PLAYER FUNCTIONS
// ========================================

function receiveQuestion(data) {
    console.log(`📥 Received question ${data.questionNumber}`);
    
    gameState.currentQuestion = {
        type: 'multiple',
        question: data.question,
        answers: data.answers
    };
    
    showQuestion(gameState.currentQuestion, data.questionNumber);
    startTimer();
}

function submitAnswer() {
    const selected = document.querySelector('.answer-option.selected');
    if (!selected) {
        alert('Bitte wähle eine Antwort!');
        return;
    }
    
    const answerIndex = parseInt(selected.dataset.index);
    const time = gameState.timer;
    
    stopTimer();
    gameState.myAnswerTime = time;
    
    console.log(`✅ Submitting answer: ${answerIndex} at ${time}s`);
    
    // Show feedback
    showFeedback(`Antwort abgegeben (${time.toFixed(1)}s)`, true);
    
    // Send to host
    sendRequest('*broadcast-message*', JSON.stringify({
        type: 'player-answer',
        playerId: gameState.playerId,
        playerName: gameState.playerName,
        answer: answerIndex,
        time: time
    }));
    
    // Disable submit
    document.getElementById('submit-btn').disabled = true;
    
    // Go to waiting room
    setTimeout(() => {
        showWaitingScreen();
    }, 800);
}

function handleElimination(data) {
    console.log(`💀 ${data.playerName} eliminated`);
    
    // Mark player as eliminated
    const player = gameState.players.find(p => p.id === data.playerId);
    if (player) {
        player.eliminated = true;
    }
    
    showEliminationMessage(data.playerName, data.time);
    
    // Check if I was eliminated
    if (data.playerId === gameState.playerId) {
        gameState.eliminated = true;
        gameState.gameOver = true;
        setTimeout(() => {
            showEliminatedScreen();
        }, 4000);
    }
}

// ========================================
// UI FUNCTIONS
// ========================================

function showQuestion(question, questionNumber) {
    document.getElementById('question-screen').classList.remove('hidden');
    document.getElementById('waiting-screen').classList.add('hidden');
    
    document.getElementById('question-number').textContent = questionNumber;
    document.getElementById('question-text').textContent = question.question;
    document.getElementById('feedback').style.display = 'none';
    document.getElementById('submit-btn').disabled = false;
    
    // Create answers
    const container = document.getElementById('answers-container');
    container.innerHTML = '';
    container.className = 'answers-grid';
    
    question.answers.forEach((answer, index) => {
        const btn = document.createElement('button');
        btn.className = 'answer-option';
        btn.dataset.index = index;
        btn.textContent = answer;
        
        btn.addEventListener('click', () => {
            document.querySelectorAll('.answer-option').forEach(b => 
                b.classList.remove('selected')
            );
            btn.classList.add('selected');
        });
        
        container.appendChild(btn);
    });
}

function showWaitingScreen() {
    document.getElementById('question-screen').classList.add('hidden');
    document.getElementById('waiting-screen').classList.remove('hidden');
    
    if (gameState.isHost) {
        const activePlayers = gameState.players.filter(p => !p.eliminated);
        const answeredCount = Object.keys(gameState.playerAnswers).length;
        document.getElementById('status-text').textContent = 
            `Warte auf Antworten... (${answeredCount}/${activePlayers.length})`;
    } else {
        document.getElementById('status-text').textContent = 
            'Warte auf andere Spieler...';
    }
    
    updatePlayersGrid();
}

function showEliminationMessage(playerName, time) {
    document.getElementById('waiting-screen').classList.remove('hidden');
    document.getElementById('question-screen').classList.add('hidden');
    
    document.getElementById('waiting-title').textContent = 'Spieler eliminiert!';
    document.getElementById('status-text').textContent = 
        `${playerName} wurde eliminiert! (${time.toFixed(1)}s)`;
    
    updatePlayersGrid();
}

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
    
    countdownElement.textContent = count;
}

function showFeedback(message, isCorrect) {
    const feedback = document.getElementById('feedback');
    feedback.textContent = message;
    feedback.className = isCorrect ? 'correct' : 'incorrect';
    feedback.style.display = 'block';
}

function updatePlayersGrid() {
    const container = document.getElementById('players-container');
    container.innerHTML = '';
    
    gameState.players.forEach(player => {
        const card = document.createElement('div');
        card.className = 'player-card';
        
        if (player.id === gameState.playerId) {
            card.classList.add('player-you');
        }
        
        if (player.eliminated) {
            card.classList.add('player-eliminated');
        }
        
        const name = document.createElement('div');
        name.className = 'player-name';
        name.textContent = player.name;
        
        const status = document.createElement('div');
        status.className = 'player-status';
        status.textContent = player.eliminated ? 'Eliminiert' : 'Aktiv';
        
        if (player.id === gameState.playerId && !player.eliminated) {
            const badge = document.createElement('div');
            badge.className = 'player-badge';
            badge.textContent = 'DU';
            card.appendChild(badge);
        }
        
        card.appendChild(name);
        card.appendChild(status);
        container.appendChild(card);
    });
    
    // Update counter
    const activePlayers = gameState.players.filter(p => !p.eliminated);
    document.getElementById('players-left').textContent = activePlayers.length;
}

// Timer
function startTimer() {
    gameState.timer = 0;
    
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    gameState.timerInterval = setInterval(() => {
        gameState.timer += 0.1;
        document.getElementById('timer').textContent = gameState.timer.toFixed(1) + 's';
    }, 100);
}

function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}

// End screens
function showEliminatedScreen() {
    stopTimer();
    document.getElementById('question-screen').classList.add('hidden');
    document.getElementById('waiting-screen').classList.add('hidden');
    document.getElementById('eliminated-screen').classList.remove('hidden');
}

function showWinner() {
    stopTimer();
    gameState.gameOver = true;
    
    const remaining = gameState.players.filter(p => !p.eliminated);
    if (remaining.length === 1 && remaining[0].id === gameState.playerId) {
        document.getElementById('question-screen').classList.add('hidden');
        document.getElementById('waiting-screen').classList.add('hidden');
        document.getElementById('winner-screen').classList.remove('hidden');
    }
}

function showHostDisconnected() {
    document.getElementById('question-screen').classList.add('hidden');
    document.getElementById('waiting-screen').classList.remove('hidden');
    document.getElementById('waiting-title').textContent = '⚠️ Host Disconnected';
    document.getElementById('status-text').textContent = 
        'Der Host hat das Spiel verlassen. Spiel beendet.';
}

// Event listeners
document.getElementById('submit-btn')?.addEventListener('click', submitAnswer);

// Initialize on load
window.addEventListener('DOMContentLoaded', initGame);