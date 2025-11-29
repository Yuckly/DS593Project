import { useState, useEffect, useRef } from 'react'
import Dialog from './Dialog'
import './Chat.css'

function Chat({ friend, currentUser }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)
  const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'info', showCancel: false, onConfirm: null })
  const [pendingMessage, setPendingMessage] = useState(null)

  useEffect(() => {
    if (friend) {
      fetchMessages()
      // Poll for new messages every 2 seconds
      const interval = setInterval(fetchMessages, 2000)
      return () => clearInterval(interval)
    }
  }, [friend])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/friends/messages/${friend._id}`, {
        credentials: 'include'
      })
      const data = await response.json()
      if (data.success) {
        setMessages(data.messages || [])
      }
    } catch (err) {
      console.error('Error fetching messages:', err)
    } finally {
      setLoading(false)
    }
  }

  const actuallySendMessage = async (data, bypassWarning = false) => {
    try {
      const response = await fetch('http://localhost:3000/api/friends/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          to: data.to,
          text: data.text,
          // Add flag to bypass warning if user confirmed
          ...(bypassWarning && { bypassPIIWarning: 'true' })
        })
      })

      const responseData = await response.json()

      // Handle 400 error (PII detected)
      if (!response.ok && responseData.piiDetected) {
        // If user already tried to continue and still got 400, silently fail
        if (bypassWarning) {
          setNewMessage('')
          setPendingMessage(null)
          return
        }
        
        // Show warning dialog with option to continue
        setPendingMessage(data)
        setDialog({
          isOpen: true,
          title: responseData.error || 'Potential Person Identifiable Information Detected. Are you sure you want to continue?',
          message: '',
          type: 'warning',
          showCancel: true,
          confirmText: 'Yes, Continue',
          cancelText: 'Cancel',
          onConfirm: () => {
            // Retry with bypass flag
            actuallySendMessage(data, true)
          }
        })
        return
      }

      if (responseData.success && responseData.message) {
        // Message was successfully sent
        setMessages([...messages, responseData.message])
        setNewMessage('')
        setPendingMessage(null)
      } else if (responseData.success && !responseData.message) {
        // Message was blocked silently - don't show any error, just clear the input
        setNewMessage('')
        setPendingMessage(null)
      } else {
        setDialog({
          isOpen: true,
          title: 'Error',
          message: responseData.error || 'Failed to send message',
          type: 'error',
          showCancel: false,
          onConfirm: null
        })
      }
    } catch (err) {
      console.error('Error sending message:', err)
      setDialog({
        isOpen: true,
        title: 'Error',
        message: 'Error sending message',
        type: 'error',
        showCancel: false,
        onConfirm: null
      })
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const messageText = newMessage.trim()
    
    // Submit directly - backend middleware will handle PII checking
    // If backend returns warning, it will be handled in actuallySendMessage
    actuallySendMessage({ to: friend._id, text: messageText })
  }

  const formatTime = (date) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now - d
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="chat-container">
        <div className="loading">Loading messages...</div>
      </div>
    )
  }

  return (
    <div className="chat-container">
      <Dialog
        isOpen={dialog.isOpen}
        onClose={() => {
          setDialog({ ...dialog, isOpen: false })
          if (pendingMessage) {
            setPendingMessage(null)
          }
        }}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        showCancel={dialog.showCancel || false}
        confirmText={dialog.confirmText || 'OK'}
        cancelText={dialog.cancelText || 'Cancel'}
        onConfirm={dialog.onConfirm || null}
      />
      <div className="chat-header">
        <div className="chat-header-user">
          <div className="chat-header-avatar">
            {friend.firstName?.[0] || '👤'}
          </div>
          <div>
            <div className="chat-header-name">{friend.firstName} {friend.lastName}</div>
            <div className="chat-header-username">@{friend.username}</div>
          </div>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages
            .filter(msg => msg && msg.from) // Filter out any messages without from field
            .map((msg, idx) => {
              const isOwnMessage = msg.from?._id?.toString() === currentUser.id?.toString() || msg.from?._id?.toString() === currentUser._id?.toString()
              return (
                <div key={idx} className={`message ${isOwnMessage ? 'own-message' : 'other-message'}`}>
                  {!isOwnMessage && (
                    <div className="message-avatar">
                      {msg.from?.firstName?.[0] || '👤'}
                    </div>
                  )}
                  <div className="message-content">
                    {!isOwnMessage && (
                      <div className="message-sender">{msg.from?.username || 'Unknown'}</div>
                    )}
                    <div className="message-text">{msg.text}</div>
                    <div className="message-time">{formatTime(msg.createdAt)}</div>
                  </div>
                </div>
              )
            })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={sendMessage}>
        <input
          type="text"
          className="chat-input"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button type="submit" className="chat-send-btn">
          <i className="fa fa-paper-plane"></i>
        </button>
      </form>
    </div>
  )
}

export default Chat

