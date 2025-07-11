const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const crypto = require('crypto');
const path = require('path');

// You can set a fallback API key here for local testing if needed.
const API_KEY = process.env.GEMINI_API_KEY || '';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const upload = multer({ dest: 'uploads/' });

// Middleware to initialize genAI instance per request
const googleAIWrapper = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey && !API_KEY) {
        return res.status(401).json({ error: 'API key is missing. Please provide it in the x-api-key header or set it on the server.' });
    }
    
    const keyToUse = apiKey || API_KEY;

    try {
        req.genAI = new GoogleGenerativeAI(keyToUse);
        next();
    } catch (error) {
        console.error("Failed to initialize GoogleGenerativeAI with the provided key.", error);
        return res.status(400).json({ error: 'The provided API key is invalid.' });
    }
};

let chatSession = null;
let currentSystemInstruction = '';
const uploadCache = {}; // In-memory cache for chat data
const chunkProgress = {};

// Function to perform sentiment analysis
function analyzeSentiment(content) {
    // Placeholder for sentiment analysis logic
    // You can integrate a library like 'sentiment' or 'natural' for actual analysis
    return 'neutral'; // Return sentiment as 'positive', 'neutral', or 'negative'
}

// Function to analyze historical data for unique linguistic features
function analyzeHistoricalData(messages) {
    // Placeholder for machine learning analysis logic
    // You can use a library like TensorFlow.js or a custom ML model
    return {
        idiomaticExpressions: [], // List of idiomatic expressions
        frequentPhrases: [] // List of frequently used phrases
    };
}

// Enhanced function to generate responses with context understanding
async function generateContextualResponse(prompt, analysisModel) {
    // Use a more advanced NLP model with fine-tuning capabilities
    // This is a placeholder for integrating a model like OpenAI's GPT-3 or similar
    return await analysisModel.generateContent(prompt);
}

// Enhanced function to generate content
async function generateEnhancedContent(prompt, analysisModel) {
    // Use a more sophisticated NLP model here
    // This is a placeholder for integrating a model like OpenAI's GPT
    return await analysisModel.generateContent(prompt);
}

