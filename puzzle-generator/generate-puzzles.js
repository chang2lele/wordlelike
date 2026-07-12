const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.AI_API_KEY;
const API_URL = process.env.AI_API_URL || 'https://apihub.agnes-ai.com/v1/chat/completions';
const MODEL = process.env.AI_MODEL || 'agnes-2.0-flash';

const PUZZLE_COUNT = 5;

const prompt = `Output ONLY a JSON array of 5 puzzles for ${new Date().toISOString().split('T')[0]}. No text, no markdown.

[
  {"id":"wordle-20260712","type":"wordle","date":"2026-07-12","answer":"APPLE","clues":["A fruit"],"difficulty":"medium"},
  {"id":"wh-20260712","type":"wordhurdle","date":"2026-07-12","answer":"GARDEN","clues":["A place with flowers"],"difficulty":"hard"},
  {"id":"crossword-20260712","type":"mini-crossword","date":"2026-07-12","grid":["APPLE","H....","..R..",".A...","..E.."],"numbers":{"A1":"1-Across: A fruit","D2":"2-Down: Greeting"},"answers":{"00":"A","01":"P","02":"P","03":"L","04":"E","10":"H","20":"R","30":"A","40":"E"}},
  {"id":"anagram-20260712","type":"anagram","date":"2026-07-12","scrambled":"RSTLNE","answer":"STERNL","hint":"Adjective"},
  {"id":"wordsearch-20260712","type":"wordsearch","date":"2026-07-12","grid":["ABCDE","FGHIJ","KLMNO","PQRST","UVWXY"],"words":["HELLO","WORLD"],"theme":"Common words"}
]

RULES: wordle=5 letters uppercase, wordhurdle=6 letters uppercase, mini-crossword=5x5 grid (5 strings of 5 chars, . for black), anagram=scrambled->answer, wordsearch=5x5 grid+words+theme. Output JSON array ONLY. Today=${new Date().toISOString().split('T')[0]}, ID date=${new Date().toISOString().split('T')[0].replace(/-/g, '')}.`;

function makeRequest() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a word puzzle generator. Respond with valid JSON only. No reasoning, no explanation, just the JSON array.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    const url = new URL(API_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
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
              const msg = json.choices?.[0]?.message;
              // Try content first, then reasoning_content
              let content = msg?.content || msg?.reasoning_content || '';
          
              const cleaned = extractJSON(content);
              console.log('DEBUG: Cleaned JSON (first 500 chars):', cleaned.slice(0, 500));
              resolve(cleaned);
            } catch (e) {
              reject(new Error(`Parse error: ${e.message}\nBody: ${body.slice(0, 200)}`));
            }
          });
        });
        req.on('error', reject);
        req.setTimeout(30000, () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });
        req.write(data);
        req.end();
      });
    }

function extractJSON(content) {
  // If already looks like JSON, return as-is
  if (content.trim().startsWith('[') || content.trim().startsWith('{')) {
    return content;
  }
  
  // Try markdown code blocks
  const codeBlockMatch = content.match(/```(?:json)?\n([\s\S]*?)\n```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1];
  }
  
  // Find ALL arrays that look like puzzle arrays (contain "id" and "type")
  const puzzleArrays = content.match(/(\[[\s\S]*\{"id"[\s\S]*\}[^\]]*\])/g);
  if (puzzleArrays && puzzleArrays.length > 0) {
    // Return the LAST one (the actual output, not the prompt example)
    return puzzleArrays[puzzleArrays.length - 1];
  }
  
  // Fallback: find any array
  const fallbackMatch = content.match(/(\[[\s\S]*\])/);
  if (fallbackMatch) {
    return fallbackMatch[1];
  }
  
  return content;
}

async function main() {
  console.log('🤖 Generating daily puzzles...');
  
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  try {
    const content = await makeRequest();
    const clean = extractJSON(content);
    console.log('DEBUG: Cleaned JSON (first 500 chars):', clean.slice(0, 500));
    const puzzles = JSON.parse(clean);
    if (!Array.isArray(puzzles) || puzzles.length === 0) throw new Error('Invalid format');

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
