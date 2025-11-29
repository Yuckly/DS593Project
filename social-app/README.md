# Social App

A social media application with React frontend and Express.js backend, similar to spruce.

## Project Structure

```
social-app/
├── backend/          # Express.js REST API
│   ├── app.js       # Express server
│   ├── config/      # MongoDB configuration
│   ├── models/      # Mongoose models
│   └── routes/      # API routes
└── frontend/        # React frontend (Vite)
    └── src/
        ├── pages/   # React pages (Login, Signup, Home)
        └── App.jsx  # Main app component
```

## Setup

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Make sure MongoDB is running (on localhost:27017)

4. (Optional) Set environment variables:
```bash
# PII Checker URL (default: http://localhost:12423/anonymize)
export PII_CHECKER_URL=http://localhost:12423/anonymize
```

Or create a `.env` file in the backend directory:
```
PII_CHECKER_URL=http://localhost:12423/anonymize
```

5. Start the backend server:
```bash
npm start
```

Backend will run on `http://localhost:3000`

**Note**: For PII checking configuration, see `backend/config/PII_CONFIG_README.md`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

## API Endpoints

- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `GET /api/home` - Get home page data

## Features

- ✅ User authentication (Login/Signup)
- ✅ MongoDB database integration
- ✅ Session management
- ✅ React frontend with routing
- ✅ Spruce-like UI theme (green colors)

## Tech Stack

**Backend:**
- Express.js
- MongoDB (Mongoose)
- bcrypt (password hashing)
- express-session

**Frontend:**
- React
- React Router
- Vite
