// WWM Battle Royale - Hauptspiellogik mit Fixes

const webRoomsWebSocketServerAddr = 'https://nosch.uber.space/web-rooms/';

// Game State
let gameState = {
    phase: 'waiting',
    currentQuestionIndex: 0,
    selectedAnswer: null,
    sortedItems: [],
    elapsedTime: 0, // Changed from timeLeft to elapsedTime
    players: [],
    myPlayerId: null,
    roomCode: null,
    playerName: null,
    answerSubmitted: false,
    timerInterval: null,
    isHost: false,
    answerTimes: {},
    waitingForPlayers: false
};

let socket = null;

function initGame() {
    console.log('🎮 Initializing game...');
    
    const urlParams = new URLSearchParams(window.location.search);
    gameState.roomCode = urlParams.get('room');
    gameState.playerName = urlParams.get('player') || 'Player';
    gameState.myPlayerId = parseInt(urlParams.get('playerId')) || Date.now();
    gameState.isHost = urlParams.get('isHost') === 'true';

    console.log('Room:', gameState.roomCode);
    console.log('Player:', gameState.playerName);
    console.log('Player ID:', gameState.myPlayerId);
    console.log('Is Host:', gameState.isHost ? '👑 YES' : '👤 NO');

    if (!gameState.roomCode) {
        alert('Kein Raum-Code gefunden! Zurück zur Lobby...');
        window.location.href = 'index.html';
        return;
    }

    gameState.players.push({
        id: gameState.myPlayerId,
        name: gameState.playerName,
        active: true,
        answerTime: null
    });

    initWebSocket();
    showWaitingScreen();
}

function initWebSocket() {
    socket = new WebSocket(webRoomsWebSocketServerAddr);

    socket.addEventListener('open', (event) => {
        console.log('✅ WebSocket connected');
        sendRequest('*enter-room*', `wwm-${gameState.roomCode}`);
        sendRequest('*subscribe-client-count*');
        
        broadcastMessage({
            type: 'game-player-ready',
            id: gameState.myPlayerId,
            name: gameState.playerName
        });
        
        // HOST starts game after 3 seconds
        if (gameState.isHost) {
            console.log('👑 I am HOST - Starting game in 3 seconds...');
            setTimeout(() => {
                console.log('👑 HOST: Broadcasting first question');
                startQuestion(0);
            }, 3000);
        } else {
            console.log('👤 I am PLAYER - Waiting for host...');
        }
        
        setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) socket.send('');
        }, 30000);
    });

    socket.addEventListener('message', (event) => {
        if (event.data.length > 0) {
            try {
                const incoming = JSON.parse(event.data);
                handleMessage(incoming);
            } catch (e) {
                console.warn('Failed to parse:', e);
            }
        }
    });

    socket.addEventListener('close', () => console.log('❌ WebSocket disconnected'));
}

function handleMessage(message) {
    if (!Array.isArray(message)) return;
    
    const [selector] = message;
    
    if (selector === '*client-id*' || selector === '*client-count*') return;

    if (typeof selector === 'string' && selector.startsWith('{')) {
        try {
            const data = JSON.parse(selector);
            
            switch(data.type) {
                case 'game-player-ready':
                    if (data.id !== gameState.myPlayerId) {
                        console.log('➕ Player joined:', data.name);
                        addPlayer(data);
                    }
                    break;
                    
                case 'start-question':
                    console.log('📝 Received question:', data.questionIndex);
                    if (!gameState.isHost) {
                        receiveQuestion(data.questionIndex);
                    }
                    break;
                    
                case 'player-answered':
                    console.log('✅ Player answered:', data.playerName, 'Time:', data.time.toFixed(2) + 's');
                    gameState.answerTimes[data.playerId] = {
                        name: data.playerName,
                        time: data.time
                    };
                    
                    if (gameState.isHost) {
                        checkIfAllAnswered();
                    }
                    break;
                    
                case 'player-eliminated':
                    console.log('💀 Player eliminated:', data.playerName, '(Time:', data.time.toFixed(2) + 's)');
                    eliminatePlayer(data.playerId, data.playerName);
                    break;
                    
                case 'game-over':
                    console.log('🏆 Game over! Winner:', data.winnerName);
                    if (data.winnerId === gameState.myPlayerId) {
                        showWinnerScreen();
                    }
                    break;
            }
        } catch (e) {
            console.warn('Parse error:', e);
        }
    }
}

