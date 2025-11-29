const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load PII configuration
const configPath = path.join(__dirname, '../config/pii-config.json');
let piiConfig = null;

try {
  const configFile = fs.readFileSync(configPath, 'utf8');
  piiConfig = JSON.parse(configFile);
} catch (error) {
  console.error('Error loading PII config:', error);
  throw new Error('Failed to load PII configuration');
}

/**
 * Match route path with config path pattern
 * Handles parameterized routes like /api/posts/:postId/comment
 * Supports both full paths and relative paths
 */
function matchRoute(req, configPath) {
  // Get the full original URL path (without query string)
  const originalPath = req.originalUrl ? req.originalUrl.split('?')[0] : req.path;
  // Also check the relative path (for routes mounted with app.use)
  const relativePath = req.path;
  // Also check baseUrl + path for mounted routes
  const basePath = req.baseUrl ? req.baseUrl + req.path : req.path;
  
  // Convert config path pattern to regex
  const pattern = configPath.replace(/:[^/]+/g, '[^/]+');
  const regex = new RegExp(`^${pattern}$`);
  
  // Try matching against all possible path combinations
  return regex.test(originalPath) || regex.test(relativePath) || regex.test(basePath);
}

/**
 * Extract field values from request body
 */
function extractFieldValues(req, fields) {
  const values = [];
  for (const field of fields) {
    const value = req.body[field];
    if (value && typeof value === 'string' && value.trim()) {
      values.push(value.trim());
    }
  }
  return values;
}

/**
 * Normalize PII type for comparison
 * Note: The Python API returns entity types with spaces (e.g., "DATE TIME DOB") 
 * while config uses underscores (e.g., "DATE_TIME_DOB")
 * This function normalizes both to the same format for comparison
 */
function normalizePIIType(type) {
  if (!type) return '';
  
  // Convert to uppercase and normalize spaces/underscores to single underscores
  // This allows comparison between "DATE TIME DOB" (from API) and "DATE_TIME_DOB" (from config)
  let normalized = type.toUpperCase().trim();
  normalized = normalized.replace(/[\s_]+/g, '_');
  
  // Return the normalized type as-is (no mapping, use original entity type names)
  return normalized;
}

/**
 * Check if detected PII contains blocked types
 * Returns object with { hasBlocked: boolean, detectedTypes: string[] }
 */
function hasBlockedPII(detectedPII, blockedTypes) {
  if (!Array.isArray(detectedPII) || detectedPII.length === 0) {
    return { hasBlocked: false, detectedTypes: [] };
  }

  // Normalize blocked types
  const normalizedBlockedTypes = blockedTypes.map(type => normalizePIIType(type));
  const detectedBlockedTypes = [];

  for (const pii of detectedPII) {
    const entityType = normalizePIIType(pii.entity_type || '');
    
    // Check if this PII type matches any blocked type
    if (normalizedBlockedTypes.includes(entityType)) {
      detectedBlockedTypes.push(entityType);
    }
  }
  
  return {
    hasBlocked: detectedBlockedTypes.length > 0,
    detectedTypes: [...new Set(detectedBlockedTypes)] // Remove duplicates
  };
}

/**
 * Configurable PII middleware that checks routes based on configuration
 * Supports "warn" (returns error) and "block" (returns success but blocks) actions
 */
