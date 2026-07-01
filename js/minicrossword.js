document.addEventListener('DOMContentLoaded', function() {
var puzzleData = null;
var playerName = '';
var startTime = null;
var gameOver = false;
var filledCells = 0;
var totalCells = 0;

var funnyNames = ['CrosswordKing', 'GridMaster', 'ClueSolver', 'MiniPuzzler', 'WordWizard', 'DailyDeduce'];

var gridEl = document.getElementById('crossword-grid');
var cluesEl = document.getElementById('crossword-clues');
var message = document.getElementById('message');
var hintBtn = document.getElementById('hint-btn');
var newGameBtn = document.getElementById('new-game-btn');

function getLB() { try { return JSON.parse(localStorage.getItem('mc_lb')) || []; } catch(e) { return []; } }
function saveLB(s) { var lb = getLB(); lb.push(s); lb.sort(function(a,b){return a.attempts-b.attempts||a.time-b.time;}); if(lb.length>50)lb=lb.slice(0,50); localStorage.setItem('mc_lb',JSON.stringify(lb)); renderLB(); }
function renderLB() {
    var list = document.getElementById('lb-list');
    if(!list) return;
    var lb = getLB();
    if(lb.length===0){list.innerHTML='<div class="lb-empty">No scores yet</div>';return;}
    var h='';
    for(var i=0;i<Math.min(lb.length,20);i++){
        var s=lb[i];var m=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);
        h+='<div class="lb-row"><span class="lb-rank">'+m+'</span><span class="lb-name">'+s.name+'</span><span class="lb-score">'+s.attempts+'</span></div>';
    }
    list.innerHTML=h;
}

// Name modal
function showModal() {
    var o = document.getElementById('name-overlay');
    if(!o) return;
    o.style.display='flex';
}
document.getElementById('name-suggest').addEventListener('click', function() {
    var s = funnyNames[Math.floor(Math.random()*funnyNames.length)];
    document.getElementById('name-input').value = s;
    document.getElementById('name-start').disabled = false;
    document.getElementById('name-start').style.opacity='1';
});
document.getElementById('name-start').addEventListener('click', function() {
    var n = document.getElementById('name-input').value.trim();
    if(n.length<1||n.length>15){alert('1-15 characters');return;}
    playerName=n;
    document.getElementById('name-overlay').style.display='none';
    startTime=Date.now();
    document.getElementById('game-header').style.display='flex';
    if(puzzleData) buildGrid(puzzleData);
});
document.getElementById('name-input').addEventListener('keydown', function(e) {
    if(e.key==='Enter'&&document.getElementById('name-input').value.trim().length>0) document.getElementById('name-start').click();
});

if(!gridEl) return;

function buildGrid(data) {
    gridEl.innerHTML = '';
    gridEl.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);gap:2px;max-width:300px;margin:0 auto 20px;';
    
    var grid = data.grid || [];
    var answers = data.answers || {};
    var numbers = data.numbers || {};
    totalCells = 0;
    filledCells = 0;
    
    for(var r=0;r<5;r++) {
        var row = grid[r] || '';
        for(var c=0;c<5;c++) {
            var cell = document.createElement('div');
            cell.className = 'crossword-cell';
            cell.id = 'cell-'+r+'-'+c;
            
            var ch = row[c] || '';
            if(ch === '.' || ch === '') {
                cell.className = 'crossword-cell black';
            } else {
                totalCells++;
                var input = document.createElement('input');
                input.className = 'cell-input';
                input.id = 'input-'+r+'-'+c;
                input.maxLength = 1;
                input.dataset.row = r;
                input.dataset.col = c;
                input.dataset.answer = (answers[r+''+c] || '').toUpperCase();
                
                // Check for number labels
                var keyA = 'A' + c; // Across
                var keyD = 'D' + r; // Down
                var label = '';
                for(var k in numbers) {
                    var pos = k.replace(/[A-Z]/g,'');
                    if(parseInt(pos)===c || (k.includes('D') && parseInt(k.replace('D',''))===r) || (k.includes('A') && parseInt(k.replace('A',''))===c)) {
                        label = k;
                    }
                }
                // Simpler: number by position
                if(c===0 && r===0) label = '1';
                else if(c===0 && r===2) label = '2';
                else if(c===3 && r===0) label = '3';
                
                if(label) {
                    var num = document.createElement('span');
                    num.className = 'cell-num';
                    num.textContent = label.replace(/[A-Z]/g,'');
                    cell.appendChild(num);
                }
                
                input.addEventListener('input', function() {
                    if(this.value) this.value = this.value.toUpperCase();
                    checkCompletion();
                });
                
                input.addEventListener('keydown', function(e) {
                    var row = parseInt(this.dataset.row);
                    var col = parseInt(this.dataset.col);
                    if(e.key==='Backspace' && !this.value && col>0) {
                        var prev = document.getElementById('input-'+row+'-'+(col-1));
                        if(prev && !prev.closest('.black')) { prev.focus(); }
                    }
                    if(e.key==='Enter') checkPuzzle();
                    // Arrow navigation
                    if(e.key==='ArrowRight') { e.preventDefault(); navFocus(row, col+1, 0, 4); }
                    if(e.key==='ArrowLeft') { e.preventDefault(); navFocus(row, col-1, 0, 4); }
                    if(e.key==='ArrowDown') { e.preventDefault(); navFocus(row+1, col, 0, 4); }
                    if(e.key==='ArrowUp') { e.preventDefault(); navFocus(row-1, col, 0, 4); }
                });
                
                cell.appendChild(input);
            }
            gridEl.appendChild(cell);
        }
    }
    
    // Build clues display
    if(cluesEl) {
        var html = '<div style="max-width:300px;margin:0 auto;">';
        html += '<h4 style="margin-bottom:6px;font-size:0.9rem;">Across</h4>';
        html += '<div style="font-size:0.8rem;color:#636e72;margin-bottom:12px;line-height:1.7;">';
        var acrossCount = 0;
        var downCount = 0;
        for(var k in numbers) {
            if(k.includes('A')) { acrossCount++; html += '<b>'+k.replace('A','')+'</b>. '+numbers[k]+'<br>'; }
        }
        html += '</div><h4 style="margin-bottom:6px;font-size:0.9rem;">Down</h4>';
        html += '<div style="font-size:0.8rem;color:#636e72;line-height:1.7;">';
        for(var k in numbers) {
            if(k.includes('D')) { downCount++; html += '<b>'+k.replace('D','')+'</b>. '+numbers[k]+'<br>'; }
        }
        if(acrossCount===0&&downCount===0) {
            html += 'Use the clues to fill the grid!<br>';
        }
        html += '</div></div>';
        cluesEl.innerHTML = html;
    }
}

