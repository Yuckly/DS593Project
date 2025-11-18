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

  const checkPII = async (text) => {
    try {
      const response = await fetch('http://localhost:3000/api/pii/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ text })
      })

      const data = await response.json()
      return data
    } catch (err) {
      console.error('Error checking PII:', err)
      // If PII check fails, allow message to be sent (fail open)
      return { success: true, hasPII: false, detectedPII: [] }
    }
  }

  const actuallySendMessage = async (messageText) => {
    try {
      const response = await fetch('http://localhost:3000/api/friends/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          to: friend._id,
          text: messageText
        })
      })

      const data = await response.json()
      if (data.success) {
        setMessages([...messages, data.message])
        setNewMessage('')
        setPendingMessage(null)
      } else {
        setDialog({
          isOpen: true,
          title: 'Error',
          message: data.error || 'Failed to send message',
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
    
    // Check for PII first
    const piiCheck = await checkPII(messageText)

    if (piiCheck.hasPII && piiCheck.detectedPII && piiCheck.detectedPII.length > 0) {
      // PII detected - show confirmation dialog
      // Separate regular PII from "others"
      const regularPII = piiCheck.detectedPII.filter(pii => pii.type !== 'others')
      const othersPII = piiCheck.detectedPII.filter(pii => pii.type === 'others')
      
      let piiList = regularPII.map(pii => 
        `• ${pii.type}: "${pii.value}"`
      ).join('\n')
      
      // Add "others" grouped together if any exist (capitalized as "OTHERS")
      // Deduplicate values to avoid showing the same value multiple times
      if (othersPII.length > 0) {
        if (piiList) piiList += '\n'
        const uniqueOthersValues = [...new Set(othersPII.map(pii => pii.value))]
        piiList += '• OTHERS: ' + uniqueOthersValues.map(value => `"${value}"`).join(', ')
      }

      setPendingMessage(messageText)
      setDialog({
        isOpen: true,
        title: 'Potential Sensitive Information Detected. Do you want to continue?',
        message: piiList,
        type: 'warning',
        showCancel: true,
        confirmText: 'Yes, Send Anyway',
        cancelText: 'Cancel',
        onConfirm: () => {
          actuallySendMessage(messageText)
        }
      })
    } else {
      // No PII detected - send immediately
      actuallySendMessage(messageText)
    }
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
          messages.map((msg, idx) => {
            const isOwnMessage = msg.from._id?.toString() === currentUser.id?.toString() || msg.from._id?.toString() === currentUser._id?.toString()
            return (
              <div key={idx} className={`message ${isOwnMessage ? 'own-message' : 'other-message'}`}>
                {!isOwnMessage && (
                  <div className="message-avatar">
                    {msg.from.firstName?.[0] || '👤'}
                  </div>
                )}
                <div className="message-content">
                  {!isOwnMessage && (
                    <div className="message-sender">{msg.from.username}</div>
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

