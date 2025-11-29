# PII Configuration Guide

This guide explains how to configure and use the PII (Personally Identifiable Information) checking middleware in the social application.

## Table of Contents

1. [Overview](#overview)
2. [Setting Up the PII Checker Server](#setting-up-the-pii-checker-server)
3. [Configuring Routes in pii-config.json](#configuring-routes-in-pii-configjson)
4. [Understanding Action Types](#understanding-action-types)
5. [Available PII Entity Types](#available-pii-entity-types)
6. [Frontend Configuration](#frontend-configuration)
7. [Testing and Troubleshooting](#testing-and-troubleshooting)

## Overview

The PII checking system consists of three main components:

1. **PII Checker Server** (`pii-checker/main.py`): A Python Flask server using Microsoft Presidio to detect PII in text
2. **PII Middleware** (`backend/middleware/PIIChecker.js`): Express.js middleware that intercepts requests and checks for PII
3. **Configuration File** (`backend/config/pii-config.json`): JSON file that defines which routes to check and how to handle detected PII

## Setting Up the PII Checker Server

### Prerequisites

- Python 3.7 or higher
- pip (Python package manager)

### Installation Steps

1. Navigate to the PII checker directory:
   ```bash
   cd pii-checker
   ```

2. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

   The main dependencies include:
   - `flask` - Web framework
   - `presidio-analyzer` - PII detection engine
   - `presidio-anonymizer` - PII anonymization engine

### Running the Server

Start the PII checker server:

```bash
python main.py
```

The server will start on **port 12423** by default. You should see:
```
Starting Presidio Anonymization Server...
Server will be available at http://localhost:12423
```

### Verifying the Server is Running

1. **Health Check**: Visit `http://localhost:12423/health` in your browser or use curl:
   ```bash
   curl http://localhost:12423/health
   ```
   Expected response: `{"status": "healthy", "service": "presidio-anonymizer"}`

2. **Web Interface**: Open `http://localhost:12423` in your browser to access the interactive testing interface

3. **Test Endpoint**: Test the anonymization endpoint:
   ```bash
   curl -X POST http://localhost:12423/anonymize \
     -H "Content-Type: application/json" \
     -d '{"text": "My SSN is 123-45-6789", "language": "en"}'
   ```

### Important Notes

- The PII checker server **must be running** before starting the backend server
- If the PII checker is unavailable, the middleware will log an error but allow requests through (fail-open behavior)
- The PII checker URL is configured via the `PII_CHECKER_URL` environment variable (default: `http://localhost:12423/anonymize`)
- The timeout for PII checks is fixed at 5000ms (5 seconds)

## Configuring Routes in pii-config.json

The `pii-config.json` file controls which routes are checked for PII and how detected PII is handled.

### Configuration Structure

```json
{
  "routes": [
    {
      "path": "/api/posts",
      "method": "POST",
      "fields": ["title", "caption"],
      "action": "warn",
      "check_type": ["US_SSN", "CREDIT_CARD"]
    }
  ]
}
```

**Note**: The PII checker URL is configured via the `PII_CHECKER_URL` environment variable. See [Environment Variables](#environment-variables) below.

### Route Configuration Fields

Each route in the `routes` array requires the following fields:

#### `path` (string, required)
- The API route path to check
- Supports parameterized routes using `:paramName` syntax
- Examples:
  - `/api/posts` - Exact match
  - `/api/posts/:postId/comment` - Parameterized route

#### `method` (string, required)
- HTTP method to match (e.g., `"POST"`, `"GET"`, `"PUT"`, `"DELETE"`)
- Must be uppercase

#### `fields` (array, required)
- List of field names from the JSON request body to check for PII
- These fields are extracted from `req.body` and sent to the PII checker
- Field names must match exactly the property names in the request body JSON
- Examples:
  - `["title", "caption"]` - Check both title and caption fields
  - `["text"]` - Check only the text field
  - `["body"]` - Check the body field
  - `["title", "body", "description"]` - Check multiple fields

**See [Configuring Request Body Fields](#configuring-request-body-fields) below for detailed examples.**

#### `action` (string, required)
- Defines how to handle detected PII. Options:
  - `"warn"` - Show warning dialog, allow user to bypass
  - `"block"` - Silently block the message (return 200 but don't save)
  - `"both"` - Warn user but always block, even if user tries to bypass
- See [Understanding Action Types](#understanding-action-types) for details

#### `check_type` (array, required)
- List of specific PII entity types to check for this route
- Only PII types in this list will trigger the action
- Use entity types from `pii-entity-types.md` (see [Available PII Entity Types](#available-pii-entity-types) section)
- Examples:
  - `["US_SSN", "CREDIT_CARD"]` - Only check for SSN and credit cards
  - `["US_SSN", "CREDIT_CARD", "IBAN_CODE", "EMAIL_ADDRESS"]` - Check multiple types

### Environment Variables

#### `PII_CHECKER_URL` (string, optional)
- URL of the PII checker server endpoint
- Default: `"http://localhost:12423/anonymize"`
- Set this environment variable if the PII checker runs on a different host/port
- Example: `PII_CHECKER_URL=http://localhost:12423/anonymize`

**Note**: The timeout for PII checker calls is fixed at 5000ms (5 seconds) and cannot be configured.

### Example Configuration

```json
{
  "routes": [
    {
      "path": "/api/posts",
      "method": "POST",
      "fields": ["title"],
      "action": "warn",
      "check_type": ["US_SSN", "CREDIT_CARD"]
    },
    {
      "path": "/api/posts",
      "method": "POST",
      "fields": ["caption"],
      "action": "block",
      "check_type": ["US_SSN", "CREDIT_CARD"]
    },
    {
      "path": "/api/posts/:postId/comment",
      "method": "POST",
      "fields": ["text"],
      "action": "both",
      "check_type": ["US_SSN", "CREDIT_CARD"]
    },
    {
      "path": "/api/friends/messages",
      "method": "POST",
      "fields": ["text"],
      "action": "warn",
      "check_type": ["US_SSN", "CREDIT_CARD", "IBAN_CODE", "US_PASSPORT", "EMAIL_ADDRESS", "DATE_TIME_DOB"]
    }
  ]
}
```

**Note**: Set the `PII_CHECKER_URL` environment variable to configure the PII checker server URL.

### Multiple Configurations for Same Route

You can have multiple route configurations for the same path and method. Each configuration is checked independently:

```json
{
  "routes": [
    {
      "path": "/api/posts",
      "method": "POST",
      "fields": ["title"],
      "action": "warn",
      "check_type": ["US_SSN"]
    },
    {
      "path": "/api/posts",
      "method": "POST",
      "fields": ["caption"],
      "action": "block",
      "check_type": ["CREDIT_CARD"]
    }
  ]
}
```

This allows different fields in the same request to have different actions and check types.

## Configuring Request Body Fields

The `fields` array specifies which properties from the JSON request body should be checked for PII. The middleware extracts these fields from `req.body` and sends their combined text to the PII checker.

### How Field Extraction Works

1. **Field Matching**: Field names in the `fields` array must exactly match the property names in the request body JSON
2. **Text Extraction**: Only string values are extracted (non-string values are ignored)
3. **Combination**: All specified field values are combined with spaces and sent as a single text to the PII checker
4. **Empty Fields**: Empty strings or missing fields are skipped

### Identifying Request Body Fields

To determine which fields to check, examine the request body structure:

1. **Check the route handler** in `routes/posts.js` or `routes/friends.js` to see which fields are extracted:
   ```javascript
   const { title, caption, category } = req.body;
   ```

2. **Check the frontend code** to see what data is sent:
   ```javascript
   // In CreatePost.jsx
   const postData = {
     title: title.trim(),
     caption: caption.trim(),
     category,
     media
   };
   ```

3. **Inspect network requests** in browser DevTools to see the actual JSON payload

### Common Field Examples

#### Post Creation (`POST /api/posts`)

**Request Body:**
```json
{
  "title": "My Post Title",
  "caption": "This is the post content",
  "category": "thoughts",
  "media": null
}
```

**Configuration Examples:**

1. **Check only title:**
   ```json
   {
     "path": "/api/posts",
     "method": "POST",
     "fields": ["title"],
     "action": "warn",
     "check_type": ["US_SSN", "CREDIT_CARD"]
   }
   ```

2. **Check only caption (body):**
   ```json
   {
     "path": "/api/posts",
     "method": "POST",
     "fields": ["caption"],
     "action": "block",
     "check_type": ["US_SSN", "CREDIT_CARD"]
   }
   ```

3. **Check both title and caption:**
   ```json
   {
     "path": "/api/posts",
     "method": "POST",
     "fields": ["title", "caption"],
     "action": "warn",
     "check_type": ["US_SSN", "CREDIT_CARD"]
   }
   ```

4. **Separate configurations for different fields with different actions:**
   ```json
   {
     "routes": [
       {
         "path": "/api/posts",
         "method": "POST",
         "fields": ["title"],
         "action": "warn",
         "check_type": ["US_SSN"]
       },
       {
         "path": "/api/posts",
         "method": "POST",
         "fields": ["caption"],
         "action": "block",
         "check_type": ["CREDIT_CARD", "EMAIL_ADDRESS"]
       }
     ]
   }
   ```

#### Comment Creation (`POST /api/posts/:postId/comment`)

**Request Body:**
```json
{
  "text": "This is my comment with SSN 123-45-6789"
}
```

**Configuration:**
```json
{
  "path": "/api/posts/:postId/comment",
  "method": "POST",
  "fields": ["text"],
  "action": "both",
  "check_type": ["US_SSN", "CREDIT_CARD"]
}
```

#### Private Messages (`POST /api/friends/messages`)

**Request Body:**
```json
{
  "to": "user123",
  "text": "My email is john@example.com"
}
```

**Configuration:**
```json
{
  "path": "/api/friends/messages",
  "method": "POST",
  "fields": ["text"],
  "action": "warn",
  "check_type": ["US_SSN", "CREDIT_CARD", "IBAN_CODE", "EMAIL_ADDRESS"]
}
```

### Field Name Variations

Different applications may use different field names for similar content. Common variations include:

- **Post content**: `caption`, `body`, `content`, `text`, `description`
- **Post title**: `title`, `subject`, `heading`
- **Message content**: `text`, `message`, `body`, `content`
- **Comment content**: `text`, `comment`, `body`, `content`

**Important**: Always use the exact field name as it appears in your request body JSON. Field names are case-sensitive.

### Checking Multiple Fields

When multiple fields are specified, their values are combined:

**Configuration:**
```json
{
  "fields": ["title", "caption", "description"]
}
```

**Request Body:**
```json
{
  "title": "My SSN is 123-45-6789",
  "caption": "Some content",
  "description": "More details"
}
```

**Text sent to PII checker:**
```
"My SSN is 123-45-6789 Some content More details"
```

The PII checker analyzes this combined text, and if any PII is detected, the action is triggered for the entire request.

### Field Extraction Details

- **String fields only**: Only string values are extracted. Numbers, booleans, objects, and arrays are ignored
- **Whitespace trimming**: Field values are trimmed of leading/trailing whitespace
- **Empty fields**: Empty strings or `null`/`undefined` values are skipped
- **Missing fields**: If a specified field doesn't exist in `req.body`, it's skipped (no error)

### FormData vs JSON

The middleware works with both JSON and FormData requests:

- **JSON requests**: Fields are extracted directly from `req.body`
- **FormData requests**: Fields are extracted from `req.body` after `multer` or `body-parser` processes them

**Example FormData (for file uploads):**
```javascript
// Frontend
const formData = new FormData();
formData.append('title', 'My Post Title');
formData.append('caption', 'Post content');
formData.append('media', file);

// Config
{
  "fields": ["title", "caption"]  // Works the same way
}
```

### Debugging Field Configuration

If fields aren't being checked:

1. **Check field names match exactly** (case-sensitive)
2. **Verify fields exist in request body** - Add logging in route handler:
   ```javascript
   console.log('Request body:', req.body);
   console.log('Available fields:', Object.keys(req.body));
   ```
3. **Check middleware order** - Ensure `PIIChecker` runs after body parsing middleware
4. **Verify field values are strings** - Non-string values are ignored

## Understanding Action Types

### `"warn"` Action

- **Behavior**: Returns HTTP 400 error with `piiDetected: true`
- **User Experience**: Frontend shows a warning dialog asking "Potential Person Identifiable Information Detected. Are you sure you want to continue?"
- **Bypass**: User can click "Yes, Continue" to bypass the warning
- **Use Case**: When you want to warn users but allow them to proceed if they confirm

**Backend Response:**
```json
{
  "error": "Potential Person Identifiable Information Detected. Are you sure you want to continue?",
  "piiDetected": true,
  "actionType": "warn"
}
```

**Frontend Handling:**
- Shows dialog with title containing the error message
- User can confirm to retry with `bypassPIIWarning: true` in the request

### `"block"` Action

- **Behavior**: Returns HTTP 200 success but **silently blocks** the message (doesn't save it)
- **User Experience**: No error shown to user, message appears to be sent but isn't saved
- **Bypass**: Cannot be bypassed
- **Use Case**: When you want to silently prevent sensitive information from being posted

**Backend Response:**
```json
{
  "success": true
}
```

**Frontend Handling:**
- No error dialog shown
- Message input is cleared
- User is not notified that the message was blocked

### `"both"` Action

- **Behavior**: Returns HTTP 400 error (like "warn") but **always blocks** the message, even if user tries to bypass
- **User Experience**: Shows warning dialog, but even if user clicks "Yes, Continue", the message is still blocked
- **Bypass**: Cannot be bypassed (bypass attempt is ignored)
- **Use Case**: When you want to warn users AND prevent the message from being saved

**Backend Response:**
```json
{
  "error": "Potential Person Identifiable Information Detected. Are you sure you want to continue?",
  "piiDetected": true,
  "actionType": "both"
}
```

**Frontend Handling:**
- Shows dialog with title containing the error message
- If user tries to bypass, the request is sent again with `bypassPIIWarning: true`
- Backend still blocks it and returns 400 again
- Frontend silently fails (no error shown on second attempt)

## Available PII Entity Types

The following entity types are available for use in `check_type` arrays. Use the exact names as shown (with underscores).

**Note**: For a complete reference of all available entity types, see `pii-entity-types.md` in the same directory.

### Custom Entity Types
- `DATE_TIME_DOB` - Date of birth (dates in DOB context)
- `ADDRESS` - Physical addresses

### Global Presidio Entities
- `CREDIT_CARD`
- `CRYPTO`
- `EMAIL_ADDRESS`
- `IBAN_CODE`
- `IP_ADDRESS`
- `NRP` (Nationality, religious or political groups)
- `PHONE_NUMBER`
- `MEDICAL_LICENSE`

### US-Specific Entities
- `US_BANK_NUMBER`
- `US_DRIVER_LICENSE`
- `US_ITIN`
- `US_PASSPORT`
- `US_SSN`

### UK-Specific Entities
- `UK_NHS`
- `UK_NINO`

### Spain-Specific Entities
- `ES_NIF`
- `ES_NIE`

### Italy-Specific Entities
- `IT_FISCAL_CODE`
- `IT_DRIVER_LICENSE`
- `IT_VAT_CODE`
- `IT_PASSPORT`
- `IT_IDENTITY_CARD`

### Other Country-Specific Entities
- `PL_PESEL` (Poland)
- `SG_NRIC_FIN`, `SG_UEN` (Singapore)
- `AU_ABN`, `AU_ACN`, `AU_TFN`, `AU_MEDICARE` (Australia)
- `IN_PAN`, `IN_AADHAAR`, `IN_VEHICLE_REGISTRATION`, `IN_VOTER`, `IN_PASSPORT`, `IN_GSTIN` (India)
- `FI_PERSONAL_IDENTITY_CODE` (Finland)
- `KR_RRN` (Korea)
- `TH_TNIN` (Thailand)

### Special Entity Types
- `others` - Low-confidence matches (confidence < 0.4)

### Important Notes

1. **Entity Type Format**: 
   - Config file uses underscores: `DATE_TIME_DOB`
   - Python API returns with spaces: `"DATE TIME DOB"`
   - The middleware automatically handles this conversion

2. **Filtered Out Entities**: The following entities are filtered out by the Python server and should not be used in `check_type`:
   - `URL`
   - `PERSON`
   - `LOCATION`
   - `DATE_TIME` (unless in DOB context, then converted to `DATE_TIME_DOB`)

3. **Low Confidence Matches**: Entities with confidence < 0.4 are categorized as `"others"`

## Frontend Integration

This section explains how to integrate the PII middleware responses into your frontend application.

### Request Body Format

When making requests to routes protected by PII checking, include the `bypassPIIWarning` field in the JSON body to allow users to bypass warnings (for `"warn"` action only):

**Initial Request:**
```json
{
  "title": "My Post Title",
  "caption": "Post content",
  "category": "thoughts"
}
```

**Bypass Request (after user confirms warning):**
```json
{
  "title": "My Post Title",
  "caption": "Post content",
  "category": "thoughts",
  "bypassPIIWarning": true
}
```

**Note**: For FormData requests (file uploads), append `bypassPIIWarning` as a string:
```javascript
formData.append('bypassPIIWarning', 'true');
```

### Middleware Response Format

The middleware returns different responses based on the `action` type and whether PII was detected:

#### Success Response (No PII Detected)
**Status**: `200 OK`
```json
{
  "success": true,
  // ... other response data
}
```

#### Warning Response (`"warn"` or `"both"` action)
**Status**: `400 Bad Request`
```json
{
  "error": "Potential Person Identifiable Information Detected. Are you sure you want to continue?",
  "piiDetected": true,
  "actionType": "warn"  // or "both"
}
```

#### Block Response (`"block"` action)
**Status**: `200 OK` (but message is silently blocked)
```json
{
  "success": true
}
```

**Note**: For `"block"` action, the response appears successful but the message is not saved. The frontend should not reveal this to the user.

### Frontend Implementation Options

#### Option 1: Dialog/Modal (Recommended)

When receiving a `400` response with `piiDetected: true`:

1. **Show a confirmation dialog** with:
   - Title: Use the `error` message from the response
   - Buttons: "Yes, Continue" and "Cancel"

2. **If user clicks "Yes, Continue"**:
   - Retry the request with `bypassPIIWarning: true` added to the request body
   - For `"warn"` action: Request should succeed
   - For `"both"` action: Request will still return 400 (silently fail on second attempt)

3. **If user clicks "Cancel"**:
   - Close dialog and cancel the operation

**Example Flow:**
```javascript
// Make initial request
const response = await fetch('/api/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title, caption, category })
});

const data = await response.json();

if (!response.ok && data.piiDetected) {
  // Show dialog
  const userConfirmed = await showConfirmationDialog(data.error);
  
  if (userConfirmed) {
    // Retry with bypass flag
    const retryResponse = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        title, 
        caption, 
        category,
        bypassPIIWarning: true 
      })
    });
    
    // Handle response (may still fail for "both" action)
    if (retryResponse.ok) {
      // Success
    } else {
      // Silently fail for "both" action
    }
  }
}
```

#### Option 2: Inline Warning

Display a warning message inline in the form:

1. Show the error message from the response
2. Provide a "Continue Anyway" button
3. On click, retry with `bypassPIIWarning: true`

#### Option 3: Toast Notification

For less critical warnings, show a toast notification:

1. Display a toast with the error message
2. Include an action button to retry with bypass
3. User can dismiss or proceed

### Complete Implementation Example

Here's a complete example of how to structure your async function to handle PII checking. This pattern uses a single data object parameter for consistency:

```javascript
// Function signature: (data, bypassWarning = false)
// data: Object containing all request fields (e.g., { postId, text } or { to, text })
// bypassWarning: Boolean flag to bypass PII warning (set to true on retry)

const actuallyPostComment = async (data, bypassWarning = false) => {
  try {
    const response = await fetch(`http://localhost:3000/api/posts/${data.postId}/comment`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: data.text,
        ...(bypassWarning && { bypassPIIWarning: 'true' })
      })
    })
    
    const responseData = await response.json()

    // Handle 400 error (PII detected)
    if (!response.ok && responseData.piiDetected) {
      // If user already tried to continue and still got 400, silently fail
      if (bypassWarning) {
        setPendingComment(null)
        return
      }
      
      // Show warning dialog with option to continue
      setPendingComment(data)
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
          actuallyPostComment(data, true)
        }
      })
      return
    }

    if (responseData.success) {
      // Success - refresh data or update UI
      fetchPosts()
      setPendingComment(null)
    } else {
      // Handle other errors
      setDialog({
        isOpen: true,
        title: 'Error',
        message: responseData.error || 'Failed to add comment',
        type: 'error',
        showCancel: false
      })
    }
  } catch (err) {
    console.error('Error adding comment:', err)
    setDialog({
      isOpen: true,
      title: 'Error',
      message: 'Error adding comment. Please try again.',
      type: 'error',
      showCancel: false
    })
  }
}

// Call the function with a data object
const handleComment = async (postId, commentText) => {
  if (!commentText.trim()) return
  
  // Send comment - backend middleware will handle PII checking
  actuallyPostComment({ postId, text: commentText })
}
```

**Key Points:**
- Use a single `data` object parameter containing all request fields
- Accept `bypassWarning` as the second parameter (defaults to `false`)
- Store the `data` object in state (e.g., `pendingComment`) when showing the dialog
- On retry, pass the stored `data` object with `bypassWarning: true`
- Handle silent failures for "both" action (when `bypassWarning` is already `true`)

### Important Implementation Notes

1. **Check for `piiDetected`**: Always check `response.status === 400` and `data.piiDetected === true` to identify PII errors

2. **Handle "both" action**: When `actionType === "both"`, the second request (with bypass) will still return 400. Handle this silently without showing another error.

3. **Don't reveal blocking**: For `"block"` action, the response is `200 OK` but the message isn't saved. Don't inform the user that their message was blocked.

4. **Generic error handling**: The frontend should handle PII errors generically without exposing backend implementation details (action types, PII types, etc.)

5. **Error message display**: Use the `error` field from the response as the message to display to users. The message is standardized: "Potential Person Identifiable Information Detected. Are you sure you want to continue?"

6. **Data object pattern**: Use a single data object parameter for consistency across all PII-protected functions (comments, posts, messages)

## Testing and Troubleshooting

### Testing the PII Checker Server

1. **Test with curl**:
   ```bash
   curl -X POST http://localhost:12423/anonymize \
     -H "Content-Type: application/json" \
     -d '{"text": "My SSN is 123-45-6789 and my email is test@example.com", "language": "en"}'
   ```

2. **Test in browser**: Visit `http://localhost:12423` for the interactive interface

3. **Check health**: `curl http://localhost:12423/health`

### Testing Route Configuration

1. **Create a test post** with PII:
   - Title: "My SSN is 123-45-6789"
   - The middleware should detect it if `US_SSN` is in `check_type`

2. **Check backend logs**:
   - Look for `[SECURITY]` log messages showing detected PII types and fields
   - Example: `[SECURITY] WARN POST /api/posts | Detected PII types: US_SSN | Fields: title`

3. **Verify frontend behavior**:
   - For `"warn"`: Should show dialog
   - For `"block"`: Should silently fail (no dialog)
   - For `"both"`: Should show dialog but still block

### Backend Logging

The middleware logs important information:

- **PII Detected**: `[SECURITY] WARN POST /api/posts | Detected PII types: US_SSN, CREDIT_CARD | Fields: title, caption`
- **User Bypass**: `[SECURITY] User bypassed PII warning for POST /api/posts | Detected PII types: US_SSN | Fields: title`
- **Blocked Attempt**: `[SECURITY] User attempted to bypass "both" action for POST /api/posts - still blocking`
- **Service Unavailable**: `PII check service unavailable for POST /api/posts (fields: title): timeout of 5000ms exceeded`

Monitor these logs for security and debugging purposes.

## Additional Resources

- **Presidio Documentation**: https://microsoft.github.io/presidio/
- **Python PII Checker**: See `pii-checker/main.py` for implementation details
- **Middleware Implementation**: See `backend/middleware/PIIChecker.js` for middleware logic

