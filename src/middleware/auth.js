// src/middleware/auth.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) 
    return res.status(401).json({ error: 'Token requerido' });

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer')
    return res.status(401).json({ error: 'Token malformado' });

  const token = parts[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) 
      return res.status(403).json({ error: 'Token inválido' });
    req.user = { userId: payload.userId, email: payload.email };
    next();
  });
}

module.exports = authenticateToken;
