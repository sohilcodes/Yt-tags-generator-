import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent";

app.post("/api/analyze", async (req, res) => {
  const { title, description } = req.body;
  if (!title)
    return res.json({ error: "Please provide a YouTube video title." });

  const prompt = `
You are a YouTube SEO Expert.
Generate 10 optimized YouTube tags relevant to this video.
Return ONLY valid JSON in the format below — no explanations, no markdown:
{
  "tags": [
    {"tag": "keyword1"},
    {"tag": "keyword2"}
  ]
}
Title: ${title}
Description: ${description || "No description provided"}
`;

  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    const data = await response.json();

    // 🔍 Debug logs
    // console.log(JSON.stringify(data, null, 2));

    let text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.output_text ||
      "";

    // Clean and extract JSON
    const match = text.match(/```json([\s\S]*?)```/);
    const cleanText = match ? match[1].trim() : text;
    let result;
    try {
      result = JSON.parse(cleanText);
    } catch {
      result = { raw: cleanText };
    }

    if (result.tags && Array.isArray(result.tags)) {
      res.json(result);
    } else {
      res.json({ raw: result });
    }
  } catch (err) {
    console.error(err);
    res.json({ error: "Gemini request failed: " + err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
