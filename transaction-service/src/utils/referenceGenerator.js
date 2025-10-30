/**
 * Generate unique transaction reference
 * Format: REF[YYYYMMDD]-[6CHARS]
 * @returns {string} Unique reference
 */
function generateReference() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `REF${dateStr}-${randomStr}`;
}

/**
 * Validate reference format
 * @param {string} reference - Reference to validate
 * @returns {boolean} True if valid
 */
function isValidReference(reference) {
  return /^REF[0-9]{8}-[A-Z0-9]{6}$/.test(reference);
}

/**
 * Extract date from reference
 * @param {string} reference - Reference string
 * @returns {Date|null} Date or null if invalid
 */
function extractDateFromReference(reference) {
  if (!isValidReference(reference)) {
    return null;
  }

  const dateStr = reference.substring(3, 11); // Extract YYYYMMDD
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
  const day = parseInt(dateStr.substring(6, 8));

  return new Date(year, month, day);
}

module.exports = {
  generateReference,
  isValidReference,
  extractDateFromReference
};