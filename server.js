import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;

app.post("/api/chat", async (req, res) => {
  const { prompt, model, sessionId } = req.body;

  try {
    if (model === "gemini") {
      // Map frontend "gemini" to actual Gemini model ID
      const geminiModel = "gemini-1.5-flash-latest"; 
      // you can change to "gemini-1.5-pro-latest" if preferred

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }]
          })
        }
      );

      const data = await geminiRes.json();

      return res.json({
        choices: [
          {
            message: {
              content:
                data.candidates?.[0]?.content?.parts?.[0]?.text || "No response",
            },
          },
        ],
      });
    }

    // --- Other Models (OpenRouter) ---
    const otherRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await otherRes.json();
    res.json(data);
  } catch (err) {
    console.error("Error in /api/chat:", err);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;

app.post("/api/chat", async (req, res) => {
  const { prompt, model, sessionId } = req.body;

  try {
    if (model === "gemini") {
      // Map frontend "gemini" to actual Gemini model ID
      const geminiModel = "gemini-1.5-flash-latest"; 
      // you can change to "gemini-1.5-pro-latest" if preferred

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }]
          })
        }
      );

      const data = await geminiRes.json();

      return res.json({
        choices: [
          {
            message: {
              content:
                data.candidates?.[0]?.content?.parts?.[0]?.text || "No response",
            },
          },
        ],
      });
    }

    // --- Other Models (OpenRouter) ---
    const otherRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await otherRes.json();
    res.json(data);
  } catch (err) {
    console.error("Error in /api/chat:", err);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
