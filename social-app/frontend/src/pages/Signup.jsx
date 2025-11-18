import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Auth.css'

function Signup({ setUser }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    password: '',
    day: '1',
    month: 'Jan',
    year: '2000'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        navigate('/')
      } else {
        setError(data.error || 'Signup failed')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const months = ['Jan', 'Feb', 'Mar', 'April', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']
  const years = Array.from({ length: 46 }, (_, i) => 2005 - i)

  return (
    <div className="auth-container">
      <div className="auth-form-container">
        {error && <div className="alert alert-danger">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <label className="text-muted">Full name</label>
          <div className="form-group name-group">
            <input
              type="text"
              placeholder="first_name"
              className="form-control"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              placeholder="last_name"
              className="form-control"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="text-muted">Username</label>
            <input
              type="text"
              placeholder="your_nick_name"
              className="form-control"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="text-muted">Password</label>
            <input
              type="password"
              placeholder="the_secret"
              className="form-control"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          
          <label className="text-muted">Date of birth</label>
          <div className="form-group date-group">
            <select
              className="form-control"
              name="day"
              value={formData.day}
              onChange={handleChange}
            >
              {days.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
            <select
              className="form-control"
              name="month"
              value={formData.month}
              onChange={handleChange}
            >
              {months.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
            <select
              className="form-control"
              name="year"
              value={formData.year}
              onChange={handleChange}
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <button 
            type="submit" 
            className="btn btn-action btn-success"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'GET STARTED'}
          </button>
        </form>

        <hr />
        <p className="text-muted">
          Already a part of it? <a href="/login">login now!</a>
        </p>
      </div>
    </div>
  )
}

export default Signup

