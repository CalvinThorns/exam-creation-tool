const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Kein Token, Zugriff verweigert.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Nutze das gleiche Secret wie im Auth-Service!
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-geheimes-fallback-secret');
    
    // Wir hängen die User-Daten an den Request an
    req.user = decoded; 
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token ist ungültig.' });
  }
};

module.exports = { protect };