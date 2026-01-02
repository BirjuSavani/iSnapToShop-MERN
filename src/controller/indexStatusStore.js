/**
 * In-memory store to track indexing status by application ID.
 * NOTE: This store resets when the process restarts.
 */
const indexStatus = {};

/**
 * Set status for a given application ID.
 * @param {string} applicationId - Unique application identifier.
 * @param {string} status - Current status (e.g. 'running', 'idle').
 */
function setStatus(applicationId, status) {
  if (!applicationId || typeof status !== 'string') {
    throw new Error('Invalid parameters for setStatus');
  }
  indexStatus[applicationId] = {
    status,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get status for a given application ID.
 * @param {string} applicationId - Unique application identifier.
 * @returns {{status: string, updatedAt?: string}} Status info.
 */
function getStatus(applicationId) {
  if (!applicationId) {
    throw new Error('applicationId is required for getStatus');
  }
  return (
    indexStatus[applicationId] || {
      status: 'idle',
      updatedAt: null,
    }
  );
}

module.exports = { setStatus, getStatus };