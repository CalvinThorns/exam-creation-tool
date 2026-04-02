const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Dependency Injection Imports
const { createUserRepo } = require('./repositories/user.repo');
const { createAuthService } = require('./services/auth.service');
const { createAuthController } = require('./controllers/auth.controller');
const { createAuthRoutes } = require('./routes/auth.routes');

const app = express();
const PORT = process.env.PORT || 3002;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/autogenex';

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'auth-service' });
});

// === WIRING ===
const userRepo = createUserRepo();
const authService = createAuthService({ userRepo });
const authController = createAuthController({ authService });

app.use('/api/auth', createAuthRoutes({ authController }));

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`[Auth-Service] Verbunden mit MongoDB: ${MONGO_URI}`);

    app.listen(PORT, () => {
      console.log(`[Auth-Service] läuft auf Port ${PORT}`);
    });
  } catch (error) {
    console.error('[Auth-Service] Fehler beim Starten:', error);
    process.exit(1);
  }
}

startServer();