function navFocus(r, c, min, max) {
    if(r<min||r>max||c<min||c>max) return;
    var el = document.getElementById('input-'+r+'-'+c);
    if(el && !el.closest('.black')) { el.focus(); return; }
    // Skip black cells, continue in same direction
    if(c > (arguments[0]%5)) navFocus(r, c+1, min, max);
    else if(c < (arguments[0]%5)) navFocus(r, c-1, min, max);
}

function checkCompletion() {
    var filled = 0;
    document.querySelectorAll('.cell-input').forEach(function(inp) { if(inp.value) filled++; });
    filledCells = filled;
}

function checkPuzzle() {
    var correct = 0;
    var total = 0;
    document.querySelectorAll('.cell-input').forEach(function(inp) {
        total++;
        var isCorrect = inp.value.toUpperCase() === inp.dataset.answer;
        if(isCorrect) { correct++; inp.style.background = '#00b894'; inp.style.color = '#fff'; }
        else if(inp.value) { inp.style.background = '#e17055'; inp.style.color = '#fff'; }
    });
    
    if(correct === total) {
        gameOver = true;
        showMessage('🎉 Perfect, '+playerName+'!', 'win');
        var t = Math.floor((Date.now()-startTime)/1000);
        saveLB({name:playerName, attempts:correct+'/'+total+' correct', time:t});
        launchConfetti();
    } else {
        showMessage(correct+'/'+total+' correct. Keep going!', '');
    }
}

function showMessage(msg, type) {
    message.textContent = msg; message.className = type;
}

function launchConfetti() {
    var colors = ['#ff6b6b','#feca57','#48dbfb','#ff9ff3','#54a0ff','#5f27cd','#00d2d3','#1dd1a1'];
    for(var i=0;i<60;i++) {
        var c=document.createElement('div');
        c.style.cssText='position:fixed;width:8px;height:8px;background:'+colors[i%colors.length]+';left:'+Math.random()*100+'vw;top:-10px;border-radius:'+(Math.random()>0.5?'50%':'2px')+';z-index:9999;pointer-events:none;animation:confettiFall '+(2+Math.random()*3)+'s linear forwards;';
        document.body.appendChild(c);
        setTimeout(function(el){el.remove();},5000,c);
    }
}

if(hintBtn) hintBtn.addEventListener('click', function() {
    if(gameOver) return;
    var inputs = document.querySelectorAll('.cell-input');
    var wrong = [];
    inputs.forEach(function(inp) {
        if(inp.value.toUpperCase() !== inp.dataset.answer) wrong.push(inp);
    });
    if(wrong.length===0){showMessage('All correct!','');return;}
    var pick = wrong[Math.floor(Math.random()*wrong.length)];
    pick.value = pick.dataset.answer;
    pick.style.background = '#fdcb6e';
    checkCompletion();
    showMessage('💡 Revealed a cell!','');
});

if(newGameBtn) newGameBtn.addEventListener('click', function() { location.reload(); });

// Create a check button
var checkBtn = document.createElement('button');
checkBtn.className = 'btn-small';
checkBtn.textContent = '✅ Check Answers';
checkBtn.style.cssText = 'display:block;margin:10px auto 0;';
checkBtn.addEventListener('click', checkPuzzle);
var msgContainer = document.getElementById('message');
if(msgContainer) msgContainer.parentNode.insertBefore(checkBtn, msgContainer.nextSibling);

renderLB();

// Load puzzle data
fetch('/data/latest.json').then(function(r) {
    if(!r.ok) throw Error('fail');
    return r.json();
}).then(function(data) {
    var cw = data.puzzles.find(function(p) { return p.type==='mini-crossword'; });
    if(cw && cw.grid) {
        puzzleData = cw;
        if(playerName) buildGrid(cw);
    } else {
        // Fallback if AI didn't generate a crossword
        puzzleData = { grid: ['APPLE','H...','...R.','...E.'], numbers: {}, answers: {'00':'A','01':'P','02':'P','03':'L','04':'E','10':'H','20':'A','30':'R','31':'E','40':'E'} };
        if(playerName) buildGrid(puzzleData);
    }
    showModal();
    renderLB();
}).catch(function() {
    puzzleData = { grid: ['APPLE','H...','...R.','...E.'], numbers: {}, answers: {'00':'A','01':'P','02':'P','03':'L','04':'E','10':'H','20':'A','30':'R','31':'E','40':'E'} };
    showModal();
    renderLB();
});
});