const PIIChecker = async (req, res, next) => {
  try {
    // Find ALL matching route configurations (support multiple configs for same path/method)
    const matchingRoutes = piiConfig.routes.filter(route => {
      const methodMatches = route.method === req.method;
      const pathMatches = matchRoute(req, route.path);
      return methodMatches && pathMatches;
    });

    // If no routes are configured for PII checking, allow through
    if (matchingRoutes.length === 0) {
      return next();
    }

    // Check each route configuration separately
    for (const routeConfig of matchingRoutes) {
      // Extract field values to check for this specific config
      const fieldValues = extractFieldValues(req, routeConfig.fields);
      
      // Debug: log if fields are empty (helps diagnose body parsing issues)
      if (fieldValues.length === 0 && routeConfig.fields.length > 0) {
        console.log(`[PII DEBUG] No field values found for ${req.method} ${req.path} | Looking for fields: ${routeConfig.fields.join(', ')} | req.body keys: ${Object.keys(req.body || {}).join(', ')}`);
      }

      // If no fields to check for this config, skip to next config
      if (fieldValues.length === 0) {
        continue;
      }

      // Combine field values into a single text for PII checking
      const combinedText = fieldValues.join(' ');

      // Call the PII checker
      try {
        const response = await axios.post(
          piiConfig.piiCheckerUrl,
          {
            text: combinedText,
            language: 'en'
          },
          {
            timeout: piiConfig.timeout || 5000
          }
        );

        const { detected_pii } = response.data;
        const piiArray = Array.isArray(detected_pii) ? detected_pii : [];

        // Use route-specific check_type if provided
        const typesToCheck = routeConfig.check_type && routeConfig.check_type.length > 0
          ? routeConfig.check_type
          : []; // No global fallback - if not specified, don't check

        // Check if any blocked PII types are detected for this config's fields
        const piiCheckResult = hasBlockedPII(piiArray, typesToCheck);
        if (piiCheckResult.hasBlocked) {
          // Log for security monitoring with detailed PII type and field information
          const action = routeConfig.action || 'block';
          const piiTypesStr = piiCheckResult.detectedTypes.join(', ');
          const fieldsStr = routeConfig.fields.join(', ');
          
          // Check if user has confirmed to bypass warning
          const bypassWarning = req.body.bypassPIIWarning === 'true' || req.body.bypassPIIWarning === true;
          
          // Handle "both" action - warn but always block, even if user tries to bypass
          if (action === 'both') {
            // Even if user tries to bypass, still block
            if (bypassWarning) {
              console.warn(`[SECURITY] User attempted to bypass "both" action for ${req.method} ${req.path}`);
              console.warn(`[SECURITY] Detected PII types: ${piiTypesStr} | Fields: ${fieldsStr} - still blocking`);
            } else {
              console.warn(`[SECURITY] BOTH (warn+block) ${req.method} ${req.path}`);
              console.warn(`[SECURITY] Detected PII types: ${piiTypesStr} | Fields: ${fieldsStr}`);
            }
            
            // Clean up uploaded file if it exists
            if (req.file && req.file.path) {
              try {
                fs.unlinkSync(req.file.path);
              } catch (unlinkError) {
                console.error('Error deleting uploaded file:', unlinkError);
              }
            }
            
            // Return error with actionType to distinguish from "warn"
            return res.status(400).json({ 
              error: 'Potential Person Identifiable Information Detected. Are you sure you want to continue?',
              piiDetected: true,
              actionType: 'both'
            });
          }
          
          // Handle "warn" action - allow bypass if user confirms
          if (action === 'warn' && bypassWarning) {
            // User confirmed, allow through but log it
            console.warn(`[SECURITY] User bypassed PII warning for ${req.method} ${req.path}`);
            console.warn(`[SECURITY] Detected PII types: ${piiTypesStr} | Fields: ${fieldsStr} - user bypassed`);
            continue; // Check next route config
          }
          
          console.warn(`[SECURITY] ${action.toUpperCase()} ${req.method} ${req.path}`);
          console.warn(`[SECURITY] Detected PII types: ${piiTypesStr} | Fields: ${fieldsStr}`);
          
          // Clean up uploaded file if it exists (multer may have already processed it)
          if (req.file && req.file.path) {
            try {
              fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
              console.error('Error deleting uploaded file:', unlinkError);
            }
          }

          // Handle based on action type
          if (action === 'warn') {
            // Return error message so frontend can take appropriate actions
            return res.status(400).json({ 
              error: 'Potential Person Identifiable Information Detected. Are you sure you want to continue?',
              piiDetected: true,
              actionType: 'warn'
            });
          } else {
            // Default to "block" - return success but silently block the message
            return res.status(200).json({ 
              success: true
            });
          }
        }

        // If PII is detected but not in check_type, log it
        if (piiArray.length > 0) {
          console.log(`[INFO] PII detected in ${req.method} ${req.path} (fields: ${routeConfig.fields.join(', ')}) but not in check_type`);
        }
      } catch (error) {
        // If PII check service is unavailable for this config, log but continue checking other configs
        console.error(`PII check service unavailable for ${req.method} ${req.path} (fields: ${routeConfig.fields.join(', ')}):`, error.message);
        // Continue to next route config instead of failing completely
      }
    }

    // No blocked PII found in any route config, continue to next middleware
    next();
  } catch (error) {
    // If middleware itself fails, log but allow through (fail open)
    console.error('Error in PIIChecker middleware:', error);
    next();
  }
};

module.exports = PIIChecker;