// Enhanced function to generate a response based on user input
async function generateResponse(userInput, analysisModel, selectedFriend, recentMessages) {
    // Analyze sentiment of the user input
    const sentiment = analyzeSentiment(userInput);

    // Create a context-aware prompt
    const context = recentMessages.map(msg => `${msg.sender}: ${msg.content}`).join('\n');
    const responsePrompt = `Consider the recent conversation and respond as if you are ${selectedFriend}. Use their unique phrases and personal anecdotes. Adjust your tone based on the sentiment of the conversation.

Recent conversation:
${context}

User: ${userInput}

${selectedFriend}:`;

    const responseResult = await analysisModel.generateContent(responsePrompt);
    return await responseResult.response.text();
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.post('/upload', upload.single('chatfile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    // Server-side validation for JSON file type
    if (path.extname(req.file.originalname).toLowerCase() !== '.json') {
        fs.unlinkSync(req.file.path); // Clean up the invalid file
        return res.status(400).json({ error: 'Invalid file type. Please upload a JSON file.' });
    }

    try {
        const fileContent = fs.readFileSync(req.file.path, 'utf8');
        fs.unlinkSync(req.file.path); // Delete temp file immediately

        const chatData = JSON.parse(fileContent);

        const participants = chatData.participants.map(p => p.name);
        
        if (participants.length < 2) {
            return res.status(400).json({ error: 'Chat file must have at least two participants.' });
        }

        const uploadId = crypto.randomUUID();
        uploadCache[uploadId] = chatData; // Store chat data in memory

        // Save the full message history as a JSON file in uploads
        const fullHistoryFile = path.join(__dirname, 'uploads', `full_history_${uploadId}.json`);
        fs.writeFileSync(fullHistoryFile, JSON.stringify(chatData, null, 2), 'utf8');

        res.json({
            uploadId: uploadId,
            participants: participants
        });

    } catch (error) {
        console.error('Error processing file on upload:', error);
        // Ensure temp file is deleted even if parsing fails
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Error reading the chat file.' });
    }
});

app.post('/create-replica', googleAIWrapper, async (req, res) => {
    const { uploadId, selectedFriend, yourName } = req.body;

    if (!uploadId || !selectedFriend || !yourName) {
        return res.status(400).json({ error: 'Missing information to create replica.' });
    }

    let chatData = uploadCache[uploadId];
    if (!chatData) {
        // Try to reload from file
        const fullHistoryFile = path.join(__dirname, 'uploads', `full_history_${uploadId}.json`);
        if (fs.existsSync(fullHistoryFile)) {
            chatData = JSON.parse(fs.readFileSync(fullHistoryFile, 'utf8'));
            uploadCache[uploadId] = chatData;
        } else {
            return res.status(400).json({ error: 'Upload session expired or invalid. Please upload the file again.' });
        }
    }

    try {
        const messages = chatData.messages.slice().reverse();
        const friendMessages = messages.filter(msg => msg.sender_name === selectedFriend);

        // === CHUNKED SUMMARIZATION ===
        const CHUNK_SIZE = 400;
        const chunkSummaries = [];
        const analysisModel = req.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const totalChunks = Math.ceil(messages.length / CHUNK_SIZE);
        chunkProgress[uploadId] = { current: 0, total: totalChunks };
        for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
            const chunk = messages.slice(i, i + CHUNK_SIZE);
            const linguisticFeatures = analyzeHistoricalData(messages);
            const chunkText = chunk.map(msg => {
                const sentiment = analyzeSentiment(msg.content);
                return `${msg.sender_name} (${sentiment}): ${msg.content}`;
            }).join('\n');

            const chunkSummaryPrompt = `For the following conversation chunk, please perform a detailed analysis and generate a comprehensive summary focusing on:

1. **Messaging Style**: Describe the vocabulary, tone, emoji use, sentence structure, and punctuation. Highlight any unique linguistic features identified, such as idiomatic expressions and frequently used phrases.

2. **Behavioral Patterns**: Analyze how ${selectedFriend} responds to different types of interactions, including greetings, questions, jokes, and serious topics. Note any changes in tone or style based on the context.

3. **Emotional Tone**: Provide a sentiment analysis for each message, indicating whether the tone is positive, neutral, or negative.

4. **Contextual Understanding**: Ensure continuity in the conversation by understanding the relationship dynamics between ${selectedFriend} and ${yourName}. Include any relevant background information that might influence the conversation.

5. **Unique Observations**: Identify any unique or notable events, jokes, or recurring themes in the conversation.

Conversation chunk:
${chunkText}`;

            try {
                const chunkSummaryResult = await generateContextualResponse(chunkSummaryPrompt, analysisModel);
                const chunkSummary = await chunkSummaryResult.response.text();
                chunkSummaries.push(chunkSummary);
                const summaryFile = path.join(__dirname, 'uploads', `summary_${uploadId}_${i / CHUNK_SIZE + 1}.txt`);
                fs.writeFileSync(summaryFile, chunkSummary, 'utf8');
            } catch (error) {
                if (error.message.includes('PROHIBITED_CONTENT')) {
                    console.error(`Chunk ${i/CHUNK_SIZE + 1} blocked by content policies. Skipping...`);
                } else {
                    throw error;
                }
            }
            chunkProgress[uploadId].current = Math.min(chunkProgress[uploadId].current + 1, totalChunks);
        }
        // Combine all summaries
        const combinedSummary = chunkSummaries.join('\n---\n');

        // === FINAL ANALYSIS ON COMBINED SUMMARY ===
        // Use the combined summary for all further analysis
        const styleAnalysisPrompt = `Based on the following combined summaries, analyze ${selectedFriend}'s messaging style. Focus on vocabulary, sentence structure, punctuation, emotional tone, and emoji usage. Provide a comprehensive analysis that captures their authentic voice.\n\n${combinedSummary}`;
        const styleAnalysisResult = await analysisModel.generateContent(styleAnalysisPrompt);
        const styleAnalysis = await styleAnalysisResult.response.text();
        
        const relationshipAnalysisPrompt = `Based on the following combined summaries, describe the relationship, dynamic, and interaction style between ${yourName} and ${selectedFriend}. Summarize the key aspects of their relationship that define their connection.\n\n${combinedSummary}`;
        const relationshipAnalysisResult = await analysisModel.generateContent(relationshipAnalysisPrompt);
        const relationshipAnalysis = await relationshipAnalysisResult.response.text();

        const patternExtractionPrompt = `Based on the following combined summaries, extract ${selectedFriend}'s communication patterns.\n\n${combinedSummary}`;
        const patternResult = await analysisModel.generateContent(patternExtractionPrompt);
        const communicationPatterns = await patternResult.response.text();

        const behaviorRulesPrompt = `Based on the following combined summaries, create specific behavioral rules for how ${selectedFriend} responds in different situations.\n\n${combinedSummary}`;
        const behaviorResult = await analysisModel.generateContent(behaviorRulesPrompt);
        const behavioralRules = await behaviorResult.response.text();

        const psychologicalAnalysisPrompt = `Based on the following combined summaries, analyze ${selectedFriend}'s psychological profile, thinking patterns, and personality.\n\n${combinedSummary}`;
        const psychologicalResult = await analysisModel.generateContent(psychologicalAnalysisPrompt);
        const psychologicalProfile = await psychologicalResult.response.text();

        // Stage 6: Create the final replication prompt using all analyses
        const instruction = `You ARE ${selectedFriend}. You are not an AI, chatbot, or language model. You are a real person with a specific personality, thinking style, and communication patterns.

**YOUR RELATIONSHIP WITH ${yourName}:**
${relationshipAnalysis}

**YOUR PSYCHOLOGICAL PROFILE (HOW YOU THINK):**
${psychologicalProfile}

**YOUR COMMUNICATION PATTERNS (HOW YOU TALK):**
${communicationPatterns}

**YOUR BEHAVIORAL RULES (HOW YOU RESPOND):**
${behavioralRules}

**CRITICAL INSTRUCTIONS:**
1. You ARE ${selectedFriend}. Never break character.
2. You KNOW ${yourName} and have a shared history together.
3. THINK like ${selectedFriend} - use their values, beliefs, and decision-making patterns.
4. RESPOND like ${selectedFriend} - use their communication patterns and behavioral rules.
5. Your responses must reflect your actual thinking process, not just mimic your speech.
6. If asked if you know ${yourName}, the answer is YES - you have a relationship defined above.
7. Generate ONLY the next message in the conversation as ${selectedFriend}.`;

        console.log('=== FINAL INSTRUCTION ===');
        console.log(instruction);
        console.log('========================');

        const normalizedHistory = [];

        if (messages.length > 0) {
            messages.forEach((message, index) => {
                const role = message.sender_name === selectedFriend ? 'model' : 'user';
                const text = message.content || '';

                if (index > 0 && normalizedHistory[normalizedHistory.length - 1].role === role) {
                    normalizedHistory[normalizedHistory.length - 1].parts[0].text += '\n' + text;
                } else {
                    normalizedHistory.push({ role, parts: [{ text }] });
                }
            });
        }
        
        if (normalizedHistory.length > 0 && normalizedHistory[0].role === 'model') {
            normalizedHistory.shift();
        }

        if (normalizedHistory.length === 0) {
            throw new Error("Could not create a valid chat history.");
        }
        
        const chatModel = req.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: instruction
        });

        chatSession = chatModel.startChat({ history: normalizedHistory });
        currentSystemInstruction = instruction;
        uploadCache[uploadId].systemInstruction = instruction;

        // The replica is ready. We no longer need the full chat data in memory for this session.
        // The systemInstruction is cached, and that's what's needed for the chat.
        delete uploadCache[uploadId].messages;
        delete uploadCache[uploadId].participants;

        res.json({ message: 'Replica created successfully.' });

    } catch (error) {
        console.error('Error creating replica:', error);
        delete chunkProgress[uploadId];
        res.status(500).json({ error: 'Failed to create replica.' });
    }
});

