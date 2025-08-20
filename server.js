// server.js
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error("❌ OPENROUTER_API_KEY not set in environment variables");
  process.exit(1);
}

app.use(express.json());

app.get("/", (req, res) => {
  res.send("OpenRouter Backend is running!");
});

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  if (!messages) {
    return res.status(400).json({ error: "Messages array is required" });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
      }),
    });

    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("Non-JSON response received:", text);
      return res.status(500).json({ error: "Invalid response from OpenRouter API", raw: text });
    }

    res.json(data);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
