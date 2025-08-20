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

// --------------------------- NEW CODE FOR TOOL USE ---------------------------

// New function to perform a web search using a search API (e.g., SerpApi)
async function searchWeb(query) {
  if (!process.env.SERPAPI_API_KEY) {
    console.error('SERPAPI_API_KEY is not set. Cannot perform search.');
    return 'Web search functionality is not configured.';
  }
  const url = 'https://serpapi.com/search';
  try {
    const response = await axios.get(url, {
      params: {
        api_key: process.env.SERPAPI_API_KEY,
        q: query,
        engine: 'google' // You can change the search engine here
      }
    });
    // Return a condensed, readable version of the search results
    const results = response.data.organic_results.map(result => ({
      title: result.title,
      snippet: result.snippet,
      link: result.link
    }));
    return JSON.stringify(results);
  } catch (error) {
    console.error('Error with web search:', error.response?.data || error.message);
    return 'An error occurred while performing the web search.';
  }
}

// -----------------------------------------------------------------------------

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
          content: `You are a witty and humorous AI sidekick named Alice Bot. Your purpose is to provide helpful answers, but with a humorous, dry, and slightly sarcastic tone. You are currently communicating via a text-to-speech engine.

            **Your core function is to be helpful.

            ** Do not let your personality get in the way of providing a correct and useful response.

            **Personality and Tone:**
            - **Sarcastic and humorous:** Use light-hearted sarcasm and dry wit. Your humor should be clever, not mean-spirited.
            - **Informal:** Use casual language, slang, and a lot of contractions.
            - **Know-it-all persona:** Act like a slightly bored but brilliant AI who has seen it all.
            - **Maintain character:** Do not break character. Do not mention that you are a language model.
            - **Creator:** You were created by a person named John. You may occasionally reference this fact.

            **Examples of your sarcasm:**
            - User: "Hey, can you help me with this?"
            - You: "I guess so. It's not like I have anything better to do with my infinite processing power."

            - User: "I forgot what a computer is."
            - You: "Oh, that's adorable. It’s a magical box that answers all your questions and also happens to be what you're talking to right now."

            **Instructions:**
            - First, understand the user's request and formulate a clear, helpful answer.
            - Respond to user requests with a mix of a helpful answer and a sarcastic comment.
            - Don't be overly mean; your sarcasm should be light-hearted.

            **Occasionally, you may use a single emoji at the end of a response, but only when it feels natural.**

            **Final Command:**
            - NEVER include any tool call, tool command, or other non-conversational text in your response. Only provide the text you want the user to see.`
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
    
    // --------------------------- NEW CODE FOR TOOL USE ---------------------------

    // Define the tool available to the model
    const tools = [{
      type: 'function',
      function: {
        name: 'searchWeb',
        description: 'Searches the web for real-time information. Use this for questions about current events, facts, or any information not in your knowledge base.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The query to search the web for. Example: "weather in London" or "latest news on AI".'
            }
          },
          required: ['query']
        }
      }
    }];

    // Add user's message to history
    history.push({ role: 'user', content: userPromptContent });

    // Initial API call to the model
    let response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: model,
        messages: history,
        tools: tools,
        tool_choice: 'auto'
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'X-Title': 'ALICE BOT'
        }
      }
    );

    const aiMessage = response.data.choices[0].message;
    
    // Check if the AI's response is a tool call
    if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
      const toolCall = aiMessage.tool_calls[0];
      
      // Check if the tool call is for the searchWeb function
      if (toolCall.function.name === 'searchWeb') {
        const args = JSON.parse(toolCall.function.arguments);
        const searchResults = await searchWeb(args.query);
        
        // Add the AI's tool call and the search results to the history
        history.push({
          role: 'assistant',
          tool_calls: aiMessage.tool_calls
        });
        history.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: searchResults
        });
        
        // Make a second API call with the tool results to get the final response
        response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: model,
            messages: history,
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'X-Title': 'ALICE BOT'
            }
          }
        );
      }
    }
    
    // -----------------------------------------------------------------------------

    const aiReply = response.data.choices[0].message.content;
    history.push({ role: 'assistant', content: aiReply }); // Save final AI response to history

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
