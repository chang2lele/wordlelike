let TARGET = 'WORLD';
const MAX_ATTEMPTS = 6;
let currentRow = 0;
let currentTile = 0;
let gameOver = false;

const board = document.getElementById('board');
const keyboard = document.getElementById('keyboard');
const message = document.getElementById('message');

// Build board
for (let r = 0; r < MAX_ATTEMPTS; r++) {
    const row = document.createElement('div');
    row.className = 'row'; row.id = `row-${r}`;
    for (let c = 0; c < 5; c++) {
        const tile = document.createElement('div');
        tile.className = 'tile'; tile.id = `tile-${r}-${c}`;
        row.appendChild(tile);
    }
    board.appendChild(row);
}

// Build keyboard
[
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Enter','Z','X','C','V','B','N','M','Backspace']
].forEach(row => {
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

function updateActiveTile() {
    document.querySelectorAll('.tile').forEach(t => t.classList.remove('active'));
    if (!gameOver && currentRow < MAX_ATTEMPTS) {
        const tile = document.getElementById(`tile-${currentRow}-${currentTile}`);
        if (tile) tile.classList.add('active');
    }
}

function handleKey(key) {
    if (gameOver) return;
    if (key === 'Enter') { submitGuess(); return; }
    if (key === 'Backspace') {
        if (currentTile > 0) {
            currentTile--;
            document.getElementById(`tile-${currentRow}-${currentTile}`).textContent = '';
        }
        updateActiveTile();
        return;
    }
    if (currentTile < 5) {
        document.getElementById(`tile-${currentRow}-${currentTile}`).textContent = key;
        currentTile++;
        updateActiveTile();
    }
}

function submitGuess() {
    if (currentTile !== 5) { showMessage('Not enough letters', ''); return; }
    
    let guess = '';
    for (let c = 0; c < 5; c++) {
        guess += document.getElementById(`tile-${currentRow}-${c}`).textContent;
    }
    
    const targetArr = TARGET.split('');
    const result = [null, null, null, null, null];
    
    for (let i = 0; i < 5; i++) {
        if (guess[i] === targetArr[i]) { result[i] = 'correct'; targetArr[i] = null; }
    }
    for (let i = 0; i < 5; i++) {
        if (result[i] === 'correct') continue;
        const idx = targetArr.indexOf(guess[i]);
        if (idx !== -1) { result[i] = 'present'; targetArr[idx] = null; }
        else { result[i] = 'absent'; }
    }
    
    // Apply colors to tiles
    document.querySelectorAll(`#row-${currentRow} .tile`).forEach((tile, i) => {
        tile.classList.add(result[i]);
    });
    
    // Update keyboard colors
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
    
    // Show result
    if (result.every(r => r === 'correct')) {
        gameOver = true;
        showMessage('🎉 You got it!', 'win');
        return;
    }
    
    currentRow++; currentTile = 0;
    if (currentRow >= MAX_ATTEMPTS) {
        gameOver = true;
        showMessage(`😔 The word was ${TARGET}`, 'lose');
    }
    updateActiveTile();
}

function showMessage(msg, type) {
    message.textContent = msg;
    message.className = type;
}

document.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleKey('Enter');
    else if (e.key === 'Backspace') handleKey('Backspace');
    else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase());
});

document.getElementById('new-game-btn').addEventListener('click', () => location.reload());

// Load daily puzzle
(async function() {
    try {
        const resp = await fetch('/data/latest.json');
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();
        const wordle = data.puzzles.find(p => p.type === 'wordle');
        if (wordle && wordle.answer && wordle.answer.length === 5) {
            TARGET = wordle.answer.toUpperCase();
            document.querySelector('#game-header h3').textContent = `WordleLike Daily — ${wordle.date}`;
            if (wordle.clues && wordle.clues[0]) {
                const clueEl = document.createElement('p');
                clueEl.style.cssText = 'text-align:center;color:#636e72;font-size:0.85rem;margin-bottom:10px;';
                clueEl.textContent = '💡 ' + wordle.clues[0];
                document.getElementById('game-header').after(clueEl);
            }
        }
    } catch (err) {
        showMessage('⚠️ Could not load puzzle, using fallback word', '');
    }
})();
