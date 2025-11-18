import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Home from './pages/Home'
import Friends from './pages/Friends'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    fetch('http://localhost:3000/api/auth/me', {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user)
        }
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" /> : <Login setUser={setUser} />} 
        />
        <Route 
          path="/signup" 
          element={user ? <Navigate to="/" /> : <Signup setUser={setUser} />} 
        />
        <Route 
          path="/" 
          element={user ? <Home user={user} setUser={setUser} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/friends" 
          element={user ? <Friends user={user} setUser={setUser} /> : <Navigate to="/login" />} 
        />
      </Routes>
    </Router>
  )
}

export default App
