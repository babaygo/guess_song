function sanitizeLocal(str) {
  return String(str ?? '').trim().replace(/[<>&"']/g, '').slice(0, 20);
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

module.exports = { sanitizeLocal, esc };