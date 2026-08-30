# ⚡ Class Connect — Real-Time College Classroom Quiz Platform

**Class Connect** is a full-stack, real-time interactive quiz and live coding platform designed specifically for college professors and students. When a professor broadcasts a question, connected students instantly receive it on their phones or laptops. As answers arrive, the server orders submissions by exact millisecond arrival times to identify who answered first and who answered first correctly, with live leaderboard sync and secure sandboxed code execution.

---

## 🚀 Key Features

* **⚡ Sub-Millisecond Real-Time Sync**: Built on Node.js and Socket.IO. Questions and submissions synchronize in real-time without page reloads.
* **🥇 First Answer System**: Server-authoritative timestamps precisely track and rank **First to Answer** vs. **First Correct Answer**.
* **📝 6 Comprehensive Question Types**:
  1. **Single MCQ**: Standard 4-option questions with optional option randomization.
  2. **Multiple Correct MCQ**: Multi-select options with full or partial scoring.
  3. **Fill in the Blank**: Space-trimmed, case-insensitive evaluation with multiple accepted synonyms.
  4. **True / False**: One-click quick response evaluation.
  5. **Short Answer**: Text response with automatic phrase matching or manual grading.
  6. **Coding Challenge**: Interactive IDE with syntax highlighting, language selector (Python, JS, C, C++, Java), custom stdin/stdout runner, and automated evaluation against hidden test cases.
* **🛡️ Classroom Anti-Cheating**:
  * One active session per roll number.
  * Server-side answer locking upon submission or timeout.
  * Live student tab-switching and window-blur incident tracking.
  * Optional copy-paste restrictions.
* **👨‍🏫 Modern Professor Studio**:
  * Live Question Presenter with PIN and QR code modal.
  * Real-time submission stream with podium badges (🥇, 🥈, 🥉).
  * Live option response distribution charts.
  * Pause/Resume timer sync and instant correct answer reveal.
  * Post-quiz Championship Podium with celebratory confetti, analytics, and **One-Click CSV Export**.
* **📱 Mobile-First Student Experience**:
  * Clean, fast, touch-friendly UI for smartphones and laptops.
  * Synchronized visual countdown timer.
  * In-browser code editor with sample test cases.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, React Router 6, Lucide Icons, Canvas Confetti |
| **Styling** | Modern CSS Design System (Sleek Dark & Light Themes, Glassmorphism, Responsive) |
| **Backend** | Node.js (ES Modules), Express.js, Socket.IO |
| **Database & ORM** | Prisma ORM with SQLite (Zero-config `dev.db`) & PostgreSQL support |
| **Coding Sandbox** | Isolated process execution with CPU/memory limits, timeouts, and hidden test runner |
| **Auth** | JWT (JSON Web Tokens) with Bcrypt password hashing |

---

## 📦 Project Structure

```
liveclass-quiz/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema (Professors, Quizzes, Questions, Sessions, Submissions)
│   │   └── seed.js                # Demo quizzes with all 6 question types
│   ├── src/
│   │   ├── config.js              # Environment & Prisma client setup
│   │   ├── server.js              # Express app & Socket.IO initialization
│   │   ├── controllers/           # Auth, Quiz, Session, and Code controllers
│   │   ├── middleware/            # JWT authentication middleware
│   │   ├── routes/                # REST API routes
│   │   ├── services/
│   │   │   ├── sandboxService.js  # Sandboxed multi-language code execution
│   │   │   ├── evaluationService.js # 6-type answer evaluator
│   │   │   └── analyticsService.js  # Leaderboard & CSV generation
│   │   └── sockets/
│   │       └── quizSocket.js      # Real-time WebSocket engine & order tracker
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/            # Navbar, Sidebar, TimerBadge, CodeEditor, Podium, Modal
│   │   ├── context/               # AuthContext, SocketContext, ThemeContext
│   │   ├── pages/
│   │   │   ├── Home.jsx           # Landing page with Quick Join & Professor entry
│   │   │   ├── professor/         # Dashboard, Quiz List, 6-Type Quiz Editor, Live Room, Results
│   │   │   └── student/           # Student Join, Live Lobby, Answering Room, Scorecard
│   │   ├── App.jsx
│   │   └── index.css              # Design system tokens & animations
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── package.json                   # Root orchestrator scripts
└── README.md
```

