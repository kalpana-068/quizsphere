# QuizSphere

MERN assessment platform with real-time tab-switch monitoring and offline auto-recovery.

## Run locally
1. Install Node.js (LTS) from https://nodejs.org
2. Backend:
   cd backend
   copy .env.example to .env and fill MONGO_URI and JWT_SECRET
   npm install
   npm run dev
3. Frontend (new terminal):
   cd frontend
   npm install
   npm run dev
4. Open http://localhost:5173

## Folders
- backend/  Express + MongoDB API (auth, questions, quizzes, attempts)
- frontend/ React + Vite + Tailwind web app
- sample_questions.csv  ready file for the bulk upload feature

Never upload backend/.env to GitHub (it is already in .gitignore).
