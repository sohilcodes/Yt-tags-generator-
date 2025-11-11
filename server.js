require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.post("/api/analyze", async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!GEMINI_API_KEY) return res.status(400).json({ error: "Missing Gemini API key" });

    const prompt = `
You are a YouTube SEO expert. Based on this title and description, return 10 optimized tags in JSON format:
{
  "tags": [
    {"tag": "keyword", "relevance_score": 90, "search_volume": "~10k", "user_interest_percent": 80}
  ]
}
Title: ${title}
Description: ${description}
`;

    const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    const r = await axios.post(endpoint, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = r.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No output";
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    res.json(data);
  } catch (err) {
    console.error("Gemini Error:", err.response?.data || err.message);
    res.status(500).json({
      error: "Gemini API request failed",
      details: err.response?.data || err.message,
    });
  }
});

app.listen(PORT, () => console.log(`🚀 Gemini Server running on port ${PORT}`));
