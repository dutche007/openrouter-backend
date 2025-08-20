import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config(); // only used locally; Render uses its dashboard env

const app = express();
app.use(bodyParser.json());
app.use(express.static("public")); // serves index.html and assets

// --- API route ---
app.post("/api/chat", async (req, res) => {
  const { prompt, model, sessionId } = req.body;

  try {
    let apiUrl, headers, body;

    if (model === "gemini") {
      // --- Google Gemini API ---
      apiUrl =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";
      headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      };
      body = JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
    } else {
      // --- OpenRouter API ---
      apiUrl = "https://openrouter.ai/api/v1/chat/completions";
      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      };
      body = JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        provider: { order: ["openai", "anthropic"] },
        session_id: sessionId,
      });
    }

    const response = await fetch(apiUrl, { method: "POST", headers, body });
    const data = await response.json();

    if (!response.ok) {
      console.error("Server Error:", data);
      return res.status(500).json({ error: data.error || "Unknown error" });
    }

    let reply;
    if (model === "gemini") {
      reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "(No response)";
    } else {
      reply = data.choices?.[0]?.message?.content || "(No response)";
    }

    res.json({
      choices: [{ message: { content: reply } }],
    });

    console.log(`[${new Date().toISOString()}] ${model}: ${prompt}`);
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Use Render's PORT env, fallback to 10000 locally ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
