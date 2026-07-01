document.addEventListener('DOMContentLoaded', function() {
var TARGET = 'PUZZLE';
var WORD_LEN = 6;
var MAX_ATTEMPTS = 6;
var currentRow = 0;
var currentTile = 0;
var gameOver = false;
var hintCount = 0;
var maxHints = 3;
var playerName = '';
var startTime = null;

var board = document.getElementById('board-6');
var keyboard = document.getElementById('keyboard-6');
var message = document.getElementById('message');
var hintBtn = document.getElementById('hint-btn');

// Fallback 6-letter words
var FALLBACK = ['PUZZLE', 'BRIDGE', 'CASTLE', 'DINNER', 'FABRIC', 'GARDEN', 'HUMBLE', 'IMPACT', 'JUNGLE', 'KITTEN'];

// Funny names
var funnyNames = ['WordHurdler', 'SixLetterPro', 'LexiMaster', 'VowelKing', 'ConsonantQueen', 'GridGuru', 'DailyDeduce', 'WordSmith'];

// Leaderboard
function getLeaderboard() {
    try { return JSON.parse(localStorage.getItem('wh_leaderboard')) || []; } catch(e) { return []; }
}
function saveToLeaderboard(score) {
    var lb = getLeaderboard();
    lb.push(score);
    lb.sort(function(a,b) { return a.attempts - b.attempts || a.time - b.time; });
    if (lb.length > 50) lb = lb.slice(0, 50);
    localStorage.setItem('wh_leaderboard', JSON.stringify(lb));
    renderLeaderboard();
}
function renderLeaderboard() {
    var list = document.getElementById('lb-list');
    if (!list) return;
    var lb = getLeaderboard();
    if (lb.length === 0) { list.innerHTML = '<div class="lb-empty">No scores yet</div>'; return; }
    var html = '';
    for (var i = 0; i < Math.min(lb.length, 20); i++) {
        var s = lb[i];
        var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
        html += '<div class="lb-row"><span class="lb-rank">' + medal + '</span><span class="lb-name">' + s.name + '</span><span class="lb-score">' + s.attempts + '/6</span></div>';
    }
    list.innerHTML = html;
}

// Name modal
function showNameModal() {
    var overlay = document.getElementById('name-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        return;
    }
    // Create modal if not exists
    var div = document.createElement('div');
    div.id = 'name-overlay';
    div.className = 'name-overlay';
    div.style.display = 'flex';
    div.innerHTML = '<div class="name-modal"><h2>🧩 Word Hurdle</h2><p>Enter your name to start</p><input type="text" id="name-input" placeholder="Your name..." maxlength="15" autocomplete="off"><button id="name-suggest" class="btn-hint" style="margin-bottom:10px;width:100%;">🎲 Random Name</button><button id="name-start" class="btn" disabled style="opacity:0.5;width:100%;text-align:center;">Start Playing</button></div>';
    div.querySelector('#name-suggest').addEventListener('click', function() {
        var suggested = funnyNames[Math.floor(Math.random() * funnyNames.length)];
        div.querySelector('#name-input').value = suggested;
        div.querySelector('#name-start').disabled = false;
        div.querySelector('#name-start').style.opacity = '1';
    });
    div.querySelector('#name-start').addEventListener('click', function() {
        var name = div.querySelector('#name-input').value.trim();
        if (name.length < 1 || name.length > 15) { alert('Name must be 1-15 characters'); return; }
        playerName = name;
        div.style.display = 'none';
        startTime = Date.now();
        document.getElementById('game-header').style.display = 'flex';
    });
    div.querySelector('#name-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && div.querySelector('#name-input').value.trim().length > 0) div.querySelector('#name-start').click();
    });
    document.body.appendChild(div);
}

if (!board || !keyboard) return;

// Build board
for (var r = 0; r < MAX_ATTEMPTS; r++) {
    var row = document.createElement('div');
    row.className = 'row'; row.id = 'wh-row-' + r;
    for (var c = 0; c < WORD_LEN; c++) {
        var tile = document.createElement('div');
        tile.className = 'tile'; tile.id = 'wh-tile-' + r + '-' + c;
        row.appendChild(tile);
    }
    board.appendChild(row);
}

// Build keyboard
[
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Enter','Z','X','C','V','B','N','M','Backspace']
].forEach(function(row) {
    var div = document.createElement('div');
    div.className = 'kb-row';
    row.forEach(function(key) {
        var btn = document.createElement('button');
        btn.className = 'kb-key' + (key.length > 1 ? ' wide' : '');
        btn.textContent = key;
        btn.addEventListener('click', function() { handleKey(key); });
        div.appendChild(btn);
    });
    keyboard.appendChild(div);
});

if (hintBtn) {
    hintBtn.addEventListener('click', function() {
        if (gameOver) return;
        if (hintCount >= maxHints) { showMessage('No more hints', ''); return; }
        hintCount++;
        var revealed = {};
        for (var rr = 0; rr < currentRow; rr++) {
            for (var cc = 0; cc < WORD_LEN; cc++) {
                var tt = document.getElementById('wh-tile-' + rr + '-' + cc);
                if (tt && tt.classList.contains('correct')) revealed[cc] = true;
            }
        }
        var available = [];
        for (var cc = 0; cc < WORD_LEN; cc++) { if (!revealed[cc]) available.push(cc); }
        if (available.length === 0) { showMessage('All revealed!', ''); return; }
        var pick = available[Math.floor(Math.random() * available.length)];
        showMessage('💡 Position ' + (pick + 1) + ': ' + TARGET[pick], 'win');
        hintBtn.textContent = '💡 Hint (' + (maxHints - hintCount) + ')';
    });
}

function updateActiveTile() {
    document.querySelectorAll('#board-6 .tile').forEach(function(t) { t.classList.remove('active'); });
    if (!gameOver && currentRow < MAX_ATTEMPTS) {
        var tile = document.getElementById('wh-tile-' + currentRow + '-' + currentTile);
        if (tile) tile.classList.add('active');
    }
}

function handleKey(key) {
    if (gameOver) return;
    if (key === 'Enter') { submitGuess(); return; }
    if (key === 'Backspace') {
        if (currentTile > 0) {
            currentTile--;
            document.getElementById('wh-tile-' + currentRow + '-' + currentTile).textContent = '';
        }
        updateActiveTile(); return;
    }
    if (currentTile < WORD_LEN) {
        document.getElementById('wh-tile-' + currentRow + '-' + currentTile).textContent = key;
        currentTile++; updateActiveTile();
    }
}

function submitGuess() {
    if (currentTile !== WORD_LEN) { showMessage('Not enough letters', ''); return; }
    
    var guess = '';
    for (var c = 0; c < WORD_LEN; c++) {
        guess += document.getElementById('wh-tile-' + currentRow + '-' + c).textContent;
    }
    
    var targetArr = TARGET.split('');
    var results = [];
    
    for (var i = 0; i < WORD_LEN; i++) {
        if (guess[i] === TARGET[i]) { results[i] = 'correct'; targetArr[i] = null; }
        else if (targetArr.indexOf(guess[i]) !== -1) { results[i] = 'present'; targetArr[targetArr.indexOf(guess[i])] = null; }
        else { results[i] = 'absent'; }
    }
    
    var rowTiles = document.querySelectorAll('#wh-row-' + currentRow + ' .tile');
    rowTiles.forEach(function(tile, i) { tile.classList.add(results[i]); });
    
    document.querySelectorAll('#keyboard-6 .kb-key').forEach(function(btn) {
        var key = btn.textContent;
        if (key.length > 1) return;
        for (var i = 0; i < WORD_LEN; i++) {
            if (guess[i] === key) {
                if (results[i] === 'correct') btn.className = 'kb-key correct';
                else if (results[i] === 'present' && btn.className.indexOf('correct') === -1)
                    btn.className = 'kb-key present';
                else if (results[i] === 'absent' && btn.className.indexOf('correct') === -1 && btn.className.indexOf('present') === -1)
                    btn.className = 'kb-key absent';
            }
        }
    });
    
    if (results.every(function(r) { return r === 'correct'; })) {
        gameOver = true;
        showMessage('🎉 You got it, ' + playerName + '!', 'win');
        var t = Math.floor((Date.now() - startTime) / 1000);
        saveToLeaderboard({ name: playerName, attempts: currentRow + 1, time: t, date: new Date().toISOString().split('T')[0] });
        launchConfetti();
        return;
    }
    
    currentRow++; currentTile = 0;
    if (currentRow >= MAX_ATTEMPTS) {
        gameOver = true;
        showMessage('😔 The word was ' + TARGET, 'lose');
    } else {
        showMessage((MAX_ATTEMPTS - currentRow) + ' tries left', '');
    }
    updateActiveTile();
}

function showMessage(msg, type) {
    message.textContent = msg; message.className = type;
}

function launchConfetti() {
    var colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#1dd1a1'];
    for (var i = 0; i < 60; i++) {
        var c = document.createElement('div');
        c.style.cssText = 'position:fixed;width:8px;height:8px;background:' + colors[i % colors.length] + ';left:' + Math.random() * 100 + 'vw;top:-10px;border-radius:' + (Math.random() > 0.5 ? '50%' : '2px') + ';z-index:9999;pointer-events:none;animation:confettiFall ' + (2 + Math.random() * 3) + 's linear forwards;transform:rotate(' + Math.random() * 360 + 'deg);';
        document.body.appendChild(c);
        setTimeout(function(el) { el.remove(); }, 5000, c);
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') handleKey('Enter');
    else if (e.key === 'Backspace') handleKey('Backspace');
    else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase());
});

document.getElementById('new-game-btn').addEventListener('click', function() { location.reload(); });

// Load or generate daily 6-letter word (AI puzzle or fallback)
var today = new Date().toISOString().split('T')[0];
var seed = today.replace(/-/g, '');
var fallbackWord = FALLBACK[parseInt(seed.slice(-2)) % FALLBACK.length];

// Try fetching puzzles first, use fallback if unavailable
fetch('/data/latest.json').then(function(r) {
    if (!r.ok) throw new Error('fail');
    return r.json();
}).then(function(data) {
    var wh = data.puzzles.find(function(p) { return p.type === 'wordhurdle' || (p.type === 'wordle' && p.answer && p.answer.length === 6); });
    if (wh && wh.answer && wh.answer.length === 6) {
        TARGET = wh.answer.toUpperCase();
    } else {
        TARGET = fallbackWord;
    }
    var h3 = document.querySelector('#game-header h3');
    if (h3) h3.textContent = 'Word Hurdle — ' + today;
    showNameModal();
    renderLeaderboard();
}).catch(function() {
    TARGET = fallbackWord;
    var h3 = document.querySelector('#game-header h3');
    if (h3) h3.textContent = 'Word Hurdle — ' + today;
    showNameModal();
    renderLeaderboard();
});
});
