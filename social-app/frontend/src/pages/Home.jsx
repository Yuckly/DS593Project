import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Notifications from '../components/Notifications'
import CreatePost from '../components/CreatePost'
import Dialog from '../components/Dialog'
import './Home.css'

function Home({ user, setUser }) {
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [openMenuPostId, setOpenMenuPostId] = useState(null)
  const [openCommentMenu, setOpenCommentMenu] = useState(null) // Format: "postId-commentIndex"
  const [userFriends, setUserFriends] = useState({ ids: [], usernames: [] })
  const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: null, showCancel: false })

  useEffect(() => {
    fetchPosts()
    fetchNotificationCount()
    fetchUserFriends()
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchUserFriends = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/friends', {
        credentials: 'include'
      })
      const data = await response.json()
      if (data.success) {
        const friendIds = (data.friends || []).map(f => f._id)
        const friendUsernames = (data.friends || []).map(f => f.username)
        setUserFriends({ ids: friendIds, usernames: friendUsernames })
      }
    } catch (err) {
      console.error('Error fetching friends:', err)
    }
  }

  const fetchNotificationCount = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/users/notifications', {
        credentials: 'include'
      })
      const data = await response.json()
      const pendingCount = (data.pendingFriendRequests || []).length
      // Only count unread notifications
      const unreadCount = (data.notifications || []).filter(n => !n.read).length
      setNotificationCount(pendingCount + unreadCount)
    } catch (err) {
      console.error('Error fetching notification count:', err)
    }
  }

  const fetchPosts = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/home', {
        credentials: 'include'
      })
      const data = await response.json()
      if (data.success) {
        setPosts(data.posts || [])
        setUser(data.user)
      }
    } catch (err) {
      console.error('Error fetching posts:', err)
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
      setUser(null)
      navigate('/login')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const handleLike = async (postId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/posts/${postId}/like`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      if (data.success) {
        // Refresh posts to show updated like count
        fetchPosts()
      }
    } catch (err) {
      console.error('Error liking post:', err)
    }
  }

  const handleComment = async (postId, commentText) => {
    if (!commentText.trim()) return
    
    try {
      const response = await fetch(`http://localhost:3000/api/posts/${postId}/comment`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: commentText })
      })
      const data = await response.json()
      if (data.success) {
        // Refresh posts to show new comment
        fetchPosts()
      }
    } catch (err) {
      console.error('Error adding comment:', err)
    }
  }

  const handleDeletePost = async (postId) => {
    setDialog({
      isOpen: true,
      title: 'Delete Post',
      message: 'Are you sure you want to delete this post? This action cannot be undone.',
      type: 'warning',
      showCancel: true,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const response = await fetch(`http://localhost:3000/api/posts/${postId}`, {
            method: 'DELETE',
            credentials: 'include'
          })
          const data = await response.json()
          if (data.success) {
            setDialog({
              isOpen: true,
              title: 'Success',
              message: 'Post deleted successfully!',
              type: 'success',
              showCancel: false,
              onConfirm: () => {
                fetchPosts()
              }
            })
          } else {
            setDialog({
              isOpen: true,
              title: 'Error',
              message: data.error || 'Error deleting post. Please try again.',
              type: 'error',
              showCancel: false
            })
          }
        } catch (err) {
          console.error('Error deleting post:', err)
          setDialog({
            isOpen: true,
            title: 'Error',
            message: 'Error deleting post. Please try again.',
            type: 'error',
            showCancel: false
          })
        }
      }
    })
  }

  const handleDeleteComment = async (postId, commentIndex) => {
    try {
      const response = await fetch(`http://localhost:3000/api/posts/${postId}/comments/${commentIndex}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      const data = await response.json()
      if (data.success) {
        // Refresh posts to show updated comments
        fetchPosts()
      } else {
        setDialog({
          isOpen: true,
          title: 'Error',
          message: data.error || 'Error deleting comment. Please try again.',
          type: 'error',
          showCancel: false
        })
      }
    } catch (err) {
      console.error('Error deleting comment:', err)
      setDialog({
        isOpen: true,
        title: 'Error',
        message: 'Error deleting comment. Please try again.',
        type: 'error',
        showCancel: false
      })
    }
  }

  const handleAddFriend = async (authorId) => {
    try {
      const response = await fetch('http://localhost:3000/api/users/friend-request', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: authorId })
      })
      const data = await response.json()
      if (data.success) {
        setDialog({
          isOpen: true,
          title: 'Success',
          message: 'Friend request sent!',
          type: 'success',
          showCancel: false,
          onConfirm: () => {
            setOpenMenuPostId(null)
            fetchUserFriends()
            fetchNotificationCount()
          }
        })
      } else {
        setDialog({
          isOpen: true,
          title: 'Error',
          message: data.error || 'Error sending friend request',
          type: 'error',
          showCancel: false
        })
      }
    } catch (err) {
      console.error('Error sending friend request:', err)
      setDialog({
        isOpen: true,
        title: 'Error',
        message: 'Error sending friend request. Please try again.',
        type: 'error',
        showCancel: false
      })
    }
  }

  const handleAddFriendFromComment = async (username) => {
    try {
      const response = await fetch('http://localhost:3000/api/users/friend-request', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: username })
      })
      const data = await response.json()
      if (data.success) {
        setDialog({
          isOpen: true,
          title: 'Success',
          message: 'Friend request sent!',
          type: 'success',
          showCancel: false,
          onConfirm: () => {
            setOpenCommentMenu(null)
            fetchUserFriends()
            fetchNotificationCount()
          }
        })
      } else {
        setDialog({
          isOpen: true,
          title: 'Error',
          message: data.error || 'Error sending friend request',
          type: 'error',
          showCancel: false
        })
      }
    } catch (err) {
      console.error('Error sending friend request:', err)
      setDialog({
        isOpen: true,
        title: 'Error',
        message: 'Error sending friend request. Please try again.',
        type: 'error',
        showCancel: false
      })
    }
  }

  if (loading) {
    return (
      <div className="home-container">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="home-container">
      <div className="top-navbar box-shadow">
        <div className="navbar-content">
          <div className="navbar-left">
            <button 
              onClick={() => setShowNotifications(true)} 
              className="btn-nav-icon notification-btn"
              title="Notifications"
            >
              <i className="fa fa-bell"></i>
              {notificationCount > 0 && (
                <span className="notification-badge">{notificationCount}</span>
              )}
            </button>
            <button 
              onClick={() => navigate('/friends')} 
              className="btn-nav-icon"
              title="Friends & Messages"
            >
              <i className="fa fa-users"></i>
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

      {showNotifications && (
        <Notifications 
          onClose={() => {
            setShowNotifications(false)
            fetchNotificationCount()
          }}
          onUpdate={() => {
            fetchNotificationCount()
            fetchPosts()
          }}
        />
      )}

      {showCreatePost && (
        <CreatePost 
          onClose={() => setShowCreatePost(false)}
          onPostCreated={() => {
            fetchPosts()
          }}
        />
      )}

      <Dialog
        isOpen={dialog.isOpen}
        onClose={() => setDialog({ ...dialog, isOpen: false })}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        onConfirm={dialog.onConfirm}
        confirmText={dialog.confirmText || 'OK'}
        cancelText={dialog.cancelText || 'Cancel'}
        showCancel={dialog.showCancel}
      />

      <button 
        onClick={() => setShowCreatePost(true)} 
        className="fab-create-post"
        title="Create New Post"
      >
        <i className="fa fa-plus"></i>
        <span className="fab-text">Create Post</span>
      </button>

      <div className="main-content" onClick={() => {
        setOpenMenuPostId(null)
        setOpenCommentMenu(null)
      }}>
        <div className="feed-container">
          {posts.length === 0 ? (
            <div className="gram-card">
              <div className="gram-card-content">
                <p className="text-center">No posts yet. Be the first to share something!</p>
              </div>
            </div>
          ) : (
            posts.map((item) => (
              <div key={item.post._id} className="gram-card" onClick={(e) => e.stopPropagation()}>
                <div className="gram-card-header">
                  <div className="gram-card-user-image-placeholder">
                    {item.user.firstName?.[0] || '👤'}
                  </div>
                  <div className="gram-card-header-info">
                    <a className="gram-card-user-name" href="#">
                      @{item.user.username}
                    </a>
                    <div className="time">{item.post.timeago}</div>
                  </div>
                  {String(item.post.authorID) === String(user?.id) && (
                    <button 
                      className="delete-post-btn"
                      onClick={() => handleDeletePost(item.post._id)}
                      title="Delete post"
                    >
                      <i className="fa fa-trash"></i>
                    </button>
                  )}
                  {String(item.post.authorID) !== String(user?.id) && (
                    <div className="post-menu-container">
                      <button 
                        className="gram-card-time"
                        onClick={() => setOpenMenuPostId(openMenuPostId === item.post._id ? null : item.post._id)}
                        title="More options"
                      >
                        <i className="fa fa-ellipsis-v"></i>
                      </button>
                      {openMenuPostId === item.post._id && (
                        <div className="post-menu-dropdown">
                          {!userFriends.ids.some(friendId => String(friendId) === String(item.post.authorID)) && (
                            <button 
                              className="menu-item"
                              onClick={() => handleAddFriend(item.post.authorID)}
                            >
                              <i className="fa fa-user-plus"></i> Add Friend
                            </button>
                          )}
                          {userFriends.ids.some(friendId => String(friendId) === String(item.post.authorID)) && (
                            <div className="menu-item disabled">
                              <i className="fa fa-check"></i> Already Friends
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {item.post.static_url && (
                  <div className="gram-card-image">
                    {item.post.type === 'png' || item.post.type === 'jpg' || item.post.type === 'jpeg' || item.post.type === 'gif' ? (
                      <img 
                        src={`http://localhost:3000${item.post.static_url}`} 
                        alt={item.post.caption}
                        className="img-responsive"
                      />
                    ) : (
                      <video 
                        src={`http://localhost:3000${item.post.static_url}`} 
                        className="img-responsive" 
                        controls
                      />
                    )}
                  </div>
                )}

                <div className="gram-card-content">
                  <div className="gram-card-caption">
                    {item.post.caption && (
                      <p className="caption-text">
                        {item.post.caption}
                      </p>
                    )}
                    {item.post.category && (
                      <span className="label label-info">{item.post.category}</span>
                    )}
                  </div>

                  <p className="comments">
                    {item.post.comments?.length || 0} comment(s).
                  </p>

                  {item.post.comments && item.post.comments.length > 0 && (
                    <div className="comments-div">
                      {item.post.comments.map((comment, idx) => {
                        const commentMenuKey = `${item.post._id}-${idx}`
                        const isCommentAuthor = comment.by === user?.username
                        const isCommentFriend = userFriends.usernames.includes(comment.by)
                        return (
                          <div key={idx} className="comment-item">
                            <a className="user-comment" href="#">
                              {comment.by}
                            </a>
                            {' '}
                            {comment.text}
                            <div className="comment-actions">
                              {isCommentAuthor && (
                                <button 
                                  className="delete-comment-btn"
                                  onClick={() => handleDeleteComment(item.post._id, idx)}
                                  title="Delete comment"
                                >
                                  <i className="fa fa-times"></i>
                                </button>
                              )}
                              {!isCommentAuthor && (
                                <div className="comment-menu-container">
                                  <button 
                                    className="comment-menu-btn"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setOpenCommentMenu(openCommentMenu === commentMenuKey ? null : commentMenuKey)
                                    }}
                                    title="More options"
                                  >
                                    <i className="fa fa-ellipsis-v"></i>
                                  </button>
                                  {openCommentMenu === commentMenuKey && (
                                    <div className="comment-menu-dropdown">
                                      {!isCommentFriend && (
                                        <button 
                                          className="menu-item"
                                          onClick={() => handleAddFriendFromComment(comment.by)}
                                        >
                                          <i className="fa fa-user-plus"></i> Add Friend
                                        </button>
                                      )}
                                      {isCommentFriend && (
                                        <div className="menu-item disabled">
                                          <i className="fa fa-check"></i> Already Friends
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="gram-card-footer">
                  <button 
                    className={`footer-action-icons likes btn btn-link ${item.post.likes?.includes(user?.username) ? 'liked' : ''}`}
                    onClick={() => handleLike(item.post._id)}
                  >
                    <i className="fa fa-thumbs-up"></i> {item.post.likes?.length || 0}
                  </button>
                  <input 
                    className="comments-input" 
                    type="text" 
                    placeholder="Click enter to comment here..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        handleComment(item.post._id, e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default Home
