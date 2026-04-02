const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/autogenex';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true }
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

const usersToSeed = [
  { email: 'lehrer@schule.de', password: 'passwort123', role: 'teacher' },
  { email: 'kollege1@schule.de', password: 'passwort123', role: 'teacher' },
  { email: 'kollege2@schule.de', password: 'passwort123', role: 'teacher' }
];

async function seedUser() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Verbunden mit MongoDB...');

    for (const userData of usersToSeed) {
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`Übersprungen: User existiert bereits (${userData.email})`);
        continue; 
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = new User({
        email: userData.email,
        password: hashedPassword,
        role: userData.role 
      });

      await user.save();
      console.log(`Erfolgreich! Test-User angelegt: ${userData.email}`);
    }
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    process.exit(0);
  }
}

seedUser();