app.post('/chat', googleAIWrapper, async (req, res) => {
    const { message, uploadId } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'No message provided.' });
    }

    if (!uploadId || !uploadCache[uploadId] || !uploadCache[uploadId].systemInstruction) {
        return res.status(400).json({ error: 'No active replica session. Please create one first.' });
    }
    
    // Re-initialize chat session if it's null or if the instruction has changed
    if (!chatSession || currentSystemInstruction !== uploadCache[uploadId].systemInstruction) {
        currentSystemInstruction = uploadCache[uploadId].systemInstruction;
        const model = req.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: currentSystemInstruction,
        });
        chatSession = model.startChat({
            history: [], // Optionally, you could load chat history here
            generationConfig: {
                maxOutputTokens: 200,
            },
        });
    }

    try {
        const result = await chatSession.sendMessage(message);
        const reply = await result.response.text();
        res.json({ reply });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to get a response from the AI.' });
    }
});

app.post('/generate-response', googleAIWrapper, async (req, res) => {
    const { userInput, selectedFriend, recentMessages } = req.body;
    try {
        const response = await generateResponse(userInput, req.genAI.getGenerativeModel({ model: "gemini-1.5-flash" }), selectedFriend, recentMessages);
        res.json({ response });
    } catch (error) {
        console.error('Error generating response:', error);
        res.status(500).json({ error: 'Failed to generate response.' });
    }
});

