// server.js
const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();

// Enable CORS for all routes
app.use(cors());

// Parse JSON requests
app.use(express.json());

// Serve frontend files from 'public'
app.use(express.static('public'));

// In-memory chat storage per session (simple, no DB)
let chats = {}; // { sessionId: [ { role, content }, ... ] }

// Models endpoint (to avoid hardcoding in frontend)
app.get('/api/models', (req, res) => {
    res.json([
        { id: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free", name: "Dolphin Mistral 24B (Free)" },
        { id: "meta-llama/llama-3.2-3b-instruct:free", name: "Llama 3.2 3B (Free)" },
        { id: "mistralai/mistral-7b-instruct", name: "Mistral 7B (Free)" },
        { id: "qwen/qwen-2.5-coder-32b-instruct:free", name: "Qwen 2.5 Coder 32B (Free)" }
    ]);
});

// Reset conversation endpoint
app.post('/api/reset', (req, res) => {
    const { sessionId } = req.body;
    if (sessionId && chats[sessionId]) {
        delete chats[sessionId];
    }
    res.json({ success: true });
});

// Chat API endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { prompt, model, sessionId } = req.body;

        if (!prompt || !model || !sessionId) {
            return res.status(400).json({ error: "Prompt, model, and sessionId are required" });
        }

        // Initialize chat history if needed with system instruction
        if (!chats[sessionId]) {
            chats[sessionId] = [
                { role: 'system', content: 'You are a friendly, conversational assistant. Keep answers short and casual unless the user asks for more detail.' }
            ];
        }

        // Add user message
        chats[sessionId].push({ role: 'user', content: prompt });

        console.log(`[${new Date().toISOString()}] ${model}: ${prompt}`);

        // Call OpenRouter API with full chat history
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: model,
                messages: chats[sessionId],
                stream: false
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'X-Title': 'My AI Chat App'
                }
            }
        );

        const reply = response.data.choices[0].message;

        // Save assistant reply
        chats[sessionId].push(reply);

        res.json(response.data);
    } catch (error) {
        console.error('Server Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ error: error.response?.data?.error?.message || error.message });
    }
});

// Use dynamic port for Render deployment
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
