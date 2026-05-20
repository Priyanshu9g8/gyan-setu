# Gyan Setu - AI-Powered Educational Platform 🎓✨

Gyan Setu is a modern, multilingual, AI-powered e-learning platform designed to bridge the gap between traditional learning and next-generation educational technologies. Featuring personalized AI tutors, automated exam generation, and advanced exam integrity tracking, it is built to empower both students and teachers.

---

## 🚀 Key Features

*   **🤖 AI-Powered Learning**:
    *   **AI Teacher Assistant**: An active floating widget for instant doubt resolution.
    *   **AI Quiz & Lesson Generator**: Automatic personalized materials generated instantly based on any topic.
    *   **AI Exam Builder**: Empowering teachers to design custom full-length assessments instantly.
*   **🔒 Exam Integrity Suite**:
    *   **FullScreen Enforcement**: Blocks exit attempts during examinations.
    *   **Tab-Switching Monitor**: Tracks user navigation and issues warnings or auto-submits on violation.
*   **🌐 Localization & Accessibility**:
    *   Fully localized interfaces in **English**, **Hindi (हिंदी)**, and **Punjabi (ਪੰਜਾਬੀ)**.
*   **📊 Roles & Dashboards**:
    *   **Students**: View courses, attempt AI exams, track quiz performances, and consult the AI tutor.
    *   **Teachers**: Manage courses, generate chapters/exams, review detailed student grades, and track statistics.
    *   **Admins**: Comprehensive system settings control and platform audits.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React (Vite), Tailwind CSS, i18next (Localization) |
| **Backend** | Java Spring Boot, Maven, Spring Security (JWT) |
| **Database** | PostgreSQL (Neon Cloud / Local pgAdmin) |
| **AI Engine** | Google Gemini AI |

---

## 📂 Project Structure

```text
gyan-setu/
├── gyan-setu-frontend/     # React Client Application
└── gyan-setu-backend/      # Spring Boot REST API Application
```

---

## ⚙️ Quick Start (Local Setup)

For a detailed walkthrough, including downloading prerequisites (Java 17, Node.js, PostgreSQL), check out the interactive:
👉 **[SETUP_GUIDE.md](SETUP_GUIDE.md)** *(coming soon or refer to implementation_plan.md)*

### 1. Database Setup
1. Launch your local PostgreSQL instance.
2. Create a database named `gyan_setu`.

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd gyan-setu-backend
   ```
2. Configure your database details and Google AI keys in `src/main/resources/application.properties`.
3. Start the application:
   ```bash
   ./mvnw spring-boot:run
   ```
   *Your server will start at `http://localhost:8080`.*

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../gyan-setu-frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *Open `http://localhost:5173` in your browser.*

---

## 🌐 Production Deployment (Cloud)

*   **Database**: Hosted on [Neon](https://neon.tech/) (Generous serverless PostgreSQL free-tier).
*   **Backend**: Deployed on [Render](https://render.com/) (Java/Maven web service support).
*   **Frontend**: Deployed on [Vercel](https://vercel.com/) (Ultra-fast global CDN for static React builds).

For the full cloud setup guide, consult the [Implementation Plan](.gemini/antigravity/brain/4c4a828f-36c4-4193-9fef-53e07b4d313f/implementation_plan.md) in your workspace.

---

## 📄 License
This project is licensed under the MIT License - see the `LICENSE` file for details.
