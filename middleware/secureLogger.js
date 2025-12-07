const SENSITIVE_FIELDS = [
  'password', 'authorization', 'x-api-key', 'token', 'secret', 'jwt'
];

const maskSensitiveData = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const masked = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some(field => 
      lowerKey.includes(field.toLowerCase())
    );
    
    if (isSensitive) {
      masked[key] = '***MASKED***';
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }
  
  return masked;
};

const secureRequestLogger = (req, res, next) => {
  const start = Date.now();
  const safeHeaders = maskSensitiveData(req.headers);
  
  const sensitiveRoutes = ['/auth/', '/payment/', '/webhook/'];
  const isSensitiveRoute = sensitiveRoutes.some(route => req.path.includes(route));
  const safeBody = isSensitiveRoute ? '[REDACTED]' : maskSensitiveData(req.body);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    // console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: duration + 'ms',
      ip: req.ip,
      headers: safeHeaders,
      body: safeBody
    }));
  });
  
  next();
};

module.exports = { secureRequestLogger, maskSensitiveData };
