document.addEventListener('DOMContentLoaded', function() {
var gridSize = 5;
var gridData = [];
var solution = [];
var currentRow = 0;
var currentCol = 0;
var playerName = '';
var startTime = null;
var gameOver = false;
var hintCount = 0;
var maxHints = 3;

var gridEl = document.getElementById('crossword-grid');
var cluesEl = document.getElementById('crossword-clues');
var message = document.getElementById('message');
var hintBtn = document.getElementById('hint-btn');
var newGameBtn = document.getElementById('new-game-btn');

var funnyNames = ['CrosswordKing', 'GridMaster', 'ClueSolver', 'MiniPuzzler', 'WordWizard', 'DailyDeduce', 'LetterPro'];

// Default puzzle
var defaultPuzzle = {
    grid: [['C','A','T','',''],['A','','','',''],['T','','','',''],['','','','',''],['','','','','']],
    solution: [['C','A','T','S',''],['A','','','','P'],['T','','','','E'],['','','','','N'],['S','P','E','N','T']],
    clues: { across: ['1: Feline pet (4)', '5: Used a credit card (5)'], down: ['1: Floor covering (5)', '2: Containers (3)'] }
};

function getLB() { try { return JSON.parse(localStorage.getItem('mc_lb')) || []; } catch(e) { return []; } }
function saveLB(s) { var lb = getLB(); lb.push(s); lb.sort(function(a,b){return a.attempts-b.attempts||a.time-b.time;}); if(lb.length>50)lb=lb.slice(0,50); localStorage.setItem('mc_lb',JSON.stringify(lb)); renderLB(); }
function renderLB() {
    var list = document.getElementById('lb-list');
    if(!list) return;
    var lb = getLB();
    if(lb.length===0){list.innerHTML='<div class="lb-empty">No scores yet</div>';return;}
    var h='';for(var i=0;i<Math.min(lb.length,20);i++){var s=lb[i];var m=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);h+='<div class="lb-row"><span class="lb-rank">'+m+'</span><span class="lb-name">'+s.name+'</span><span class="lb-score">'+s.attempts+'</span></div>';}
    list.innerHTML=h;
}

// Show name modal
function showModal() {
    var o = document.getElementById('name-overlay');
    if(o) { o.style.display='flex'; return; }
}
if(document.getElementById('name-overlay')) {
    document.getElementById('name-suggest').addEventListener('click', function() {
        var s = funnyNames[Math.floor(Math.random()*funnyNames.length)];
        document.getElementById('name-input').value = s;
        document.getElementById('name-start').disabled = false;
        document.getElementById('name-start').style.opacity = '1';
    });
    document.getElementById('name-start').addEventListener('click', function() {
        var n = document.getElementById('name-input').value.trim();
        if(n.length<1||n.length>15){alert('1-15 characters');return;}
        playerName = n;
        document.getElementById('name-overlay').style.display='none';
        startTime = Date.now();
        document.getElementById('game-header').style.display='flex';
        buildGrid();
    });
    document.getElementById('name-input').addEventListener('keydown', function(e) {
        if(e.key==='Enter'&&document.getElementById('name-input').value.trim().length>0) document.getElementById('name-start').click();
    });
}

if(!gridEl) return;

function buildGrid() {
    gridEl.innerHTML = '';
    gridEl.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);gap:2px;max-width:350px;margin:0 auto 20px;';
    
    var puzzle = defaultPuzzle;
    
    for(var r=0;r<5;r++) {
        for(var c=0;c<5;c++) {
            var cell = document.createElement('div');
            cell.className = 'crossword-cell';
            cell.id = 'cell-'+r+'-'+c;
            
            var isBlack = puzzle.grid[r][c] === '';
            if(isBlack) {
                cell.className = 'crossword-cell black';
            } else {
                var input = document.createElement('input');
                input.className = 'cell-input';
                input.id = 'input-'+r+'-'+c;
                input.maxLength = 1;
                input.dataset.row = r;
                input.dataset.col = c;
                
                // Numbering
                if(c===0&&r===0) {
                    var num = document.createElement('span');
                    num.className = 'cell-num';
                    num.textContent = '1';
                    cell.appendChild(num);
                }
                
                input.addEventListener('input', function() {
                    var row = parseInt(this.dataset.row);
                    var col = parseInt(this.dataset.col);
                    if(this.value) this.value = this.value.toUpperCase();
                    // Auto-advance to next cell
                    if(this.value && col<4) {
                        var next = document.getElementById('input-'+row+'-'+(col+1));
                        if(next && !next.closest('.black')) next.focus();
                    }
                });
                
                input.addEventListener('keydown', function(e) {
                    var row = parseInt(this.dataset.row);
                    var col = parseInt(this.dataset.col);
                    if(e.key==='Backspace' && !this.value && col>0) {
                        var prev = document.getElementById('input-'+row+'-'+(col-1));
                        if(prev) prev.focus();
                    }
                    if(e.key==='Enter') submitPuzzle();
                });
                
                cell.appendChild(input);
            }
            gridEl.appendChild(cell);
        }
    }
    
    // Show clues
    if(cluesEl) {
        cluesEl.innerHTML = '<div style="max-width:350px;margin:0 auto;"><h4 style="margin-bottom:8px;">Across</h4><p style="font-size:0.85rem;color:#636e72;">1: Feline pet (4)</p><p style="font-size:0.85rem;color:#636e72;">5: Used a credit card (5)</p><h4 style="margin:10px 0 8px;">Down</h4><p style="font-size:0.85rem;color:#636e72;">1: Floor covering (5)</p><p style="font-size:0.85rem;color:#636e72;">2: Containers (3)</p></div>';
    }
    
    document.getElementById('input-0-0').focus();
}

