const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Extremely sensitive PII types that should be blocked silently
const BLOCKED_PII_TYPES = [
  'US SSN',
  'SSN',
  'CREDIT CARD',
  'CREDIT_CARD',
  'CREDIT_CARD_NUMBER',
  'IBAN CODE',
  'IBAN',
  'US PASSPORT',
  'PASSPORT',
  'US DRIVER LICENSE',
  'DRIVER LICENSE',
  'DRIVER_LICENSE'
];

/**
 * Middleware to silently block posts/comments containing extremely sensitive PII
 * Returns a generic error without revealing the reason for rejection
 */
const blockSensitivePII = async (req, res, next) => {
  try {
    // Extract text from request body
    const text = req.body.caption || req.body.text || '';
    
    if (!text || !text.trim()) {
      // If no text, allow through (might be media-only post)
      return next();
    }

    // Call the Python Presidio server to check for PII
    const presidioUrl = 'http://localhost:12423/anonymize';
    
    try {
      const response = await axios.post(presidioUrl, {
        text: text.trim(),
        language: 'en'
      }, {
        timeout: 5000 // 5 second timeout
      });

      const { detected_pii } = response.data;
      const piiArray = Array.isArray(detected_pii) ? detected_pii : [];

      // Check if any detected PII is in the blocked list
      for (const pii of piiArray) {
        const entityType = (pii.entity_type || '').replace(/_/g, ' ').toUpperCase();
        
        // Check if this PII type should be blocked
        if (BLOCKED_PII_TYPES.some(blockedType => 
          entityType.includes(blockedType) || blockedType.includes(entityType)
        )) {
          // Log for security monitoring (but don't expose to user)
          console.warn(`[SECURITY] Blocked post/comment containing sensitive PII: ${entityType}`);
          
          // Clean up uploaded file if it exists (multer may have already processed it)
          if (req.file && req.file.path) {
            try {
              fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
              console.error('Error deleting uploaded file:', unlinkError);
            }
          }
          
          // Return success response but don't actually process the request
          // This silently blocks the post/comment without notifying the user
          return res.status(200).json({ 
            success: true
          });
        }
      }

      // No blocked PII found, continue to next middleware
      next();
    } catch (error) {
      // If PII check service is unavailable, log but allow through
      // (fail open to avoid blocking legitimate posts if service is down)
      console.error('PII check service unavailable, allowing request through:', error.message);
      next();
    }
  } catch (error) {
    // If middleware itself fails, log but allow through (fail open)
    console.error('Error in blockSensitivePII middleware:', error);
    next();
  }
};

module.exports = blockSensitivePII;

