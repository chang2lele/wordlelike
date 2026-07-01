document.addEventListener('DOMContentLoaded', function() {
var TARGET = 'WORLD';
var MAX_ATTEMPTS = 6;
var currentRow = 0;
var currentTile = 0;
var gameOver = false;
var hintCount = 0;
var maxHints = 3;
var playerName = '';
var startTime = null;

var board = document.getElementById('board');
var keyboard = document.getElementById('keyboard');
var message = document.getElementById('message');
var hintBtn = document.getElementById('hint-btn');

// Generate random names
var funnyNames = [
    'WordleMaster', 'PuzzleKing', 'LetterLegend', 'VowelViking', 
    'ConsonantQueen', 'GuessGuru', 'DailyDeduce', 'FiveLetterPro',
    'GridGladiator', 'TileTitan', 'BrainBard', 'LexiLord',
    'PhrasePhantom', 'RiddleRanger', 'ClueCommander', 'AlphaAce',
    'BetaBoss', 'GammaGenius', 'DeltaDuke', 'SigmaStar'
];

// Leaderboard functions
function getLeaderboard() {
    try { return JSON.parse(localStorage.getItem('wl_leaderboard')) || []; }
    catch(e) { return []; }
}

function saveToLeaderboard(score) {
    var lb = getLeaderboard();
    lb.push(score);
    lb.sort(function(a, b) { return a.attempts - b.attempts || a.time - b.time; });
    if (lb.length > 50) lb = lb.slice(0, 50);
    localStorage.setItem('wl_leaderboard', JSON.stringify(lb));
    renderLeaderboard();
}

function renderLeaderboard() {
    var list = document.getElementById('lb-list');
    if (!list) return;
    var lb = getLeaderboard();
    if (lb.length === 0) {
        list.innerHTML = '<div class="lb-empty">No scores yet</div>';
        return;
    }
    var html = '';
    for (var i = 0; i < Math.min(lb.length, 20); i++) {
        var s = lb[i];
        var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
        html += '<div class="lb-row"><span class="lb-rank">' + medal + '</span>' +
                '<span class="lb-name">' + s.name + '</span>' +
                '<span class="lb-score">' + s.attempts + '/6</span></div>';
    }
    list.innerHTML = html;
}

// Name modal
function showNameModal() {
    var overlay = document.getElementById('name-overlay');
    var input = document.getElementById('name-input');
    var suggest = document.getElementById('name-suggest');
    var startBtn = document.getElementById('name-start');
    if (!overlay) return;
    
    overlay.style.display = 'flex';
    // Suggest a random name
    var suggested = funnyNames[Math.floor(Math.random() * funnyNames.length)];
    suggest.textContent = 'Random: ' + suggested;
    input.focus();
    
    suggest.onclick = function() {
        input.value = suggested;
        startBtn.disabled = false;
        startBtn.style.opacity = '1';
    };
    
    startBtn.onclick = function() {
        var name = input.value.trim();
        if (name.length < 1 || name.length > 15) {
            alert('Name must be 1-15 characters');
            return;
        }
        playerName = name;
        overlay.style.display = 'none';
        startTime = Date.now();
        document.getElementById('game-header').style.display = 'flex';
    };
    
    input.oninput = function() {
        startBtn.disabled = input.value.trim().length < 1;
        startBtn.style.opacity = startBtn.disabled ? '0.5' : '1';
    };
    
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && input.value.trim().length > 0) startBtn.click();
    });
}

if (!board || !keyboard) return;

// Build board
for (var r = 0; r < MAX_ATTEMPTS; r++) {
    var row = document.createElement('div');
    row.className = 'row'; row.id = 'row-' + r;
    for (var c = 0; c < 5; c++) {
        var tile = document.createElement('div');
        tile.className = 'tile'; tile.id = 'tile-' + r + '-' + c;
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
        if (hintCount >= maxHints) { showMessage('No more hints available', ''); return; }
        hintCount++;
        var pos = 0;
        // Find first unrevealed position
        for (var r = 0; r < currentRow; r++) {
            for (var c = 0; c < 5; c++) {
                var tile = document.getElementById('tile-' + r + '-' + c);
                if (tile && tile.classList.contains('correct')) {
                    // already revealed
                }
            }
        }
        // Simple: reveal a random unrevealed position
        var revealed = {};
        for (var rr = 0; rr < currentRow; rr++) {
            for (var cc = 0; cc < 5; cc++) {
                var tt = document.getElementById('tile-' + rr + '-' + cc);
                if (tt && tt.classList.contains('correct')) revealed[cc] = true;
            }
        }
        var available = [];
        for (var cc = 0; cc < 5; cc++) { if (!revealed[cc]) available.push(cc); }
        if (available.length === 0) { showMessage('All revealed!', ''); return; }
        var pick = available[Math.floor(Math.random() * available.length)];
        showMessage('💡 Position ' + (pick + 1) + ': ' + TARGET[pick], 'win');
        hintBtn.textContent = '💡 Hint (' + (maxHints - hintCount) + ')';
    });
}

