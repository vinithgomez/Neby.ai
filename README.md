# Neby ✨

<p align="center">
  <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 300'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23030014;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%231e1b4b;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='300' fill='url(%23grad)'/%3E%3Ccircle cx='400' cy='150' r='100' fill='rgba(79, 70, 229, 0.1)' /%3E%3Cpath d='M400 50 L313 100 V200 L400 250 L487 200 V100 Z' fill='none' stroke='rgba(129, 140, 248, 0.4)' stroke-width='2'/%3E%3Cpath d='M400 100 V200 M340 130 L460 170 M460 130 L340 170' stroke='rgba(192, 132, 252, 0.5)' stroke-width='2' stroke-linecap='round'/%3E%3Ctext x='50%25' y='85%25' dominant-baseline='middle' text-anchor='middle' font-family='Inter, sans-serif' font-size='48' font-weight='bold' fill='%23ffffff' filter='drop-shadow(0 0 10px rgba(129, 140, 248, 0.5))'%3ENEBY%3C/text%3E%3Ctext x='50%25' y='95%25' dominant-baseline='middle' text-anchor='middle' font-family='Inter, sans-serif' font-size='14' fill='rgba(255,255,255,0.5)' letter-spacing='5'%3ECOSMIC NEURAL MESH%3C/text%3E%3C/svg%3E" alt="Neby Banner" width="100%" />
</p>

Neby is a next-generation AI chat interface powered by the **Google Gemini** model family. It features a stunning "Cosmic Nebula" UI design, high-performance streaming responses, and advanced multimodal capabilities.

## 📸 Gallery

> **Note**: Add your own screenshots here after running the app locally to showcase your specific configuration!

### 🌌 Immersive Chat Interface
*A glassmorphic design featuring smooth animations, cosmic backgrounds, and clean typography.*
![Chat UI Placeholder](https://via.placeholder.com/800x450/030014/FFFFFF?text=Immersive+Chat+Interface+with+Glassmorphism)

### 🧠 Deep Thinking & Reasoning
*Real-time visualization of the model's reasoning process and structured logical output.*
![Deep Thinking Placeholder](https://via.placeholder.com/800x450/030014/FFFFFF?text=Deep+Thinking+Mode+Active)

### 🔍 Google Search Grounding
*Integrated web search results with verifiable source citations and link previews.*
![Search Grounding Placeholder](https://via.placeholder.com/800x450/030014/FFFFFF?text=Google+Search+Integration+&+Citations)

## 🚀 Key Features

- **Gemini Integration**: Leveraging the latest `gemini-3-flash-preview` and `gemini-3-pro-preview` models.
- **Deep Thinking**: Enable advanced reasoning budgets for complex logic and coding tasks.
- **Multimodal Support**: Attach images directly to your chat for visual analysis.
- **Google Search Grounding**: Real-time web results integrated directly into the chat flow with source citations.
- **Voice Interface**: High-resilience speech recognition for hands-free interaction.
- **Persistence**: Chat history is saved locally in your browser (Local Storage).
- **Responsive Design**: Fully optimized for desktop, tablet, and mobile viewing.

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **AI Engine**: [@google/genai SDK](https://www.npmjs.com/package/@google/genai)

## ⚖️ Disclaimer

**Neby is an independent project and is not affiliated with, endorsed by, or sponsored by Google.** 

"Gemini" is a trademark of Google LLC. This application uses the Google Gemini API to provide its core AI functionality but operates as a separate, third-party interface.

## 🏁 Getting Started

### Prerequisites

You will need a Google Gemini API Key. You can obtain one for free at the [Google AI Studio](https://aistudio.google.com/).

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/neby.git
   cd neby
   ```

2. **Environment Setup**:
   The application expects an environment variable `API_KEY`.
   ```bash
   export API_KEY=your_gemini_api_key_here
   ```

3. **Running the App**:
   Serve the directory using any local web server:
   ```bash
   # Using Node.js (serve package)
   npx serve .
   ```

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.