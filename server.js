// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) console.warn('OPENAI_API_KEY not set in .env');

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini'; // change if you prefer another model

// helper: build a precise JSON-only prompt so model returns well-formed JSON
function buildPrompt(title, description) {
  const combined = (title || '') + '\n\n' + (description || '');
  return `You are an expert YouTube SEO assistant. Based on the following video title and description, produce a JSON array of up to 25 suggested tags (short keywords or short phrases).
Return ONLY valid JSON (no extra explanation). The JSON must be exactly:

{
  "source":"AI_Estimate",
  "generated_from": { "title": "...", "description_snippet": "..." },
  "tags": [
    { "tag": "...",
      "relevance_score": 0-100,         // integer, how strongly this tag matches content
      "search_volume_monthly_est": "...", // AI estimate, e.g., \"~12000\" or \"~5k-10k\"
      "user_interest_percent": 0-100    // integer percent estimate of CTR/engagement
    },
    ...
  ]
}

Rules:
1. Give at most 25 tags.
2. Keep tag strings short (1-4 words), lowercase preferred.
3. relevance_score and user_interest_percent should be integers 0-100. search_volume_monthly_est should be a short string like \"~12k\" or \"~1k-5k\". If unknown, estimate conservatively but don't invent unrealistic huge numbers.
4. For generated_from.description_snippet include the first 120 characters of the description (escaped).
5. The output MUST be valid JSON. No commentary or text outside the JSON block.

Now analyze this content and produce the JSON.

Title:
${title || ''}

Description:
${(description || '').slice(0,1000)}
`;
}

async function callOpenAI(prompt) {
  const payload = {
    model: MODEL,
    messages: [
      { role: 'system', content: 'You are a concise JSON-only assistant for keyword analysis.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2,
    max_tokens: 800
  };

  const resp = await axios.post(OPENAI_URL, payload, {
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });

  return resp.data;
}

function extractJsonFromText(text) {
  // try direct parse
  try {
    return JSON.parse(text);
  } catch (e) {
    // attempt to extract first {...} block
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch (e2) { /* fallthrough */ }
    }
  }
  return null;
}

app.post('/api/analyze', async (req, res) => {
  try {
    const { title = '', description = '' } = req.body || {};
    if (!title && !description) return res.status(400).json({ error: 'Provide title or description in request body.' });

    const prompt = buildPrompt(title, description);
    const aiResp = await callOpenAI(prompt);
    const text = aiResp.choices?.[0]?.message?.content || aiResp.choices?.[0]?.text || '';
    const parsed = extractJsonFromText(text);

    if (!parsed) {
      return res.status(500).json({ error: 'Failed to parse AI response as JSON', raw: text });
    }

    // add timestamp and return
    parsed.generated_at = new Date().toISOString();
    return res.json(parsed);
  } catch (err) {
    console.error(err?.response?.data || err.message);
    return res.status(500).json({ error: 'Server error', details: err?.response?.data || err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
