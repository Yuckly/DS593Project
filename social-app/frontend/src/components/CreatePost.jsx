import { useState } from 'react'
import Dialog from './Dialog'
import './CreatePost.css'

function CreatePost({ onClose, onPostCreated }) {
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [category, setCategory] = useState('thoughts')
  const [media, setMedia] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'info', showCancel: false, onConfirm: null })
  const [pendingPost, setPendingPost] = useState(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setMedia(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setMediaPreview(reader.result)
      }
      reader.readAsDataURL(file)
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
      // If PII check fails, allow post to be created (fail open)
      return { success: true, hasPII: false, detectedPII: [] }
    }
  }

  const actuallyCreatePost = async (postData, bypassWarning = false) => {
    setError('')
    setLoading(true)

    try {
      const formData = new FormData()
      
      // Add all fields from postData object to FormData
      Object.keys(postData).forEach(key => {
        if (postData[key] !== null && postData[key] !== undefined) {
          formData.append(key, postData[key])
        }
      })
      
      // Add flag to bypass warning if user confirmed
      if (bypassWarning) {
        formData.append('bypassPIIWarning', 'true')
      }

      const response = await fetch('http://localhost:3000/api/posts', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      const data = await response.json()

      // Handle 400 error (PII detected)
      if (!response.ok && data.piiDetected) {
        setLoading(false)
        
        // If user already tried to continue and still got 400, close modal and return to home
        if (bypassWarning) {
          onClose()
          return
        }
        
        // Show warning dialog with option to continue
        setPendingPost(postData)
        setDialog({
          isOpen: true,
          title: data.error || 'Potential Person Identifiable Information Detected. Are you sure you want to continue?',
          message: '',
          type: 'warning',
          showCancel: true,
          confirmText: 'Yes, Continue',
          cancelText: 'Cancel',
          onConfirm: () => {
            // Retry with bypass flag
            actuallyCreatePost(postData, true)
          }
        })
        return
      }

      if (data.success) {
        setTitle('')
        setCaption('')
        setCategory('thoughts')
        setMedia(null)
        setMediaPreview(null)
        setPendingPost(null)
        if (onPostCreated) {
          onPostCreated()
        }
        onClose()
      } else {
        setError(data.error || 'Failed to create post')
      }
    } catch (err) {
      console.error('Error creating post:', err)
      setError('Error creating post. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() && !caption.trim() && !media) return

    const titleText = title.trim()
    const captionText = caption.trim()
    
    // Submit directly - backend middleware will handle PII checking
    // If backend returns warning, it will be handled in actuallyCreatePost
    const postData = {
      title: titleText,
      caption: captionText,
      category: category,
      media: media
    }
    actuallyCreatePost(postData)
  }

  const handleRemoveMedia = () => {
    setMedia(null)
    setMediaPreview(null)
  }

  return (
    <div className="create-post-overlay" onClick={onClose}>
      <Dialog
        isOpen={dialog.isOpen}
        onClose={() => {
          setDialog({ ...dialog, isOpen: false })
          if (pendingPost) {
            setPendingPost(null)
            // If PII check failed, close modal and return to home
            onClose()
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
      <div className="create-post-modal" onClick={(e) => e.stopPropagation()}>
        <div className="create-post-header">
          <h2>Create New Post</h2>
          <button className="close-btn" onClick={onClose}>
            <i className="fa fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-post-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter post title..."
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="caption">What's on your mind?</label>
            <textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write your post here..."
              rows="4"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="form-control"
            >
              <option value="thoughts">Thoughts</option>
              <option value="moments">Moments</option>
              <option value="events">Events</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="media">Add Photo/Video (Optional)</label>
            {!mediaPreview ? (
              <div className="file-upload-area">
                <input
                  type="file"
                  id="media"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="file-input"
                />
                <label htmlFor="media" className="file-upload-label">
                  <div className="upload-icon-wrapper">
                    <i className="fa fa-cloud-upload-alt"></i>
                  </div>
                  <div className="upload-text-wrapper">
                    <span>Click to upload or drag and drop</span>
                  </div>
                  <div className="upload-info-wrapper">
                    <small>PNG, JPG, GIF, MP4, MOV up to 10MB</small>
                  </div>
                </label>
              </div>
            ) : (
              <div className="media-preview">
                {media.type.startsWith('image/') ? (
                  <img src={mediaPreview} alt="Preview" />
                ) : (
                  <video src={mediaPreview} controls />
                )}
                <button
                  type="button"
                  onClick={handleRemoveMedia}
                  className="remove-media-btn"
                >
                  <i className="fa fa-times"></i> Remove
                </button>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-cancel"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-submit"
              disabled={loading || (!title.trim() && !caption.trim() && !media)}
            >
              {loading ? (
                <>
                  <i className="fa fa-spinner fa-spin"></i> Posting...
                </>
              ) : (
                <>
                  <i className="fa fa-paper-plane"></i> Post
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreatePost

