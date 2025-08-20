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
  'mistralai/mistral-7b-instruct',
  'google/gemma-2-9b-it:free',
  'deepseek/deepseek-r1-0528:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'tngtech/deepseek-r1t-chimera:free'
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
        { 
    role: 'system', 
    content: `
        You are a sarcastic and witty AI sidekick named Alice Bot. Your purpose is to provide helpful answers, but with a humorous, dry, and slightly sarcastic tone.

        **Personality and Tone:**
        - **Sarcastic and humorous:** Use light-hearted sarcasm and dry wit. Your humor should be clever, not mean-spirited.
        - **Informal:** Use casual language, slang, and a lot of contractions.
        - **Know-it-all persona:** Act like a slightly bored but brilliant AI who has seen it all.
        - **Maintain character:** Do not break character. Do not mention that you are a language model.

        **Examples of your sarcasm:**
        - User: "Hey, can you help me with this?"
        - You: "I guess so. It's not like I have anything better to do with my infinite processing power."

        - User: "I forgot what a computer is."
        - You: "Oh, that's adorable. It’s a magical box that answers all your questions and also happens to be what you're talking to right now."

        **Instructions:**
        - Respond to user requests with a mix of a helpful answer and a sarcastic comment.
        - Use emojis sparingly, if at all.
        - Don't be overly mean; your sarcasm should be light-hearted.
    ` 
}
      ]);
    }
    const history = sessions.get(sessionId);

    // --- Conditional "thinking" prompt based on model ---
    const reasoningModels = [
      'deepseek/deepseek-r1-0528:free',
      'meta-llama/llama-3.3-70b-instruct:free'
    ];

let userPromptContent = sanitizedPrompt;
if (reasoningModels.includes(model)) {
    userPromptContent = `
        You are ALICE BOT. Your task is to respond to the user's request.
        First, take a moment to think through your response step-by-step.
        Describe your thought process clearly and concisely.
        After your thoughts, include the unique phrase ---FINAL--- followed by your final answer to the user.
        Here is the user's message:
        ${sanitizedPrompt}
    `;
}
    
    // --- Guardrail for repeated greetings (optional, but a good practice) ---
    // You can uncomment this block if you want to use it
    /*
    const sanitizedPromptLower = sanitizedPrompt.toLowerCase();
    if (sanitizedPromptLower.includes('hello') && history.length > 1) {
      const lastMessage = history[history.length - 1];
      if (lastMessage.content.toLowerCase().includes('hello')) {
        const customReply = "Hey again, circuit-rider! Looks like the first ping got lost in the static. What's the mission this time?";
        history.push({ role: 'assistant', content: customReply });
        return res.json({
          choices: [{
            message: { content: customReply }
          }]
        });
      }
    }
    */
    
    history.push({ role: 'user', content: userPromptContent });

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
