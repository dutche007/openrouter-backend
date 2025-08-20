import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

app.post("/api/chat", async (req, res) => {
  const { prompt, model, sessionId } = req.body;

  try {
    let apiUrl = "";
    let headers = {};
    let body = {};

    // Gemini handling
    if (model === "gemini") {
      apiUrl = "https://generativelanguage.googleapis.com/v1beta2/models/chat-bison-001:generateMessage";
      headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`,
      };
      body = JSON.stringify({
        prompt: { text: prompt },
        temperature: 0.7,
        candidateCount: 1,
      });

    // OpenRouter or other models
    } else {
      apiUrl = "https://openrouter.ai/v1/chat/completions";
      headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      };
      body = JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        session: sessionId,
      });
    }

    // Use native fetch (Node 18+)
    const response = await fetch(apiUrl, { method: "POST", headers, body });
    const data = await response.json();

    let reply;
    if (model === "gemini") {
      reply = data?.candidates?.[0]?.content?.[0]?.text || "No reply from Gemini.";
    } else {
      reply = data?.choices?.[0]?.message?.content || "No reply from OpenRouter.";
    }

    res.json({ choices: [{ message: { content: reply } }] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: err.message } });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
