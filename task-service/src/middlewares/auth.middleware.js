const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Kein Token, Zugriff verweigert.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-geheimes-fallback-secret');
    
    req.user = decoded; 
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token ist ungültig.' });
  }
};

module.exports = { protect };