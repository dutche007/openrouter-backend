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

// Chat API endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { prompt, model } = req.body;

        // Validate input
        if (!prompt || !model) {
            return res.status(400).json({ error: "Prompt and model are required" });
        }

        // Send request to OpenRouter
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: model,
                messages: [{ role: 'user', content: prompt }]
                // tools omitted entirely for production
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'X-Title': 'My AI Chat App'
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Server Error:', error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data?.error?.message || error.message });
    }
});

// Use dynamic port for Render deployment
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
