# Neby ✨

![Side Bar](Output/Side Bar.png)

**Neby** is a cutting-edge, nebula-themed AI interface built with **React 19** and the **Google GenAI SDK**. It harnesses the power of the latest **Gemini 3** and **Veo** models to provide a unified workspace for text, code, image generation, video creation, and real-time voice conversations.

## 🌌 Core Features

### 🧠 Advanced Intelligence
- **Multi-Model Support**: Seamlessly switch between specialized models:
  - **Gemini 3 Flash**: Fast, low-latency responses for everyday tasks.
  - **Gemini 3 Pro**: Advanced reasoning and complex problem solving.
  - **Gemini 3 Pro Image**: High-fidelity image generation (1K/2K).
  - **Veo 3.1**: Premium video generation and animation.
- **Deep Thinking**: Enable "Chain of Thought" reasoning for complex logic and coding challenges.
- **Google Search Grounding**: Access real-time web information with cited sources.

### 🎨 Multimodal & Creative Tools
- **Image Generation & Editing**: Create stunning visuals or modify existing images using natural language.
- **Video Creation**: Generate 1080p videos or animate static images using the Veo model.
- **Audio Intelligence**:
  - **Live Mode**: Real-time, low-latency two-way voice conversations using Gemini 2.5 Native Audio.
  - **Text-to-Speech**: High-quality voice synthesis for reading messages aloud.
  - **Transcription**: Accurate speech-to-text input for hands-free typing.

### 🛡️ Security & Performance
- **Client-Side Rate Limiting**: Token-bucket algorithm to prevent API abuse.
- **Input Validation**: Strict schema checks for text lengths and media sizes.
- **Sanitization**: Automatic stripping of control characters and API key masking in logs.

### 🚀 UX & Immersion
- **Cosmic Mode**: A toggleable, interactive starry background with animated shooting stars.
- **Responsive Design**: Fully optimized layout for mobile, tablet, and desktop.
- **Session History**: Persist chats locally or sync via Firebase (Email/Google Auth).

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/) (implied environment)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **AI SDK**: [@google/genai](https://www.npmjs.com/package/@google/genai)
- **Backend/Auth**: [Firebase](https://firebase.google.com/) (Auth & Firestore)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🏁 Getting Started

### 1. Prerequisites
You need a **Google Gemini API Key**. Get one for free at [Google AI Studio](https://aistudio.google.com/).

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/neby.git
cd neby
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory. You must configure your API Key and optionally your Firebase credentials for cloud persistence.

```env
# Required
API_KEY=your_gemini_api_key_here

# Optional: Firebase Config (for Auth & Cloud History)
# If omitted, the app runs in Guest Mode with Local Storage.
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
```

### 4. Run the Application

```bash
npm start
# or
npm run dev
```

Open `http://localhost:3000` (or the port shown in your terminal) to launch Neby.

---

## 📖 Usage Guide

1. **Select a Model**: Use the sidebar to choose the model that fits your task (e.g., *Veo* for video, *Gemini 3 Pro* for coding).
2. **Toggle Capabilities**:
   - Enable **Cosmic Mode** for a starry backdrop.
   - Switch on **Deep Thinking** for hard math/logic problems.
   - Turn on **Google Search** if you need up-to-date facts.
3. **Chat**: Type your prompt, attach images, or use the Microphone for voice input.
4. **Live Mode**: Click the **Sparkles** icon (mobile) or use the sidebar to enter a real-time voice session.

---

## ⚖️ Disclaimer

**Neby is an independent project.** It is not affiliated with, endorsed by, or sponsored by Google. "Gemini", "Veo", and related marks are trademarks of Google LLC. This application uses the Google Gemini API to provide its core functionality.

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
