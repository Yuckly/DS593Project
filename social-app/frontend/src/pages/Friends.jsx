import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Chat from '../components/Chat'
import SearchUsers from '../components/SearchUsers'
import './Friends.css'

function Friends({ user }) {
  const navigate = useNavigate()
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedFriend, setSelectedFriend] = useState(null)
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    fetchFriends()
  }, [])

  const fetchFriends = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/friends', {
        credentials: 'include'
      })
      const data = await response.json()
      if (data.success) {
        setFriends(data.friends || [])
      }
    } catch (err) {
      console.error('Error fetching friends:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
      navigate('/login')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  if (loading) {
    return (
      <div className="friends-container">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="friends-container">
      <div className="top-navbar box-shadow">
        <div className="navbar-content">
          <div className="navbar-left">
            <button 
              onClick={() => navigate('/')} 
              className="btn-nav-icon"
              title="Home"
            >
              <i className="fa fa-home"></i>
            </button>
            <button 
              onClick={() => setShowSearch(true)} 
              className="btn-nav-icon"
              title="Search Users"
            >
              <i className="fa fa-search"></i>
            </button>
          </div>
          <div className="navbar-right">
            <span className="text-muted">
              Welcome, <strong>{user?.username}</strong>
            </span>
            <button onClick={handleLogout} className="btn btn-link">
              <i className="fa fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>
      </div>

      {showSearch && (
        <SearchUsers 
          onClose={() => {
            setShowSearch(false)
            fetchFriends()
          }} 
        />
      )}

      <div className="friends-main">
        <div className="friends-sidebar">
          <h3>
            <span>Friends</span>
            <button 
              onClick={() => setShowSearch(true)} 
              className="btn-search-friends"
              title="Search & Add Friends"
            >
              <i className="fa fa-user-plus"></i>
            </button>
          </h3>
          {friends.length === 0 ? (
            <div className="no-friends">
              <p>No friends yet. Add some friends to start messaging!</p>
            </div>
          ) : (
            <ul className="friends-list">
              {friends.map(friend => (
                <li 
                  key={friend._id} 
                  className={`friend-item ${selectedFriend?._id === friend._id ? 'active' : ''}`}
                  onClick={() => setSelectedFriend(friend)}
                >
                  <div className="friend-avatar">
                    {friend.firstName?.[0] || '👤'}
                  </div>
                  <div className="friend-info">
                    <div className="friend-name">{friend.firstName} {friend.lastName}</div>
                    <div className="friend-username">@{friend.username}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="friends-chat-area">
          {selectedFriend ? (
            <Chat friend={selectedFriend} currentUser={user} />
          ) : (
            <div className="no-chat-selected">
              <i className="fa fa-comments" style={{ fontSize: '48px', color: '#ccc', marginBottom: '20px' }}></i>
              <p>Select a friend to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Friends

