const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.AI_API_KEY;
const API_URL = process.env.AI_API_URL || 'https://apihub.agnes-ai.com/v1/chat/completions';
const MODEL = process.env.AI_MODEL || 'agnes-2.0-flash';

const PUZZLE_COUNT = 5;

const prompt = `You are a puzzle generator. Generate ${PUZZLE_COUNT} word puzzles for today (${new Date().toISOString().split('T')[0]}). Return ONLY valid JSON array:
[
  {"id":"wordle-YYYYMMDD","type":"wordle","date":"YYYY-MM-DD","answer":"5-letter uppercase word","clues":["Short clue"],"difficulty":"medium"},
  {"id":"wh-YYYYMMDD","type":"wordhurdle","date":"YYYY-MM-DD","answer":"6-letter uppercase word","clues":["Short clue"],"difficulty":"hard"},
  {"id":"crossword-YYYYMMDD","type":"mini-crossword","date":"YYYY-MM-DD","grid":["APPLE","H...","...R.","...E."],"numbers":{"A1":"1-Across: A fruit","H2":"2-Down: A greeting"},"answers":{"00":"A","01":"P","02":"P","03":"L","04":"E","10":"H","20":"A","30":"R","31":"E","40":"E"}},
  {"id":"anagram-YYYYMMDD","type":"anagram","date":"YYYY-MM-DD","scrambled":"RSTLNE","answer":"LERNTS","hint":"Category"}
]

MINI-CROSSWORD RULES (5x5 grid):
- 5 rows of exactly 5 characters each
- Use . for black/unused cells, letters for playable cells
- Include "numbers" with position prefix (e.g. "A1" for Across-1, "D2" for Down-2)
- Include "answers" with cell positions as keys and letters as values
- Must be a real crossword with valid intersections
- Clues should be clear and fair

Include AT LEAST one 6-letter wordle (type: wordhurdle) and one mini crossword.`;

function makeRequest() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a word puzzle generator. Respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
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
          const content = json.choices?.[0]?.message?.content;
          if (content) resolve(content);
          else reject(new Error('No content in response: ' + JSON.stringify(json).slice(0, 200)));
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
  
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  try {
    const content = await makeRequest();
    let clean = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
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
