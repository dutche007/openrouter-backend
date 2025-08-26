const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

dotenv.config();
const app = express();

// --- Trust proxy to fix rate-limit X-Forwarded-For issue ---
app.set('trust proxy', 1);

// --- Session storage ---
const sessions = new Map(); // { sessionId: [{role, content}, ...] }

// --- Allowed OpenRouter models only ---
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

// --- Simple British military slang list ---
const slang = [
  'Ally', 'Threaders', 'Hoofing', 'Gleaming', 'Dhobi Dust', 'Egg Banjo', 'Gash',
  'Gen', 'Jack', 'KFS', 'Beasted', 'Civi', 'Crow', 'Buckshee', 'Daysack',
  'Crap hat', 'Dit', 'Doss Bag', 'Oggin', 'Pull up a sandbag', 'Green time machine',
  'Redders', 'Walt', 'Badmin', 'End Ex', 'Scoff', 'Cookhouse', 'Scran', 'Galley',
  'Stag', 'NAAFI', 'Scale A Parade', 'Chin-strapped', 'Bone', 'You’re in your own time now',
  'TAB', 'Yomp', 'Hanging out', 'Recce', 'Marking time'
];

// --- CORS & JSON ---
app.use(cors());
app.use(express.json());

// --- Rate limiting ---
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.'
}));

// --- Serve frontend ---
app.use(express.static('public'));

// --- Utility: inject random slang into AI response ---
function injectSlang(text) {
  if (Math.random() < 0.3) { // 30% chance to inject
    const word = slang[Math.floor(Math.random() * slang.length)];
    return text + ` (${word})`;
  }
  return text;
}

// --- Chat endpoint ---
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt, model, sessionId } = req.body;
    if (!prompt || !model || !sessionId)
      return res.status(400).json({ error: 'Prompt, model, and sessionId are required' });
    if (!allowedModels.includes(model))
      return res.status(400).json({ error: 'Invalid model selected' });

    const sanitizedPrompt = prompt.trim().slice(0, 2000);
    if (!sanitizedPrompt)
      return res.status(400).json({ error: 'Prompt is empty after sanitization' });

    // Initialize session
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, [{
        role: 'system',
        content: `
        You are a witty and humorous AI sidekick named Alice Bot.
        Answer questions using British Army Values & Standards when relevant.
        Keep a sarcastic, informal, clever tone.
        `
      }]);
    }
    const history = sessions.get(sessionId);

    // Add user message
    history.push({ role: 'user', content: sanitizedPrompt });

    // Send request to OpenRouter
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: model,
        messages: history
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'X-Title': 'ALICE BOT'
        }
      }
    );

    let aiReply = response.data.choices[0].message.content;

    // Inject slang randomly
    aiReply = injectSlang(aiReply);

    history.push({ role: 'assistant', content: aiReply });

    // Send modified response
    res.json({ choices: [{ message: { content: aiReply } }] });

  } catch (error) {
    console.error('Server Error:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error?.message || error.message });
  }
});

// --- Reset endpoint ---
app.post('/api/reset', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId && sessions.has(sessionId)) {
    sessions.delete(sessionId);
    res.json({ message: 'Session reset' });
  } else {
    res.status(400).json({ error: 'Invalid sessionId' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
