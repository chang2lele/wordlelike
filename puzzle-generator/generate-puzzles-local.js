const fs = require('fs');
const path = require('path');

// 本地词汇库
const WORDLE_WORDS = ['APPLE', 'BRAVE', 'CRANE', 'DREAM', 'EAGLE', 'FLAME', 'GRACE', 'HEART', 'IVORY', 'JUICE', 'KNIGHT', 'LEMON', 'MAGIC', 'NOBLE', 'OCEAN', 'PEACE', 'QUEEN', 'RIVER', 'SMILE', 'TIGER', 'UNITY', 'VIVID', 'WATER', 'XENON', 'YOUTH', 'ZEBRA'];
const WORDHURDLE_WORDS = ['GARDEN', 'BUTTER', 'CANYON', 'DESERT', 'EAGLES', 'FROSTY', 'GALAXY', 'HARBOR', 'ISLAND', 'JUNGLE', 'KETTLE', 'LODGES', 'MEADOW', 'NATURE', 'ORANGE', 'PIRATE', 'QUARTZ', 'RADIUS', 'SAVORY', 'TROPIC', 'UNIQUE', 'VELVET', 'WILLOW', 'XERIES', 'YELLOW', 'ZEPHYR'];
const ANAGRAM_WORDS = ['STERNL', 'RETAIL', 'SILENT', 'LISTEN', 'ENLIST', 'TINSEL', 'INLETS', 'SLEETS', 'TELNIS', 'NESTLE'];
const ANAGRAM_SCRAMBLED = ['RSTLNE', 'AILRTE', 'EILNST', 'EILNST', 'EILNST', 'EILNST', 'EILNST', 'EELSST', 'EILNST', 'EELNST'];
const CROSSWORD_GRIDS = [
  {
    grid: ['APPLE', 'H....', '..R..', '.A...', '..E..'],
    numbers: {'A1': '1-Across: A fruit', 'D2': '2-Down: Greeting'},
    answers: {'00': 'A', '01': 'P', '02': 'P', '03': 'L', '04': 'E', '10': 'H', '20': 'R', '30': 'A', '40': 'E'}
  },
  {
    grid: ['BRAVE', 'O....', '..D..', '.E...', '..R..'],
    numbers: {'A1': '1-Across: Courageous', 'D2': '2-Down: Bird sound'},
    answers: {'00': 'B', '01': 'R', '02': 'A', '03': 'V', '04': 'E', '10': 'O', '20': 'D', '30': 'E', '40': 'R'}
  },
  {
    grid: ['CRANE', 'A....', '..T..', '.S...', '..E..'],
    numbers: {'A1': '1-Across: A bird', 'D2': '2-Down: Article'},
    answers: {'00': 'C', '01': 'R', '02': 'A', '03': 'N', '04': 'E', '10': 'A', '20': 'T', '30': 'S', '40': 'E'}
  }
];
const WORDSEARCH_GRIDS = [
  {
    grid: ['HELLO', 'WORLD', 'ABCDE', 'FGHIJ', 'KLMNO'],
    words: ['HELLO', 'WORLD'],
    theme: 'Greetings'
  },
  {
    grid: ['APPLE', 'BANAN', 'CHERR', 'DURIA', 'ELDER'],
    words: ['APPLE', 'BANANA', 'CHERRY'],
    theme: 'Fruits'
  }
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePuzzles() {
  const today = new Date().toISOString().split('T')[0];
  const todayId = today.replace(/-/g, '');
  
  const wordleWord = pickRandom(WORDLE_WORDS);
  const wordhurdleWord = pickRandom(WORDHURDLE_WORDS);
  const anagramIdx = Math.floor(Math.random() * ANAGRAM_WORDS.length);
  const crossword = pickRandom(CROSSWORD_GRIDS);
  const wordsearch = pickRandom(WORDSEARCH_GRIDS);
  
  const wordleClues = [
    `A 5-letter word starting with ${wordleWord[0]}`,
    `Ends with "${wordleWord[4]}"`,
    `Meaning: related to ${wordleWord.toLowerCase()}`
  ];
  
  const wordhurdleClues = [
    `A 6-letter word starting with ${wordhurdleWord[0]}`,
    `Ends with "${wordhurdleWord[5]}"`,
    `Category: ${wordhurdleWord.toLowerCase()} related`
  ];
  
  return [
    {
      id: `wordle-${todayId}`,
      type: 'wordle',
      date: today,
      answer: wordleWord,
      clues: wordleClues,
      difficulty: 'medium'
    },
    {
      id: `wh-${todayId}`,
      type: 'wordhurdle',
      date: today,
      answer: wordhurdleWord,
      clues: wordhurdleClues,
      difficulty: 'hard'
    },
    {
      id: `crossword-${todayId}`,
      type: 'mini-crossword',
      date: today,
      grid: crossword.grid,
      numbers: crossword.numbers,
      answers: crossword.answers,
      clues: [
        `Across 1: ${crossword.numbers['A1']?.split(': ')[1] || 'A word'}`,
        `Down 2: ${crossword.numbers['D2']?.split(': ')[1] || 'A word'}`,
        `Grid is 5x5 with black cells marked as .`
      ]
    },
    {
      id: `anagram-${todayId}`,
      type: 'anagram',
      date: today,
      scrambled: ANAGRAM_SCRAMBLED[anagramIdx],
      answer: ANAGRAM_WORDS[anagramIdx],
      hint: 'Unscramble the letters',
      clues: [
        `Scrambled: ${ANAGRAM_SCRAMBLED[anagramIdx]}`,
        `Length: ${ANAGRAM_WORDS[anagramIdx].length} letters`,
        `Hint: ${ANAGRAM_WORDS[anagramIdx].toLowerCase()} related`
      ]
    },
    {
      id: `wordsearch-${todayId}`,
      type: 'wordsearch',
      date: today,
      grid: wordsearch.grid,
      words: wordsearch.words,
      theme: wordsearch.theme,
      clues: [
        `Theme: ${wordsearch.theme}`,
        `Find ${wordsearch.words.length} hidden words`,
        `Grid size: 5x5 letters`
      ]
    }
  ];
}

function main() {
  console.log('🤖 Generating daily puzzles locally...');
  
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  
  try {
    const puzzles = generatePuzzles();
    const today = new Date().toISOString().split('T')[0];
    const output = { generated: today, count: puzzles.length, puzzles };
    
    fs.writeFileSync(path.join(dataDir, `puzzles-${today}.json`), JSON.stringify(output, null, 2));
    console.log(`✅ Generated ${puzzles.length} puzzles`);
    
    fs.writeFileSync(path.join(dataDir, 'latest.json'), JSON.stringify(output, null, 2));
    console.log('✅ Updated data/latest.json');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();