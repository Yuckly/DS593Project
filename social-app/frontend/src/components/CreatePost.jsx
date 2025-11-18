import { useState } from 'react'
import './CreatePost.css'

function CreatePost({ onClose, onPostCreated }) {
  const [caption, setCaption] = useState('')
  const [category, setCategory] = useState('thoughts')
  const [media, setMedia] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('caption', caption)
      formData.append('category', category)
      if (media) {
        formData.append('media', media)
      }

      const response = await fetch('http://localhost:3000/api/posts', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setCaption('')
        setCategory('thoughts')
        setMedia(null)
        setMediaPreview(null)
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

  const handleRemoveMedia = () => {
    setMedia(null)
    setMediaPreview(null)
  }

  return (
    <div className="create-post-overlay" onClick={onClose}>
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
              disabled={loading || (!caption.trim() && !media)}
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