---

## 🚀 Step-by-Step Setup Guide

### 1. Prerequisites
Ensure you have **Node.js (v18 or higher)** and **npm** installed on your system.
Verify in your terminal:
```bash
node -v
npm -v
```

---

### 2. Install Dependencies & Setup Database

From the project root folder, run:

```bash
# 1. Setup Backend
cd backend
npm install
npx prisma generate
npx prisma db push
node prisma/seed.js

# 2. Setup Frontend
cd ../frontend
npm install
```

> **Demo Seed Data**: The seed script creates:
> * **Professor Account**: `professor@liveclass.edu` / `password123`
> * **Demo Quiz**: *"Computer Networks & Systems Test"* featuring all 6 question types (MCQ, Multi-MCQ, Fill in the Blank, True/False, Python Coding Question with hidden test cases, Short Answer).

---

### 3. Running the Application

You can start the backend and frontend in separate terminals:

#### Terminal 1 — Start Backend Server:
```bash
cd backend
npm run dev
```
*Backend runs on `http://localhost:5000` (Socket.IO & REST API).*

#### Terminal 2 — Start Frontend Server:
```bash
cd frontend
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 🧪 Testing Professor & Students Simultaneously

To test the real-time synchronization on your computer:

1. **Professor Window** (Normal Browser):
   * Open `http://localhost:5173/professor/auth`
   * Click **"Click here to fill Demo Professor Credentials"** and Sign In.
   * On the Dashboard, click **"START LIVE QUIZ NOW"** on *"Computer Networks & Systems Test"*.
   * Note the 5-letter **QUIZ CODE** (e.g., `X7K92`).

2. **Student Window 1** (Incognito Window):
   * Open `http://localhost:5173/student/join`
   * Enter Quiz Code (e.g. `X7K92`), Name: `Rahul Sharma`, Roll: `21CS001` -> Click **Enter Classroom**.

3. **Student Window 2** (Second Browser / Window):
   * Open `http://localhost:5173/student/join`
   * Enter Quiz Code (e.g. `X7K92`), Name: `Priya Patel`, Roll: `21CS002` -> Click **Enter Classroom**.

4. **Live Synchronization Flow**:
   * Professor screen immediately displays: **`2 Students Online`**.
   * Professor clicks **"START QUESTION 1"**.
   * Both student screens instantly display Question 1.
   * Student Rahul submits in 1.4s (Option B - Correct).
   * Student Priya submits in 2.1s (Option B - Correct).
   * Professor screen live feed immediately shows:
     * 🥇 **First to Answer: Rahul — 1.40s**
     * 👑 **First Correct Answer: Rahul — 1.40s**
   * Professor clicks **"Next Question"** -> All students advance synchronously.
   * When reaching the **Coding Question**, students can write code in the interactive editor, run against sample inputs, and submit against hidden test cases.
   * Professor clicks **"End Quiz"** -> Championship Podium and CSV Analytics are displayed.

---

## 📱 Connecting Mobile Phones on the Same Wi-Fi

1. Ensure your computer and mobile phone are connected to the same Wi-Fi network.
2. Find your computer's local IP address:
   * **Windows**: Run `ipconfig` in Command Prompt (look for IPv4 Address e.g., `192.168.1.45`).
   * **Mac/Linux**: Run `ifconfig` or `ip a`.
3. Open the browser on your phone and navigate to:
   ```
   http://YOUR_LOCAL_IP:5173
   ```
   *(e.g., `http://192.168.1.45:5173/student/join`)*
4. Enter the Quiz PIN and enjoy live smartphone quiz participation!

---

## 🔒 Secure Sandboxed Code Execution Architecture

* **Execution Isolation**: Student code submissions are executed in isolated, temporary system directories with unique randomized UUIDs.
* **Resource Constraints**: Each run is bounded by a 4000ms CPU timeout and 64KB memory output limit to prevent infinite loops or memory overflow.
* **Test Case Comparison**: The engine pipes test case standard input directly into the process and normalizes whitespace/newlines when matching against expected outputs.
* **Extensible Container Adapter**: The sandbox service is designed with clean abstraction layers (`sandboxService.js`), allowing one-line switching to remote Docker containers or Judge0/Piston APIs for high-volume deployments.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
