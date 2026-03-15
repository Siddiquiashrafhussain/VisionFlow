# 🚀 VisionFlow AI

### Multimodal Gemini Live Agent for Autonomous UI Navigation

VisionFlow AI is a **next-generation multimodal AI agent** that can **see, understand, and interact with user interfaces** in real time.

Built using **Google Gemini models and Google Cloud**, VisionFlow enables users to automate complex digital workflows using **natural language voice or text commands**.

Instead of manually navigating websites or applications, users simply describe what they want, and the AI agent performs the task automatically.

Example:

> “Find the best laptop under ₹80,000 on Amazon.”

VisionFlow AI will:

1. Observe the screen
2. Understand UI elements using Gemini Vision
3. Plan a sequence of actions
4. Click, type, scroll, and navigate automatically
5. Present the final results to the user

---

# 🧠 Problem

Many everyday tasks on the internet require repetitive interactions with websites and applications.

Examples include:

* Searching and comparing products
* Booking travel
* Filling forms
* Navigating dashboards
* Managing workflows across multiple apps

Current AI assistants mainly operate with **text input and text output**, which limits their ability to interact with real digital environments.

---

# 💡 Solution

VisionFlow AI introduces a **multimodal agent architecture** that combines:

* Visual understanding
* Task planning
* Autonomous action execution
* Real-time feedback

The agent **observes the user interface, interprets visual elements, and performs actions directly on behalf of the user.**

---

# ✨ Key Features

### 🎤 Natural Voice Commands

Users can speak naturally to the AI agent.

Example:

```
Find the cheapest flight from Mumbai to Delhi next Friday
```

---

### 👁️ Visual UI Understanding

Using Gemini multimodal capabilities, the agent interprets:

* buttons
* forms
* menus
* search fields
* navigation elements

from screenshots or screen recordings.

---

### 🤖 Autonomous Task Planning

The AI agent breaks complex instructions into actionable steps.

Example:

User command:

```
Apply for a software engineering job on LinkedIn
```

Agent steps:

1. Open LinkedIn
2. Search for jobs
3. Filter results
4. Open application page
5. Fill form fields

---

### 🖱️ Automated UI Interaction

The agent performs actions such as:

* clicking buttons
* typing text
* scrolling pages
* selecting filters
* submitting forms

using browser automation.

---

### 📊 Smart Recommendations

VisionFlow analyzes results and suggests optimal choices based on:

* price
* rating
* relevance
* popularity

---

# 🏗️ System Architecture

```
User (Voice / Text)
        │
        ▼
Frontend Interface (Next.js)
        │
        ▼
Agent Backend (Node.js)
        │
        ▼
Gemini Multimodal Model
        │
        ▼
Vision Processing Agent
        │
        ▼
Task Planning Engine
        │
        ▼
Action Executor
        │
        ▼
Browser Automation (Playwright)
```

---

# ☁️ Google Cloud Services Used

VisionFlow AI runs entirely on **Google Cloud infrastructure**.

Services used:

* Vertex AI (Gemini models)
* Cloud Run
* Firestore
* Cloud Storage
* Secret Manager

---

# 🧰 Tech Stack

## Frontend

* Next.js
* React
* TailwindCSS
* WebRTC (for real-time interaction)

## Backend

* Node.js
* Express.js

## AI & Agents

* Google Gemini API
* Google GenAI SDK
* Multimodal Vision Models

## Automation

* Playwright

## Cloud

* Google Cloud Run
* Firestore
* Cloud Storage

---

# 📁 Project Structure

```
visionflow-ai
│
├── project-docs
│   ├── PRD.md
│   ├── TRD.md
│   ├── Features.md
│   ├── ui-ux.md
│   ├── TechStack.md
│   ├── database.md
│   ├── Architecture.md
│   ├── security.md
│   └── deployment.md
│
├── frontend
├── backend
├── agents
└── README.md
```

---

# ⚙️ Installation

Clone the repository

```
git clone https://github.com/yourusername/visionflow-ai.git
```

Move into the project folder

```
cd visionflow-ai
```

Install dependencies

```
npm install
```

Create environment variables

```
GEMINI_API_KEY=
GOOGLE_CLOUD_PROJECT=
FIRESTORE_DATABASE=
```

Start development server

```
npm run dev
```

---

# 🚀 Deployment

The backend is deployed on **Google Cloud Run**.

Deployment steps:

1. Build Docker container
2. Push to Artifact Registry
3. Deploy service to Cloud Run
4. Configure environment variables

Example:

```
gcloud run deploy visionflow-agent
```

---

# 🎬 Demo Video

A full demonstration video is included showing:

* Real-time multimodal interaction
* Visual UI understanding
* Autonomous task execution

---

# 📊 Architecture Diagram

The architecture diagram is included in:

```
/project-docs/Architecture.md
```

---

# 📚 What We Learned

While building VisionFlow AI we explored:

* Multimodal AI agents
* Vision-based UI interpretation
* Autonomous task planning
* Real-time AI interaction
* Cloud-native AI deployment

This project demonstrates how **next-generation AI agents can move beyond chatbots to become active digital assistants capable of interacting with the real digital world.**

---

# 🏆 Hackathon Submission

This project was built for the **Gemini Live Agent Challenge**.

It demonstrates how **Gemini multimodal capabilities and Google Cloud infrastructure can power real-time intelligent agents that transform the way users interact with software.**
