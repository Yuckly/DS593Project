import { useState, useEffect } from 'react'
import Dialog from './Dialog'
import './SearchUsers.css'

function SearchUsers({ onClose }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'info' })

  useEffect(() => {
    if (searchQuery.length > 0) {
      const timer = setTimeout(() => {
        searchUsers()
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setUsers([])
    }
  }, [searchQuery])

  const searchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:3000/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        credentials: 'include'
      })
      const data = await response.json()
      setUsers(data.users || [])
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }

  const sendFriendRequest = async (userId) => {
    try {
      const response = await fetch('http://localhost:3000/api/users/friend-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId })
      })
      const data = await response.json()
      if (data.success) {
        setDialog({
          isOpen: true,
          title: 'Success',
          message: 'Friend request sent!',
          type: 'success',
          onConfirm: () => {
            // Update the user's status
            setUsers(users.map(u => 
              u._id === userId ? { ...u, hasPendingRequest: true } : u
            ))
          }
        })
      } else {
        setDialog({
          isOpen: true,
          title: 'Error',
          message: data.error || 'Failed to send friend request',
          type: 'error'
        })
      }
    } catch (err) {
      console.error('Send friend request error:', err)
      setDialog({
        isOpen: true,
        title: 'Error',
        message: 'Error sending friend request',
        type: 'error'
      })
    }
  }

  return (
    <div className="search-overlay" onClick={onClose}>
      <Dialog
        isOpen={dialog.isOpen}
        onClose={() => setDialog({ ...dialog, isOpen: false })}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        onConfirm={dialog.onConfirm}
      />
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-header">
          <h3>Search Users</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="search-input-container">
          <input
            type="text"
            placeholder="Search by username..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className="search-results">
          {loading && <div className="loading-text">Searching...</div>}
          {!loading && searchQuery.length > 0 && users.length === 0 && (
            <div className="no-results">No users found</div>
          )}
          {users.map(user => (
            <div key={user._id} className="user-result-item">
              <div className="user-info">
                <div className="user-avatar">
                  {user.firstName?.[0] || '👤'}
                </div>
                <div>
                  <div className="user-name">{user.firstName} {user.lastName}</div>
                  <div className="user-username">@{user.username}</div>
                </div>
              </div>
              <div className="user-actions">
                {user.isFriend ? (
                  <span className="status-badge">Friends</span>
                ) : user.hasPendingRequest ? (
                  <span className="status-badge">Request Sent</span>
                ) : (
                  <button
                    className="btn-add-friend"
                    onClick={() => sendFriendRequest(user._id)}
                  >
                    Add Friend
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SearchUsers

