function getPublicEndpoint(req, fallback = '') {
  if (fallback) {
    return fallback.replace(/\/$/, '');
  }

  const forwardedHost = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
  if (!forwardedHost) {
    return '';
  }

  const forwardedProto = (req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim();
  return `${forwardedProto}://${forwardedHost}`;
}

module.exports = { getPublicEndpoint };
