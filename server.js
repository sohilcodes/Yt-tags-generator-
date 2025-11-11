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

// ✅ Updated endpoint for Gemini v1 API
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent";

app.post("/api/analyze", async (req, res) => {
  const { title, description } = req.body;
  if (!GEMINI_API_KEY) {
    return res.status(400).json({ error: "Missing Gemini API key" });
  }

  const prompt = `
You are a YouTube SEO expert.
Generate 10 high-performing YouTube tags in JSON format:
{
  "tags": [
    {"tag": "example tag", "relevance_score": 92, "search_volume": "~40k", "user_interest_percent": 80}
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
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const text =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No valid output from Gemini.";
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    res.json(data);
  } catch (error) {
    console.error("Gemini API Error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Gemini API request failed",
      details: error.response?.data || error.message,
    });
  }
});

app.listen(PORT, () =>
  console.log(`🚀 Gemini Analyzer running on port ${PORT}`)
);