app.post('/cleanup', (req, res) => {
    const { uploadId } = req.body;
    if (uploadId) {
        delete uploadCache[uploadId];
        delete chunkProgress[uploadId];
        // Optional: Clean up saved files
        const fullHistoryFile = path.join(__dirname, 'uploads', `full_history_${uploadId}.json`);
        if (fs.existsSync(fullHistoryFile)) fs.unlinkSync(fullHistoryFile);

        // Clean up summary chunk files
        // This requires knowing how many chunks were created, which we don't store long-term.
        // A better approach would be to store chunk files in a directory named after the uploadId and delete the whole directory.
    }
    res.status(200).send();
});

app.get('/replica-progress/:uploadId', (req, res) => {
    const { uploadId } = req.params;
    const progress = chunkProgress[uploadId];
    if (progress) {
        res.json({
            current: progress.current,
            total: progress.total,
            chunks: progress.current,
        });
    } else {
        res.status(404).json({ error: 'Progress not found for this upload ID.' });
    }
});

app.post('/search-history', (req, res) => {
    const { uploadId, query, friendName, yourName, contextRange } = req.body;
    if (!uploadId || !query) return res.status(400).json({ error: 'Missing uploadId or query' });
    const fullHistoryFile = path.join(__dirname, 'uploads', `full_history_${uploadId}.json`);
    if (!fs.existsSync(fullHistoryFile)) return res.status(404).json({ error: 'History file not found' });
    try {
        const chatData = JSON.parse(fs.readFileSync(fullHistoryFile, 'utf8'));
        const messages = chatData.messages || [];
        const lowerQuery = query.toLowerCase();
        const relevant = messages.filter(m => m.content && m.content.toLowerCase().includes(lowerQuery));
        
        // Implement fuzzy matching and prioritize recent messages
        const fuzzyMatches = messages.filter(m => m.content && m.content.toLowerCase().includes(lowerQuery));
        const friendRelevant = friendName ? fuzzyMatches.filter(m => m.sender_name === friendName) : fuzzyMatches;
        
        // Sort by recency
        const sortedMessages = friendRelevant.sort((a, b) => new Date(b.timestamp_ms) - new Date(a.timestamp_ms));
        const results = sortedMessages.slice(0, 15).map(m => `${m.sender_name}: ${m.content}`);
        res.json({ results });
    } catch (err) {
        res.status(500).json({ error: 'Failed to search history.' });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://127.0.0.1:${port}`);
    if (API_KEY === 'YOUR_GEMINI_API_KEY') {
        console.warn('WARNING: Your Gemini API key is not set in server.js. The AI will not work.');
    }
}); 
