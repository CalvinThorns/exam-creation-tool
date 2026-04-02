const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function createAuthService({ userRepo }) {
  const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

  return {
    async register(data) {
  const email = String(data.email || "").trim().toLowerCase();
  const password = String(data.password || "");
  const role = String(data.role || "teacher"); 

  if (!email || !password) {
    const error = new Error("Email und Passwort sind erforderlich");
    error.status = 400;
    throw error;
  }

  const existingUser = await userRepo.findByEmail(email);
  if (existingUser) {
    const error = new Error("Diese E-Mail-Adresse wird bereits verwendet");
    error.status = 400;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = await userRepo.create({
    email,
    password: hashedPassword,
    role,
  });

  const userResponse = newUser.toObject ? newUser.toObject() : { ...newUser };
  delete userResponse.password;

  return userResponse;
},

    login: async (email, password) => {
      const user = await userRepo.findByEmail(email);
      if (!user) {
        throw new Error('Wrong password or email');
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new Error('Wrong password or email');
      }

      const token = jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      return {
        token,
        user: { id: user._id, email: user.email, role: user.role }
      };
    },
  };
}

module.exports = { createAuthService };