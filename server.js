// === YouTube Tag Analyzer – Gemini 2.0 Flash ===
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

// ✅ Official Gemini 2.0 Flash endpoint (v1)
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent";

app.post("/api/analyze", async (req, res) => {
  const { title = "", description = "" } = req.body;
  if (!GEMINI_API_KEY)
    return res.status(400).json({ error: "Missing Gemini API key" });

  const prompt = `
You are a YouTube SEO Expert.
Analyze this video title and description and return 10 optimized tags in JSON format:
{
 "tags": [
   {"tag": "keyword", "relevance_score": 95, "search_volume": "~50k", "user_interest_percent": 80}
 ]
}
Title: ${title}
Description: ${description}
`;

  try {
    const response = await axios.post(
      `${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const text =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response from Gemini.";
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    res.json(data);
  } catch (err) {
    console.error("Gemini API Error:", err.response?.data || err.message);
    res.status(500).json({
      error: "Gemini API request failed",
      details: err.response?.data || err.message,
    });
  }
});

app.listen(PORT, () =>
  console.log(`🚀 Gemini 2.0 Flash server running on port ${PORT}`)
);
