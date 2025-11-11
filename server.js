// === YouTube Tag Analyzer using Gemini API ===
// Compatible with Render, Glitch, Replit
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

// --- ROUTE ---
app.post("/api/analyze", async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!GEMINI_API_KEY)
      return res.status(400).json({ error: "Missing Gemini API key" });

    const prompt = `
You are a YouTube SEO expert. Based on the following video title and description,
generate 10 optimized YouTube tags in JSON format.

Title: ${title}
Description: ${description}

Response format:
{
  "tags": [
    {"tag": "keyword", "relevance_score": 90, "search_volume": "~10k", "user_interest_percent": 80}
  ]
}`;

    // ✅ Gemini API call
    const r = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] }
    );

    // ✅ Extract AI text
    const rawText =
      r.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response from Gemini";

    // ✅ Try parsing JSON safely
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { raw: rawText };
    }

    res.json(data);
  } catch (error) {
    console.error("Gemini Error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Gemini API request failed",
      details: error.response?.data || error.message,
    });
  }
});

app.listen(PORT, () => console.log(`🚀 Gemini Server running on port ${PORT}`));