function broadcastMessage(data) {
    sendRequest('*broadcast-message*', JSON.stringify(data));
}

function sendRequest(...message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    }
}

function addPlayer(playerData) {
    if (!gameState.players.find(p => p.id === playerData.id)) {
        gameState.players.push({
            id: playerData.id,
            name: playerData.name,
            active: true,
            answerTime: null
        });
        updatePlayersDisplay();
        updateAFrameScene();
    }
}

function startQuestion(questionIndex) {
    if (!gameState.isHost) return;
    
    console.log('👑 HOST: Starting question', questionIndex);
    
    const activePlayers = gameState.players.filter(p => p.active);
    
    if (activePlayers.length <= 1) {
        const winner = activePlayers[0];
        console.log('🏆 WINNER:', winner?.name || 'Unknown');
        
        broadcastMessage({
            type: 'game-over',
            winnerId: winner?.id,
            winnerName: winner?.name
        });
        
        if (winner && winner.id === gameState.myPlayerId) {
            showWinnerScreen();
        }
        return;
    }
    
    if (questionIndex >= QUESTIONS.length) {
        const winner = activePlayers[0];
        broadcastMessage({
            type: 'game-over',
            winnerId: winner?.id,
            winnerName: winner?.name
        });
        
        if (winner && winner.id === gameState.myPlayerId) {
            showWinnerScreen();
        }
        return;
    }
    
    gameState.answerTimes = {};
    gameState.waitingForPlayers = true;
    
    broadcastMessage({
        type: 'start-question',
        questionIndex: questionIndex
    });
    
    receiveQuestion(questionIndex);
}

function receiveQuestion(questionIndex) {
    console.log('📝 Showing question', questionIndex);
    
    gameState.currentQuestionIndex = questionIndex;
    gameState.phase = 'question';
    gameState.selectedAnswer = null;
    gameState.sortedItems = [];
    gameState.elapsedTime = 0; // Reset elapsed time
    gameState.answerSubmitted = false;

    const question = getQuestion(questionIndex);
    
    document.getElementById('waiting-screen').classList.add('hidden');
    document.getElementById('question-screen').classList.remove('hidden');
    document.getElementById('eliminated-screen').classList.add('hidden');
    document.getElementById('winner-screen').classList.add('hidden');

    document.getElementById('question-number').textContent = questionIndex + 1;
    document.getElementById('players-left').textContent = gameState.players.filter(p => p.active).length;
    document.getElementById('question-text').textContent = question.question;
    document.getElementById('message-container').innerHTML = '';
    document.getElementById('submit-btn').disabled = false;

    // Update timer display
    const timerElement = document.getElementById('timer');
    timerElement.textContent = '0';
    timerElement.classList.remove('warning');

    if (question.type === 'multiple-choice') {
        displayMultipleChoice(question);
    } else {
        displaySortingQuestion(question);
    }

    startTimer();
}

function displayMultipleChoice(question) {
    const answersContainer = document.getElementById('answers-container');
    const sortingContainer = document.getElementById('sorting-container');
    
    answersContainer.classList.remove('hidden');
    sortingContainer.classList.add('hidden');
    answersContainer.innerHTML = '';

    question.answers.forEach((answer, index) => {
        const button = document.createElement('button');
        button.className = 'answer-btn';
        button.innerHTML = `
            <span class="answer-letter">${String.fromCharCode(65 + index)}:</span>
            ${answer}
        `;
        button.onclick = () => selectAnswer(index);
        answersContainer.appendChild(button);
    });
}

function displaySortingQuestion(question) {
    const answersContainer = document.getElementById('answers-container');
    const sortingContainer = document.getElementById('sorting-container');
    
    answersContainer.classList.add('hidden');
    sortingContainer.classList.remove('hidden');
    sortingContainer.innerHTML = '';

    gameState.sortedItems = [...question.items];

    gameState.sortedItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'sortable-item';
        div.draggable = true;
        div.dataset.index = index;
        div.innerHTML = `
            <div class="sort-number">${index + 1}</div>
            <div class="sort-text">${item}</div>
        `;

        div.addEventListener('dragstart', handleDragStart);
        div.addEventListener('dragover', handleDragOver);
        div.addEventListener('drop', handleDrop);
        div.addEventListener('dragend', handleDragEnd);

        sortingContainer.appendChild(div);
    });

    const hint = document.createElement('div');
    hint.className = 'sorting-hint';
    hint.textContent = 'Ziehe die Antworten in die richtige Reihenfolge';
    sortingContainer.appendChild(hint);
}

