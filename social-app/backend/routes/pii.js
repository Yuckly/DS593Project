const express = require('express');
const router = express.Router();
const axios = require('axios');

// POST /api/pii/check - Check for PII in text
router.post('/check', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Call the Python Presidio server
    const presidioUrl = process.env.PII_CHECKER_URL || 'http://localhost:12423/anonymize';
    
    try {
      const response = await axios.post(presidioUrl, {
        text: text,
        language: 'en'
      }, {
        timeout: 5000 // 5 second timeout
      });

      const { detected_pii, pii_count } = response.data;

      // Debug: log what we received from Python server
      console.log('Python server returned PII count:', detected_pii?.length || 0);
      console.log('Python server returned PII:', JSON.stringify(detected_pii, null, 2));

      // Ensure detected_pii is an array
      const piiArray = Array.isArray(detected_pii) ? detected_pii : [];

      // The Python server already categorizes low-confidence as "others"
      // So we return all detected PII (both high-confidence and "others")
      const mappedPII = piiArray.map(pii => ({
        type: pii.entity_type || 'unknown',
        value: pii.value || '',
        confidence: pii.confidence || 0
      }));

      console.log('Mapped PII for frontend count:', mappedPII.length);
      console.log('Mapped PII types:', mappedPII.map(p => p.type));

      res.json({
        success: true,
        hasPII: piiArray.length > 0,
        piiCount: piiArray.length,
        detectedPII: mappedPII
      });
    } catch (error) {
      // If Python server is not available, log error but don't block message sending
      console.error('Error calling Presidio server:', error.message);
      res.json({
        success: true,
        hasPII: false,
        piiCount: 0,
        detectedPII: [],
        warning: 'PII detection service unavailable'
      });
    }
  } catch (error) {
    console.error('PII check error:', error);
    res.status(500).json({ error: 'Error checking for PII' });
  }
});

module.exports = router;

