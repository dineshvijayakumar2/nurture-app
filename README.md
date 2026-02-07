# 🪴 NURTURE: AI-Powered Child Development Companion

### *Personalized Wisdom for the Modern Parent*

Nurture is a state-of-the-art, AI-driven application designed to transform the chaotic journey of parenting into a meaningful, data-informed growth story. Built with **Google Gemini 1.5** and a high-performance **React/Firebase** stack, Nurture acts as a digital companion that bridges the gap between daily observations and long-term developmental success.

---

## 🌟 The Vision
In an era of information overload, parents are drowning in generic advice but lack specific insights into their own child's unique development. Nurture's mission is to provide a **"Third Eye"** for parents—using AI to spot patterns, suggest values-based actions, and provide a Kindle-like reading experience for parental wisdom.

---

## 🚀 Key Modules & Features

### 1. 📱 Dashboard (The Growth Feed)
The heart of Nurture is a personalized, social-media style feed that turns your child's life into a beautiful timeline.
- **Dynamic Timeline**: Combines recorded moments, AI-generated insights, and upcoming schedules into one cohesive flow.
- **Micro-Insights**: Gemini analyzes recent logs to surface "nuggets" of developmental progress.
- **Premium Aesthetics**: Designed with soft gradients, glassmorphism, and a focus on high-legibility typography.

### 2. 📝 Moments (Intelligent Logging)
More than just a journal, this is the primary data source for Nurture's intelligence.
- **Multimodal Capture**: Seamlessly record text observations, milestones, and memories.
- **Intelligent Extraction**: Gemini automatically scans your logs to detect potential new classes (e.g., "Sarah started piano") and offers one-click scheduling into the Rhythm planner.
- **Real-time Sync**: Cross-device persistence powered by high-concurrency Firestore.

### 3. 🗓️ Rhythm (Smart Scheduling Engine)
A revolutionary take on family calendars, optimized for the complexity of child development.
- **Multi-State Views**: Toggle between high-level **Month** views, detailed **Week** columns, and a management-focused **Series List**.
- **Bulk Date Helpers**: Unique tools to schedule 4-week workshops or weekend classes with a single tap.
- **Drag-and-Drop**: Intuitive organization of weekly recurring routines using native-feeling interaction patterns.

### 4. 🪴 Value Garden (Wisdom & Library)
A digital sanctuary for values-based parenting and resource management.
- **Wisdom Library**: A dedicated repository for Books, Articles, and Videos. Manage a family-wide "Wisdom Stack" with live Add/Delete capabilities.
- **Reader View**: A distraction-free, "Kindle-style" interface for deep reading on mobile devices.
- **Contextual Dialogues**: AI-generated conversation starters that are **grounded in your child's actual history**. If a log mentions a child was brave at the dentist, the "Brave" value starter will specifically reference that moment.

### 5. 🤖 AI Coach (The Contextual Companion)
Your dedicated parenting expert, powered by the most recent context of your family's life.
- **Full-Context Memory**: The coach doesn't just answer questions; it knows your child's recent logs, schedules, and challenges.
- **Persistent Memory**: Chat histories are stored and synced, allowing for long-running coaching sessions.
- **Markdown Support**: Richly formatted responses for clear, actionable advice.

---

## 🛠️ Integrated AI Strategy
Nurture leverages **Google Gemini 1.5 Flash** across three critical layers:
1. **Extraction**: Turning unstructured journal text into structured schedule objects.
2. **Synthesis**: Analyzing logs to create personalized conversation starters in the Value Garden.
3. **Coaching**: Providing research-backed parenting advice grounded in the child's specific developmental history.

---

## 💻 Tech Stack & Architecture
- **Framework**: React 19 (Vite)
- **Type Safety**: TypeScript 5.8
- **State Management**: React Context API with custom providers.
- **Backend Infrastructure**: 
  - **Firebase Auth**: Secure family-level authentication.
  - **Firestore**: Low-latency, real-time document sync.
  - **Firebase Hosting**: Deployed on a global CDN for high-performance delivery.
- **Mobile Foundation**: Capacitor.js (Ensures seamless conversion to native iOS and Android apps).
- **Styling**: Vanilla CSS with a bespoke design system (High contrast, fluid animations, premium look-and-feel).

---

## 🛠️ Setup & Submission Guide

### Local Installation
```bash
# Clone and install dependencies
git clone https://github.com/dineshvijayakumar2/nurture-app.git
cd nurture-app
npm install

# Start development server
npm run dev
```

### Production Build & Deployment
```bash
# Generate optimized production bundle
npm run build

# Deploy to Firebase Hosting
npx firebase login
npx firebase deploy --only hosting
```

---
*Developed for the Alpha-Nurture Hackathon - February 2026*