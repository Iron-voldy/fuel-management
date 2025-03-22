// uuid.js - Utility function to generate UUIDs in the frontend

/**
 * Generates a RFC4122 version 4 compliant UUID
 * @returns {string} A randomly generated UUID
 */
export const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };