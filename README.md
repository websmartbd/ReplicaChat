# Replica Chat

A web application that allows users to chat with an AI that can replicate messaging styles based on conversation history. Built with Node.js, Express, and Google's Generative AI.

## Features

- **Conversation Style Replication**: Upload chat history to train the AI to mimic specific messaging styles
- **Context-Aware Responses**: AI maintains context of the conversation
- **File Upload**: Easily upload JSON chat history files
- **Real-time Chat**: Interactive chat interface with the AI
- **Sentiment Analysis**: Basic sentiment analysis of conversations
- **Search Functionality**: Search through conversation history

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)
- Google Generative AI API key

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ReplicaChat
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your Google Generative AI API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
   
   Alternatively, you can provide the API key in the request headers as `x-api-key`.

## Usage

1. Start the development server:
   ```bash
   npm run dev
   ```
   
   Or start the production server:
   ```bash
   npm start
   ```

2. Open your browser and navigate to `http://localhost:3000`

3. Upload a JSON file containing chat history to train the AI on a specific messaging style

4. Start chatting with the AI, which will respond in the style of the uploaded conversation

## Project Structure

- `server.js` - Main server file with all API endpoints
- `public/` - Frontend files
  - `index.html` - Main application interface
  - `script.js` - Frontend JavaScript
  - `favicon.png` - Application favicon
- `uploads/` - Directory for uploaded chat history files
- `package.json` - Project configuration and dependencies

## API Endpoints

- `POST /upload` - Upload chat history file
- `POST /chat` - Send a message to the AI
- `GET /history` - Get chat history
- `POST /search-history` - Search through conversation history

## Dependencies

- Express.js - Web framework
- @google/generative-ai - Google's Generative AI client
- Multer - File upload middleware
- CORS - Cross-Origin Resource Sharing
- Dotenv - Environment variable management
- Nodemon - Development server (dev dependency)

## Environment Variables

- `GEMINI_API_KEY` - Your Google Generative AI API key
- `PORT` - Server port (default: 3000)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Acknowledgments

- Google's Generative AI for the powerful language model
- All open-source libraries used in this project
