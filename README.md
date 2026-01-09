# Neby ✨

Neby is a next-generation AI chat interface powered by the **Google Gemini** model family. It features a stunning "Cosmic Nebula" UI design, high-performance streaming responses, and advanced multimodal capabilities.

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

This project is licensed under the MIT License - see the LICENSE file for details.