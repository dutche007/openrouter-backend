// server.js
const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

dotenv.config();
const app = express();

// Session storage (in-memory; use Redis for production)
const sessions = new Map(); // { sessionId: [{role: 'system/user/assistant', content: '...'}, ...] }

// Allowed models (whitelist from frontend dropdown)
const allowedModels = [
  'qwen/qwen-2.5-coder-32b-instruct:free',
  'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'mistralai/mistral-7b-instruct'
];

// Enable CORS for all routes
app.use(cors());

// Parse JSON requests
app.use(express.json());

// Rate limiting: 100 requests per 15 minutes per IP
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests, please try again later.'
}));

// Serve frontend files from 'public'
app.use(express.static('public'));

// Chat API endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt, model, sessionId } = req.body;

    // Validate input
    if (!prompt || !model || !sessionId) {
      return res.status(400).json({ error: 'Prompt, model, and sessionId are required' });
    }
    if (!allowedModels.includes(model)) {
      return res.status(400).json({ error: 'Invalid model selected' });
    }

    // Sanitize prompt (trim and limit length)
    const sanitizedPrompt = prompt.trim().slice(0, 2000);
    if (!sanitizedPrompt) {
      return res.status(400).json({ error: 'Prompt is empty after sanitization' });
    }

    // Get or initialize session history
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, [
        { role: 'system', content: 'You are ALICE BOT, a helpful AI assistant with a cyberpunk vibe.' }
      ]);
    }
    const history = sessions.get(sessionId);
    history.push({ role: 'user', content: sanitizedPrompt });

    // Send request to OpenRouter with full history
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: model,
        messages: history
        // tools omitted entirely for production
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'X-Title': 'ALICE BOT'
        }
      }
    );

    const aiReply = response.data.choices[0].message.content;
    history.push({ role: 'assistant', content: aiReply }); // Save AI response to history

    res.json(response.data);
  } catch (error) {
    console.error('Server Error:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error?.message || error.message });
  }
});

// Optional: Reset session endpoint (call from frontend on clear)
app.post('/api/reset', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId && sessions.has(sessionId)) {
    sessions.delete(sessionId);
    res.json({ message: 'Session reset' });
  } else {
    res.status(400).json({ error: 'Invalid sessionId' });
  }
});

// Use dynamic port for Render deployment
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
