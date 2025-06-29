# 🤖 ReplicaChat

Create AI-powered chatbots that perfectly mimic the messaging style and personality of real people based on their chat history. This innovative web application uses advanced AI analysis to replicate authentic communication patterns, making conversations feel natural and personal.

![ReplicaChat Demo](https://img.shields.io/badge/Status-Active-brightgreen)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Express](https://img.shields.io/badge/Express-4.18+-blue)
![Google AI](https://img.shields.io/badge/Google%20AI-Gemini-orange)

## ✨ Features

### 🧠 Advanced AI Personality Replication
- **Deep Learning Analysis**: Analyzes chat history to understand linguistic patterns, tone, and behavioral traits
- **Sentiment Analysis**: Processes emotional context and response patterns
- **Contextual Understanding**: Maintains conversation continuity and relationship dynamics
- **Chunked Processing**: Handles large chat histories efficiently with progress tracking

### 🎯 Multi-Step Setup Process
1. **Secure API Management**: Store and validate Google Gemini API keys
2. **File Upload**: Accept JSON chat history files with validation
3. **Persona Selection**: Choose which person to replicate from chat participants
4. **AI Training**: Real-time progress tracking during model creation

### 💬 Modern Chat Interface
- **Responsive Design**: Beautiful, mobile-friendly UI built with Tailwind CSS
- **Real-time Indicators**: Typing animations and progress feedback
- **Message Bubbles**: Distinct styling for user vs AI messages
- **Session Management**: Easy navigation between different conversations

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ReplicaChat.git
   cd ReplicaChat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (optional)
   ```bash
   # Create a .env file in the root directory
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

### Development Mode
```bash
npm run dev
```

## �� Project Structure