let draggedElement = null;

function handleDragStart(e) {
    draggedElement = e.target.closest('.sortable-item');
    draggedElement.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    const container = e.currentTarget.parentElement;
    const afterElement = getDragAfterElement(container, e.clientY);
    const dragging = document.querySelector('.dragging');
    
    if (afterElement == null) {
        container.appendChild(dragging);
    } else {
        container.insertBefore(dragging, afterElement);
    }
}

function handleDrop(e) {
    e.preventDefault();
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    
    const sortingContainer = document.getElementById('sorting-container');
    const items = Array.from(sortingContainer.querySelectorAll('.sortable-item'));
    const question = getQuestion(gameState.currentQuestionIndex);
    
    gameState.sortedItems = items.map(item => {
        const text = item.querySelector('.sort-text').textContent;
        return question.items.find(i => i === text);
    });

    items.forEach((item, index) => {
        item.querySelector('.sort-number').textContent = index + 1;
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.sortable-item:not(.dragging)')];

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

function selectAnswer(index) {
    if (gameState.answerSubmitted) return;
    gameState.selectedAnswer = index;

    const buttons = document.querySelectorAll('.answer-btn');
    buttons.forEach((btn, i) => {
        btn.classList.toggle('selected', i === index);
    });
}

function submitAnswer() {
    if (gameState.answerSubmitted) return;

    const question = getQuestion(gameState.currentQuestionIndex);
    const answerTime = gameState.elapsedTime; // Use elapsed time instead
    let isCorrect = false;

    if (question.type === 'multiple-choice') {
        if (gameState.selectedAnswer === null) return;
        isCorrect = gameState.selectedAnswer === question.correct;
    } else {
        const sortedIndices = gameState.sortedItems.map(item => question.items.indexOf(item));
        isCorrect = JSON.stringify(sortedIndices) === JSON.stringify(question.correct);
    }

    if (isCorrect) {
        gameState.answerSubmitted = true;
        stopTimer();
        showMessage('success', `✓ Richtig in ${answerTime.toFixed(2)}s! Warte auf andere Spieler...`);
        document.getElementById('submit-btn').disabled = true;

        broadcastMessage({
            type: 'player-answered',
            playerId: gameState.myPlayerId,
            playerName: gameState.playerName,
            time: answerTime
        });

        gameState.answerTimes[gameState.myPlayerId] = {
            name: gameState.playerName,
            time: answerTime
        };

        if (gameState.isHost) {
            checkIfAllAnswered();
        }
    } else {
        showMessage('error', '✗ Falsche Antwort! Versuche es erneut...');
        
        if (question.type === 'multiple-choice') {
            gameState.selectedAnswer = null;
            document.querySelectorAll('.answer-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
        }
    }
}

function checkIfAllAnswered() {
    if (!gameState.isHost) return;
    
    const activePlayers = gameState.players.filter(p => p.active);
    const answeredCount = Object.keys(gameState.answerTimes).length;
    
    console.log(`📊 Answered: ${answeredCount}/${activePlayers.length}`);
    
    if (answeredCount >= activePlayers.length) {
        console.log('✅ All players answered!');
        processElimination();
    }
}

function processElimination() {
    if (!gameState.isHost) return;
    
    console.log('⚔️ Processing elimination...');
    console.log('Answer times:', gameState.answerTimes);
    
    let slowestPlayer = null;
    let slowestTime = -1;
    
    for (const playerId in gameState.answerTimes) {
        const data = gameState.answerTimes[playerId];
        if (data.time > slowestTime) {
            slowestTime = data.time;
            slowestPlayer = { id: parseInt(playerId), ...data };
        }
    }
    
    console.log('💀 Slowest player:', slowestPlayer?.name, 'Time:', slowestTime.toFixed(2) + 's');
    
    if (slowestPlayer) {
        broadcastMessage({
            type: 'player-eliminated',
            playerId: slowestPlayer.id,
            playerName: slowestPlayer.name,
            time: slowestPlayer.time
        });
        
        eliminatePlayer(slowestPlayer.id, slowestPlayer.name);
        
        setTimeout(() => {
            const nextIndex = gameState.currentQuestionIndex + 1;
            console.log('👑 HOST: Moving to question', nextIndex);
            startQuestion(nextIndex);
        }, 5000);
    } else {
        console.error('❌ No slowest player found! This should not happen.');
    }
}

function eliminatePlayer(playerId, playerName) {
    const player = gameState.players.find(p => p.id === playerId);
    if (player) {
        player.active = false;
        console.log('💀 Eliminated:', playerName);
    }
    
    if (playerId === gameState.myPlayerId) {
        setTimeout(() => {
            showEliminatedScreen();
        }, 2000);
    } else {
        showWaitingScreen(playerName);
    }
}

function startTimer() {
    const timerElement = document.getElementById('timer');
    
    gameState.timerInterval = setInterval(() => {
        gameState.elapsedTime += 0.1; // Count up in 0.1s increments
        timerElement.textContent = gameState.elapsedTime.toFixed(1);
    }, 100);
}

function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}

function showMessage(type, text) {
    const container = document.getElementById('message-container');
    container.innerHTML = `<div class="message-box ${type}">${text}</div>`;

    if (type === 'error') {
        setTimeout(() => container.innerHTML = '', 2000);
    }
}

function showWaitingScreen(eliminatedPlayerName = null) {
    gameState.phase = 'waiting';
    
    document.getElementById('question-screen').classList.add('hidden');
    document.getElementById('waiting-screen').classList.remove('hidden');
    document.getElementById('eliminated-screen').classList.add('hidden');
    document.getElementById('winner-screen').classList.add('hidden');
    
    const title = document.getElementById('waiting-title');
    const message = document.getElementById('eliminated-message');
    
    if (eliminatedPlayerName) {
        title.textContent = 'Spieler wurde eliminiert!';
        message.textContent = `${eliminatedPlayerName} war zu langsam und wurde eliminiert.`;
    } else {
        title.textContent = 'Warte auf nächste Frage...';
        message.textContent = '';
    }

    updatePlayersDisplay();
    updateAFrameScene();
}

function updatePlayersDisplay() {
    const playersGrid = document.getElementById('players-grid');
    if (!playersGrid) return;
    
    playersGrid.innerHTML = '';

    gameState.players.forEach(player => {
        const card = document.createElement('div');
        card.className = `player-card ${player.active ? '' : 'eliminated'}`;
        card.innerHTML = `
            <div class="player-name">${player.name}</div>
            <div style="margin-top: 10px; opacity: 0.7;">
                ${player.active ? '✓ Aktiv' : '✗ Eliminiert'}
            </div>
        `;
        playersGrid.appendChild(card);
    });

    const leftCount = gameState.players.filter(p => p.active).length;
    document.getElementById('players-left').textContent = leftCount;
}

function updateAFrameScene() {
    const container = document.getElementById('player-names');
    if (!container) return;
    
    container.innerHTML = '';

    const activePlayers = gameState.players.filter(p => p.active);
    const radius = 3;
    const angleStep = (2 * Math.PI) / Math.max(activePlayers.length, 1);

    activePlayers.forEach((player, index) => {
        const angle = index * angleStep;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius - 5;

        const textEntity = document.createElement('a-text');
        textEntity.setAttribute('value', player.name);
        textEntity.setAttribute('position', `${x} ${1.6} ${z}`);
        textEntity.setAttribute('align', 'center');
        textEntity.setAttribute('color', player.id === gameState.myPlayerId ? '#ffd700' : '#ffffff');
        textEntity.setAttribute('width', '6');
        
        container.appendChild(textEntity);
    });
}

function showEliminatedScreen() {
    document.getElementById('question-screen').classList.add('hidden');
    document.getElementById('waiting-screen').classList.add('hidden');
    document.getElementById('winner-screen').classList.add('hidden');
    document.getElementById('eliminated-screen').classList.remove('hidden');
}

function showWinnerScreen() {
    document.getElementById('question-screen').classList.add('hidden');
    document.getElementById('waiting-screen').classList.add('hidden');
    document.getElementById('eliminated-screen').classList.add('hidden');
    document.getElementById('winner-screen').classList.remove('hidden');
}

window.addEventListener('DOMContentLoaded', initGame);