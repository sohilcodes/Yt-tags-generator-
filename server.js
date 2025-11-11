// server.js (CommonJS - use this to avoid ESM loader issues)
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(cors());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent';

app.post('/api/analyze', async (req, res) => {
  const { title, description } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Please provide a title.' });
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Missing GEMINI_API_KEY in env' });

  const prompt = `
You are a YouTube SEO Expert.
Return ONLY valid JSON in this format:
{ "tags": [ {"tag": "keyword1"}, {"tag":"keyword2"} ] }

Title: ${title}
Description: ${description || 'No description provided'}
`;

  try {
    const r = await axios.post(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      contents: [{ parts: [{ text: prompt }] }]
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const text = r.data?.candidates?.[0]?.content?.parts?.[0]?.text || r.data?.output_text || '';
    // Try to extract JSON even if wrapped in ```json ... ```
    const match = text.match(/```json([\s\S]*?)```/);
    const clean = match ? match[1].trim() : text.trim();

    let parsed;
    try { parsed = JSON.parse(clean); }
    catch { parsed = { raw: clean }; }

    if (parsed && Array.isArray(parsed.tags)) return res.json(parsed);
    // If not proper, return raw so frontend can show error
    return res.json({ raw: parsed });
  } catch (err) {
    console.error('Gemini/axios error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Gemini request failed', details: err.response?.data || err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
