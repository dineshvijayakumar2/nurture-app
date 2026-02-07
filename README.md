# NURTURE
## AI-Powered Child Development Companion

### Technical Specification
**Built with Gemini 1.5 & Firebase**

---

# 1. Executive Summary

Nurture is an AI-powered child development companion that helps parents understand their children deeply through intelligent pattern recognition, research-backed insights, and values-based guidance. Using Gemini's multimodal capabilities, Nurture transforms everyday observations into actionable parenting wisdom.

## 1.1 The Core Problem
Parents today are overwhelmed with information but lack personalized, contextual insights about their specific child's unique development.

## 1.2 The Solution
Nurture provides:
- **Multimodal Memory Capture**: Text, photos, and voice notes of everyday moments.
- **AI Pattern Detection**: Automatically identifies class schedules and developmental milestones.
- **Values-Based Coaching**: AI-grounded conversation starters derived from real parent logs.
- **High-Performance UI**: SPA architecture with "Kindle-like" reading optimization.

---

# 2. Key Features

### 🗓️ Rhythm Planner
A powerful scheduling engine for complex family life.
- **Multi-View**: Week, Month, and Series List views for flexible browsing.
- **Smart Scheduling**: Gemini-powered extraction of schedules from journal entries.
- **Bulk Date Selection**: Quickly schedule workshops or series with "Weekends" or "Next 4 Weeks" helpers.

### 🪴 Value Garden
The soul of the application where values and wisdom intersect.
- **Wisdom Library**: A curated collection of books, articles, and notes.
- **Live Knowledge Integration**: Add and manage resources directly from the UI.
- **Personalized Dialogues**: Conversation starters grounded in your child's recent journal entries.

### 📝 Smart Moments
The primary log for all observations.
- **Intelligent Extraction**: Detects potential new classes or habits from plain text logs.
- **Seamless Sync**: Real-time Firestore sync for data persistence across devices.

---

# 3. Technical Stack
- **Frontend**: React (Vite) + SPA Routing
- **Intelligence**: Google Gemini (Flash 1.5)
- **Backend / Hosting**: Firebase (Firestore, Auth, Hosting)
- **Mobile**: Capacitor.js (iOS/Android compatible)
- **Styling**: Modern, high-legibility CSS with fluid animations.

---

# 4. Getting Started

### Local Development
```bash
npm install
npm run dev
```

### Deployment
1. Build the project:
   ```bash
   npm run build
   ```
2. Deploy to Firebase:
   ```bash
   npx firebase login
   npx firebase deploy --only hosting
   ```

---
*Updated February 2026*