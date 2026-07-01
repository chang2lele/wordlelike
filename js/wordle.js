const WORDS = [
    'WORLD', 'HAPPY', 'HOUSE', 'MONEY', 'MUSIC', 'POWER', 'PEACE', 'DREAM',
    'HEART', 'BRAIN', 'LIGHT', 'OCEAN', 'CLOUD', 'STONE', 'GRASS', 'LEMON',
    'APPLE', 'BERRY', 'MANGO', 'PEACH', 'QUEEN', 'ROBOT', 'TIGER', 'UNCLE',
    'VEGAS', 'WITCH', 'PIXEL', 'CANDY', 'DAISY', 'ELBOW', 'FLAME', 'GRAPE',
    'JUICE', 'KAYAK', 'LEMUR', 'NOVEL', 'OTTER', 'PIANO', 'RIVER', 'SUGAR',
    'TOWER', 'VIPER', 'WATER', 'BASIC', 'CLONE', 'DRIVE', 'EAGLE', 'FROST',
    'GLOBE', 'HUMAN', 'IMAGE', 'JOKER', 'KNIFE', 'LUNAR', 'MAGIC', 'NIGHT',
    'OPERA', 'PHONE', 'QUIET', 'ROBIN', 'SOLAR', 'TABLE', 'ULTRA', 'VOICE',
    'WASTE', 'XENON', 'YACHT', 'ZEBRA', 'ALPHA', 'BLOOM', 'CHESS', 'DELTA',
];

const TARGET = WORDS[Math.floor(Math.random() * WORDS.length)];
const MAX_ATTEMPTS = 6;
let currentRow = 0;
let currentTile = 0;
let gameOver = false;

const board = document.getElementById('board');
const keyboard = document.getElementById('keyboard');
const message = document.getElementById('message');

// Create board
for (let r = 0; r < MAX_ATTEMPTS; r++) {
    const row = document.createElement('div');
    row.className = 'row';
    row.id = `row-${r}`;
    for (let c = 0; c < 5; c++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.id = `tile-${r}-${c}`;
        row.appendChild(tile);
    }
    board.appendChild(row);
}

// Create keyboard
const keys = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['Enter','Z','X','C','V','B','N','M','Backspace']
];
keys.forEach(row => {
    const div = document.createElement('div');
    div.className = 'kb-row';
    row.forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'kb-key' + (key.length > 1 ? ' wide' : '');
        btn.textContent = key;
        btn.dataset.key = key;
        btn.addEventListener('click', () => handleKey(key));
        div.appendChild(btn);
    });
    keyboard.appendChild(div);
});

// Focus row
function updateActiveTile() {
    document.querySelectorAll('.tile').forEach(t => t.classList.remove('active'));
    if (!gameOver && currentRow < MAX_ATTEMPTS) {
        const tile = document.getElementById(`tile-${currentRow}-${currentTile}`);
        if (tile) tile.classList.add('active');
    }
}
updateActiveTile();

function handleKey(key) {
    if (gameOver) return;
    
    if (key === 'Enter') {
        submitGuess();
    } else if (key === 'Backspace') {
        if (currentTile > 0) {
            currentTile--;
            const tile = document.getElementById(`tile-${currentRow}-${currentTile}`);
            tile.textContent = '';
        }
        updateActiveTile();
    } else if (currentTile < 5) {
        const tile = document.getElementById(`tile-${currentRow}-${currentTile}`);
        tile.textContent = key;
        currentTile++;
        updateActiveTile();
    }
}

function submitGuess() {
    if (currentTile !== 5) {
        showMessage('Not enough letters', '');
        return;
    }
    
    let guess = '';
    for (let c = 0; c < 5; c++) {
        guess += document.getElementById(`tile-${currentRow}-${c}`).textContent;
    }
    
    if (!WORDS.includes(guess) && guess !== TARGET) {
        showMessage('Not in word list', '');
        return;
    }
    
    const targetArr = TARGET.split('');
    const result = [null, null, null, null, null];
    
    // First pass: exact matches
    for (let i = 0; i < 5; i++) {
        if (guess[i] === targetArr[i]) {
            result[i] = 'correct';
            targetArr[i] = null;
        }
    }
    // Second pass: present but wrong position
    for (let i = 0; i < 5; i++) {
        if (result[i] === 'correct') continue;
        const idx = targetArr.indexOf(guess[i]);
        if (idx !== -1) {
            result[i] = 'present';
            targetArr[idx] = null;
        } else {
            result[i] = 'absent';
        }
    }
    
    // Animate tiles
    const rowTiles = document.querySelectorAll(`#row-${currentRow} .tile`);
    rowTiles.forEach((tile, i) => {
        setTimeout(() => {
            tile.classList.add(result[i]);
        }, i * 200);
    });
    
    // Update keyboard
    document.querySelectorAll('.kb-key').forEach(btn => {
        const key = btn.dataset.key;
        if (!key) return;
        for (let i = 0; i < 5; i++) {
            if (guess[i] === key) {
                if (result[i] === 'correct') btn.className = 'kb-key correct';
                else if (result[i] === 'present' && !btn.classList.contains('correct'))
                    btn.className = 'kb-key present';
                else if (result[i] === 'absent' && !btn.classList.contains('correct') && !btn.classList.contains('present'))
                    btn.className = 'kb-key absent';
            }
        }
    });
    
    // Check win
    if (result.every(r => r === 'correct')) {
        gameOver = true;
        setTimeout(() => showMessage('🎉 You got it!', 'win'), 1000);
        return;
    }
    
    currentRow++;
    currentTile = 0;
    
    if (currentRow >= MAX_ATTEMPTS) {
        gameOver = true;
        setTimeout(() => showMessage(`😔 The word was ${TARGET}`, 'lose'), 500);
    }
    
    updateActiveTile();
}

function showMessage(msg, type) {
    message.textContent = msg;
    message.className = type;
    if (!type) setTimeout(() => { message.textContent = ''; message.className = ''; }, 2000);
}

// Keyboard input
document.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleKey('Enter');
    else if (e.key === 'Backspace') handleKey('Backspace');
    else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase());
});

// New game
document.getElementById('new-game-btn').addEventListener('click', () => {
    location.reload();
});

console.log('Answer:', TARGET);