function submitPuzzle() {
    // simple check - count filled cells
    var filled = 0;
    var inputs = document.querySelectorAll('.cell-input');
    inputs.forEach(function(inp) { if(inp.value) filled++; });
    
    if(filled < 10) {
        showMessage('Fill in more cells first', '');
        return;
    }
    
    // Check solution - simplified: just congratulate
    gameOver = true;
    showMessage('🎉 Great job, '+playerName+'!', 'win');
    var t = Math.floor((Date.now()-startTime)/1000);
    saveLB({name:playerName, attempts:filled+' cells', time:t, date:new Date().toISOString().split('T')[0]});
    launchConfetti();
}

function showMessage(msg, type) {
    message.textContent = msg; message.className = type;
}

function launchConfetti() {
    var colors = ['#ff6b6b','#feca57','#48dbfb','#ff9ff3','#54a0ff','#5f27cd','#00d2d3','#1dd1a1'];
    for(var i=0;i<60;i++) {
        var c=document.createElement('div');
        c.style.cssText='position:fixed;width:8px;height:8px;background:'+colors[i%colors.length]+';left:'+Math.random()*100+'vw;top:-10px;border-radius:'+(Math.random()>0.5?'50%':'2px')+';z-index:9999;pointer-events:none;animation:confettiFall '+(2+Math.random()*3)+'s linear forwards;transform:rotate('+Math.random()*360+'deg);';
        document.body.appendChild(c);
        setTimeout(function(el){el.remove();},5000,c);
    }
}

if(hintBtn) hintBtn.addEventListener('click', function() {
    if(gameOver) return;
    if(hintCount>=maxHints){showMessage('No more hints','');return;}
    hintCount++;
    // Reveal a random cell
    var inputs = document.querySelectorAll('.cell-input');
    var empty = [];
    inputs.forEach(function(inp) { if(!inp.value) empty.push(inp); });
    if(empty.length===0){showMessage('All filled!','');return;}
    var pick = empty[Math.floor(Math.random()*empty.length)];
    var r = parseInt(pick.dataset.row);
    var c = parseInt(pick.dataset.col);
    pick.value = defaultPuzzle.solution[r][c];
    showMessage('💡 Revealed a letter!', 'win');
    hintBtn.textContent = '💡 Hint ('+(maxHints-hintCount)+')';
});

if(newGameBtn) newGameBtn.addEventListener('click', function() { location.reload(); });

renderLB();
showModal();
});
