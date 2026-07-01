// Puzzle generator for WordleLike.com
// Uses any OpenAI-compatible API (Agnes AI, OpenAI, etc.)
// Run: node generate-puzzles.js
// Output: ../data/puzzles.json

const fs = require('fs');
const path = require('path');
const https = require('https');

// ⚠️ Replace with your actual API key from agnes-ai.com
const API_KEY = process.env.AI_API_KEY || 'your-key-here';
const API_URL = process.env.AI_API_URL || 'https://agnes-ai.com/v1/chat/completions';
const MODEL = process.env.AI_MODEL || 'gpt-4o-mini'; // Adjust to models available on Agnes AI

const PUZZLE_COUNT = 5;

const prompt = `You are a puzzle generator. Generate ${PUZZLE_COUNT} word puzzles for today (${new Date().toISOString().split('T')[0]}). 

Return ONLY valid JSON array (no markdown, no code fences):
[
  {
    "id": "wordle-YYYYMMDD",
    "type": "wordle",
    "date": "YYYY-MM-DD",
    "answer": "5-letter uppercase word",
    "clues": ["A short clue for the word"],
    "difficulty": "medium"
  },
  {
    "id": "crossword-YYYYMMDD", 
    "type": "mini-crossword",
    "date": "YYYY-MM-DD",
    "grid": ["5x5 grid rows as string of uppercase letters"],
    "clues": {
      "across": ["1 Across clue"],
      "down": ["1 Down clue"]
    }
  },
  {
    "id": "anagram-YYYYMMDD",
    "type": "anagram",
    "date": "YYYY-MM-DD",
    "scrambled": "RSTLNE",
    "answer": "LERNTS",
    "hint": "Category or theme"
  }
]

Rules:
- Words must be common English words (5-7 letters)
- No obscure, offensive, or trademarked words
- Puzzles should be solvable by average players
- Vary difficulty across puzzles`;

function makeRequest() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a word puzzle generator. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const url = new URL(API_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const content = json.choices?.[0]?.message?.content || '';
          resolve(content);
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}\nBody: ${body.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('🤖 Generating daily puzzles...');
  
  // Create data directory
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  try {
    const content = await makeRequest();
    
    // Clean response in case it has markdown fences
    let clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const puzzles = JSON.parse(clean);
    
    // Validate
    if (!Array.isArray(puzzles) || puzzles.length === 0) {
      throw new Error('Invalid puzzle format');
    }

    // Save with date-based filename
    const today = new Date().toISOString().split('T')[0];
    const outputPath = path.join(dataDir, `puzzles-${today}.json`);
    
    const output = {
      generated: today,
      count: puzzles.length,
      puzzles: puzzles
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`✅ Generated ${puzzles.length} puzzles → data/puzzles-${today}.json`);
    
    // Also update latest.json for the site to read
    fs.writeFileSync(
      path.join(dataDir, 'latest.json'),
      JSON.stringify(output, null, 2)
    );
    console.log(`✅ Updated data/latest.json`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
