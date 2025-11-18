import { useState, useEffect } from 'react'
import Dialog from './Dialog'
import './Notifications.css'

function Notifications({ onClose, onUpdate }) {
  const [notifications, setNotifications] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'info' })

  useEffect(() => {
    fetchNotifications()
    markNotificationsAsRead()
  }, [])

  const markNotificationsAsRead = async () => {
    try {
      await fetch('http://localhost:3000/api/users/notifications/mark-read', {
        method: 'POST',
        credentials: 'include'
      })
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Error marking notifications as read:', err)
    }
  }

  const fetchNotifications = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/users/notifications', {
        credentials: 'include'
      })
      const data = await response.json()
      setNotifications(data.notifications || [])
      setPendingRequests(data.pendingFriendRequests || [])
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFriendRequest = async (requestId, action) => {
    try {
      const response = await fetch('http://localhost:3000/api/users/friend-request/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ requestId, action })
      })
      const data = await response.json()
      if (data.success) {
        fetchNotifications()
        if (onUpdate) onUpdate()
      } else {
        setDialog({
          isOpen: true,
          title: 'Error',
          message: data.error || 'Failed to process request',
          type: 'error'
        })
      }
    } catch (err) {
      console.error('Error processing friend request:', err)
      setDialog({
        isOpen: true,
        title: 'Error',
        message: 'Error processing request',
        type: 'error'
      })
    }
  }

  return (
    <div className="notifications-overlay" onClick={onClose}>
      <Dialog
        isOpen={dialog.isOpen}
        onClose={() => setDialog({ ...dialog, isOpen: false })}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
      />
      <div className="notifications-modal" onClick={(e) => e.stopPropagation()}>
        <div className="notifications-header">
          <h3>Notifications</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="notifications-content">
          {loading ? (
            <div className="loading-text">Loading...</div>
          ) : (
            <>
              {pendingRequests.length > 0 && (
                <div className="notifications-section">
                  <h4>Friend Requests</h4>
                  {pendingRequests.map((request) => (
                    <div key={request._id} className="notification-item friend-request">
                      <div className="notification-info">
                        <div className="notification-avatar">
                          {request.from?.firstName?.[0] || '👤'}
                        </div>
                        <div>
                          <div className="notification-message">
                            <strong>{request.from?.username}</strong> wants to be your friend
                          </div>
                          <div className="notification-time">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="notification-actions">
                        <button
                          className="btn-accept"
                          onClick={() => handleFriendRequest(request._id, 'accept')}
                        >
                          Accept
                        </button>
                        <button
                          className="btn-reject"
                          onClick={() => handleFriendRequest(request._id, 'reject')}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {notifications.length > 0 && (
                <div className="notifications-section">
                  <h4>Recent Notifications</h4>
                  {notifications.slice(0, 10).map((notif, idx) => (
                    <div key={idx} className="notification-item">
                      <div className="notification-avatar">
                        {notif.from?.firstName?.[0] || '👤'}
                      </div>
                      <div>
                        <div className="notification-message">{notif.message}</div>
                        <div className="notification-time">
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pendingRequests.length === 0 && notifications.length === 0 && (
                <div className="no-notifications">No notifications</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Notifications

