const fs = require('fs');
const path = require('path');

// 预设词库
const WORDLE_WORDS = ['APPLE', 'HOUSE', 'WATER', 'MUSIC', 'LIGHT', 'SMILE', 'DREAM', 'HEART', 'WORLD', 'PEACE'];
const WORDHURDLE_WORDS = ['GARDEN', 'PUZZLE', 'BRIGHT', 'FOREST', 'OCEANS', 'MOUNTS', 'RIVERS', 'NATURE', 'SUNSET', 'MEADOW'];
const ANAGRAM_PAIRS = [
  { scrambled: 'RSTLNE', answer: 'STERNL', hint: 'Adjective' },
  { scrambled: 'AEIOU', answer: 'AUDIO', hint: 'Sound' },
  { scrambled: 'LISTEN', answer: 'SILENT', hint: 'Quiet' },
  { scrambled: 'TRIANGLE', answer: 'INTEGRAL', hint: 'Math' },
  { scrambled: 'PARLIAMENT', answer: 'PARTIALMEN', hint: 'Politics' }
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateWordle() {
  const answer = randomChoice(WORDLE_WORDS);
  const clues = [
    `A 5-letter word: ${answer}`,
    `Common word, ${answer.length} letters`,
    `Starts with ${answer[0]}, ends with ${answer[answer.length-1]}`
  ];
  return {
    id: `wordle-${DATE_ID}`,
    type: 'wordle',
    date: TODAY,
    answer,
    clues: [randomChoice(clues)],
    difficulty: 'medium'
  };
}

function generateWordHurdle() {
  const answer = randomChoice(WORDHURDLE_WORDS);
  const clues = [
    `A 6-letter word: ${answer}`,
    `Related to: ${answer.toLowerCase()}`,
    `Starts with ${answer[0]}, ends with ${answer[answer.length-1]}`
  ];
  return {
    id: `wh-${DATE_ID}`,
    type: 'wordhurdle',
    date: TODAY,
    answer,
    clues: [randomChoice(clues)],
    difficulty: 'hard'
  };
}

function generateMiniCrossword() {
  const across = randomChoice(WORDLE_WORDS);
  const down = randomChoice(WORDLE_WORDS.filter(w => w[2] === across[2])); // 交叉在第3个字母
  
  const grid = [
    across,
    `..${down[1]}..`,
    `..${down[2]}..`,
    `..${down[3]}..`,
    `..${down[4]}..`
  ];
  
  const answers = {
    '00': across[0], '01': across[1], '02': across[2], '03': across[3], '04': across[4],
    '12': down[1], '22': down[2], '32': down[3], '42': down[4]
  };
  
  return {
    id: `crossword-${DATE_ID}`,
    type: 'mini-crossword',
    date: TODAY,
    grid,
    numbers: {
      'A1': `1-Across: ${across.toLowerCase()}`,
      'D3': `2-Down: ${down.toLowerCase()}`
    },
    answers
  };
}

function generateAnagram() {
  const pair = randomChoice(ANAGRAM_PAIRS);
  return {
    id: `anagram-${DATE_ID}`,
    type: 'anagram',
    date: TODAY,
    scrambled: pair.scrambled,
    answer: pair.answer,
    hint: pair.hint
  };
}

function generateWordSearch() {
  const themes = ['Animals', 'Colors', 'Fruits', 'Countries', 'Sports'];
  const theme = randomChoice(themes);
  const words = {
    'Animals': ['TIGER', 'EAGLE', 'SHARK', 'WOLF', 'BEAR'],
    'Colors': ['BLUE', 'RED', 'GREEN', 'YELLOW', 'PINK'],
    'Fruits': ['APPLE', 'MANGO', 'GRAPE', 'PEACH', 'LEMON'],
    'Countries': ['CHINA', 'JAPAN', 'INDIA', 'BRAZIL', 'EGYPT'],
    'Sports': ['SOCCER', 'TENNIS', 'GOLF', 'SWIM', 'RUGBY']
  }[theme];
  
  // 简单 5x5 网格填充字母
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const grid = Array(5).fill().map(() => 
    Array(5).fill().map(() => randomChoice(letters)).join('')
  );
  
  return {
    id: `wordsearch-${DATE_ID}`,
    type: 'wordsearch',
    date: TODAY,
    grid,
    words: words.slice(0, 3),
    theme
  };
}

const TODAY = new Date().toISOString().split('T')[0];
const DATE_ID = TODAY.replace(/-/g, '');

async function main() {
  console.log('🤖 Generating daily puzzles (local)...');
  
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  
  const puzzles = [
    generateWordle(),
    generateWordHurdle(),
    generateMiniCrossword(),
    generateAnagram(),
    generateWordSearch()
  ];
  
  const output = { generated: TODAY, count: puzzles.length, puzzles };
  
  fs.writeFileSync(path.join(dataDir, `puzzles-${TODAY}.json`), JSON.stringify(output, null, 2));
  console.log(`✅ Generated ${puzzles.length} puzzles`);
  
  fs.writeFileSync(path.join(dataDir, 'latest.json'), JSON.stringify(output, null, 2));
  console.log('✅ Updated data/latest.json');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});