function updateActiveTile() {
    document.querySelectorAll('.tile').forEach(function(t) { t.classList.remove('active'); });
    if (!gameOver && currentRow < MAX_ATTEMPTS) {
        var tile = document.getElementById('tile-' + currentRow + '-' + currentTile);
        if (tile) tile.classList.add('active');
    }
}

function handleKey(key) {
    if (gameOver) return;
    if (key === 'Enter') { submitGuess(); return; }
    if (key === 'Backspace') {
        if (currentTile > 0) {
            currentTile--;
            document.getElementById('tile-' + currentRow + '-' + currentTile).textContent = '';
        }
        updateActiveTile();
        return;
    }
    if (currentTile < 5) {
        document.getElementById('tile-' + currentRow + '-' + currentTile).textContent = key;
        currentTile++;
        updateActiveTile();
    }
}

function letterScore(l) { return l.charCodeAt(0) - 64; }

function submitGuess() {
    if (currentTile !== 5) { showMessage('Not enough letters', ''); return; }
    
    var guess = '';
    for (var c = 0; c < 5; c++) {
        guess += document.getElementById('tile-' + currentRow + '-' + c).textContent;
    }
    
    var targetArr = TARGET.split('');
    var results = [];
    
    for (var i = 0; i < 5; i++) {
        var gl = guess[i];
        if (gl === TARGET[i]) {
            results[i] = 'correct';
            targetArr[i] = null;
        } else if (targetArr.indexOf(gl) !== -1) {
            results[i] = 'present';
            targetArr[targetArr.indexOf(gl)] = null;
        } else {
            results[i] = 'absent';
        }
    }
    
    var rowTiles = document.querySelectorAll('#row-' + currentRow + ' .tile');
    rowTiles.forEach(function(tile, i) {
        tile.classList.add(results[i]);
    });
    
    document.querySelectorAll('.kb-key').forEach(function(btn) {
        var key = btn.textContent;
        if (key.length > 1) return;
        for (var i = 0; i < 5; i++) {
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
        var timeTaken = Math.floor((Date.now() - startTime) / 1000);
        saveToLeaderboard({ name: playerName, attempts: currentRow + 1, time: timeTaken, date: new Date().toISOString().split('T')[0] });
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
    message.textContent = msg;
    message.className = type;
}

function launchConfetti() {
    var colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#1dd1a1'];
    for (var i = 0; i < 80; i++) {
        var confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.cssText =
            'position:fixed;width:10px;height:10px;background:' + colors[i % colors.length] +
            ';left:' + Math.random() * 100 + 'vw;top:-10px;border-radius:' + (Math.random() > 0.5 ? '50%' : '2px') +
            ';z-index:9999;pointer-events:none;' +
            'animation:confettiFall ' + (2 + Math.random() * 3) + 's linear forwards;' +
            'transform:rotate(' + Math.random() * 360 + 'deg);';
        document.body.appendChild(confetti);
        setTimeout(function(c) { c.remove(); }, 5000, confetti);
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') handleKey('Enter');
    else if (e.key === 'Backspace') handleKey('Backspace');
    else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase());
});

document.getElementById('new-game-btn').addEventListener('click', function() { location.reload(); });

// Load puzzle and then show name modal
fetch('/data/latest.json').then(function(resp) {
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return resp.json();
}).then(function(data) {
    var wordle = data.puzzles.find(function(p) { return p.type === 'wordle'; });
    if (wordle && wordle.answer && wordle.answer.length === 5) {
        TARGET = wordle.answer.toUpperCase();
        var h3 = document.querySelector('#game-header h3');
        if (h3) h3.textContent = 'WordleLike Daily — ' + wordle.date;
        if (wordle.clues && wordle.clues[0]) {
            var clueEl = document.createElement('p');
            clueEl.style.cssText = 'text-align:center;color:#636e72;font-size:0.85rem;margin-bottom:10px;';
            clueEl.textContent = '💡 ' + wordle.clues[0];
            document.getElementById('game-header').after(clueEl);
        }
    }
}).then(function() {
    showNameModal();
    renderLeaderboard();
}).catch(function(err) {
    showNameModal();
    renderLeaderboard();
});
});
