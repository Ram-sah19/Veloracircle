# Velora Circle

> **Privacy-First Unified Collaboration Platform**  
> Encrypted Messaging · Private Circles · Google Meet-Grade Video Rooms · Granular Host Controls · Encrypted File Sharing

---

## 🌟 Overview

**Velora Circle** is an enterprise-grade, privacy-first communication platform designed for teams and organizations that prioritize confidential collaboration. 

Unlike traditional platforms (Slack, Discord, Zoom) that expose member directories and presence statistics, **Velora enforces a strict zero-leakage privacy paradigm**:
- Regular attendees **never** see total member counts, participant rosters, or who joins/leaves.
- Only verified **Circle Admins & Meeting Hosts** possess governance and visibility permissions.
- WebRTC video rooms feature **Waiting Rooms (Knock to Join)**, **Multi-Room Breakout sessions**, **Screen Sharing**, **Live Chat**, and **Host Broadcasts**.

---

## ✨ Features

### 1. 📹 Real-Time Video Meetings (Google Meet Architecture)
- **Pre-Join Green Room**: Camera & mic device previews, hardware toggling, and instant meeting link sharing.
- **WebSockets + WebRTC Mesh**: Low-latency peer-to-peer audio and video streaming using STUN/TURN traversal.
- **Waiting Room (Knock to Join)**:
  - Invite-only meetings isolate non-whitelisted participants in an interactive waiting room.
  - Hosts receive real-time knock toasts with 1-click **Admit**, **Deny** (with reason), or **Admit All** actions.
- **Breakout Rooms**:
  - Hosts can split calls into 2, 3, or 4 breakout rooms with automatic round-robin peer distribution.
  - Dynamic WebRTC re-clustering keeps audio/video completely private within each room.
  - Hosts can broadcast top announcements to all breakout rooms simultaneously and close all rooms with one click.
- **In-Call Tools**: Screen sharing, hand raising, floating emoji reactions, and synchronized in-room chat.

### 2. 💬 Private 1-to-1 & Group Circles
- **Zero-Leakage Directory**: Members collaborate without exposing participant lists, online counts, or contact data.
- **Circle Hierarchy**: Public (open discovery), Private (invite required), and Secret (hidden) circles.
- **Real-Time Messaging**: Real-time Socket.io message broadcasting, typing indicators, replies, and pinned messages.

### 3. 📁 Secure File Storage & Sharing
- Local / cloud encrypted file uploads with Circle-level access control.
- In-line media previews for PDFs, documents, images, and code snippets.

### 4. 🛡️ Security & Architecture Standards
- **MVC Backend Architecture**: Built on Node.js, Express, MongoDB (Mongoose), and Socket.io.
- **Security Middleware**: Helmet security headers, CORS origin whitelisting, tiered rate limiters (`express-rate-limit`), and input sanitization (`express-validator`).
- **Stateless Authentication**: Passwords hashed with `bcryptjs` (salt factor 10) and JWT bearer tokens.

---

## 🏗️ Project Architecture

```
velora/
├── backend/                  # Node.js & Express MVC API Server
│   ├── config/               # Database & service configurations
│   ├── controllers/          # Business logic (Auth, Circles, Meetings, Messages, Files)
│   ├── middleware/           # JWT auth, validation, rate limiting, error handling
│   ├── models/               # Mongoose schemas (User, Circle, Meeting, Message, File)
│   ├── routes/               # Express REST route definitions
│   ├── sockets/              # Socket.io handlers (meetingSocket.js, chatSocket.js)
│   ├── uploads/              # Local storage directory for file uploads
│   └── server.js             # HTTP server entry point & socket initialization
│
├── frontend/                 # React 19 + Vite Client Application
│   ├── src/
│   │   ├── components/       # Radix UI primitives & Velora design system components
│   │   ├── routes/           # TanStack Router file-based pages
│   │   │   ├── home.tsx      # Dashboard & quick meeting launcher
│   │   │   ├── meeting.$meetingId.tsx # WebRTC Green Room & live meeting room
│   │   │   ├── circles.tsx   # Private Circles management
│   │   │   ├── messages.tsx  # Direct & group messaging interface
│   │   │   ├── files.tsx     # Encrypted file browser
│   │   │   └── admin.tsx     # Enterprise admin & audit logs
│   │   ├── lib/              # State stores, mock helpers, and API client
│   │   └── styles/           # Tailwind CSS v4 styling
│   └── vite.config.ts        # Vite build & plugin configuration
│
└── .gitignore                # Comprehensive root gitignore protecting secrets & builds
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm**
- **MongoDB**: A running MongoDB instance or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment variables
# Copy .env.example to .env
cp .env.example .env
```

Open `backend/.env` and update your settings:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<db_username>:<db_password>@cluster0.ifzdrqq.mongodb.net/velora?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=your_super_secret_jwt_key
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

Start the backend server:
```bash
# Start in development mode (with nodemon)
npm run dev

# Or start in standard production mode
npm start
```
The backend API and Socket.io signaling will run on `http://localhost:5000`.

---

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 🧪 Testing the Video Meeting & Waiting Room

1. Open `http://localhost:5173/home`.
2. Click **New Meeting** -> **Schedule a meeting**.
3. Toggle **Invite only (Waiting Room)** ON and copy the generated meeting link.
4. **Host View**: Open the meeting link in your main browser window. Click **Join Meeting**.
5. **Guest View**: Open the same meeting link in an **Incognito** window or a second browser.
6. Notice that the guest enters the **Waiting Room ("Waiting for host to admit you...")**.
7. In the Host window, observe the **Knock Toast Alert** with the **[Admit]** action, or open the **Participants Drawer** to admit or deny the guest.
8. Once admitted, WebRTC connects both peers in peer-to-peer audio/video.
9. Click the **Layers (Breakout)** icon on the host bar to test creating Breakout Rooms and broadcasting announcements.

---

## 🔒 Privacy & Security Highlights

- **No Public Roster**: Attendee queries filter out full participant directories unless caller possesses `admin` or `owner` scopes.
- **Hardware Disconnect Assurance**: WebRTC camera/microphone tracks are killed at the hardware level (`track.stop()`) on room departure.
- **Protected Environment**: Sensitive `.env` files, uploads, and tokens are protected via `.gitignore`.

---

## 📄 License

This project is licensed under the MIT License.
