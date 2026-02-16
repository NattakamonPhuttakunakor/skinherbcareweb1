import mongoose from 'mongoose';
import User from './src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const ADMIN_USERS = [
  {
    firstName: 'Admin',
    lastName: 'SkinHerbCare',
    email: 'admin@skinherbcare.com',
    password: 'admin123456',
    age: 30,
    occupation: 'Administrator',
    role: 'admin'
  },
  {
    firstName: 'Expert',
    lastName: 'Disease',
    email: 'expert.disease@skinherbcare.com',
    password: 'ExpertDisease@2026',
    age: 30,
    occupation: 'Disease Specialist',
    role: 'admin'
  },
  {
    firstName: 'Expert',
    lastName: 'Herb',
    email: 'expert.herb@skinherbcare.com',
    password: 'ExpertHerb@2026',
    age: 30,
    occupation: 'Herb Specialist',
    role: 'admin'
  }
];

const createAdmins = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) throw new Error('Missing MONGODB_URI (or MONGO_URI) environment variable');

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    for (const account of ADMIN_USERS) {
      const existing = await User.findOne({ email: account.email });
      if (existing) {
        if (existing.role !== 'admin') {
          existing.role = 'admin';
          await existing.save();
          console.log(`Updated role to admin: ${existing.email}`);
        } else {
          console.log(`Already exists: ${existing.email} (role=admin)`);
        }
        continue;
      }

      const created = await User.create(account);
      console.log(`Created admin: ${created.email}`);
    }

    console.log('\nDefault admin/expert accounts:');
    ADMIN_USERS.forEach((a) => {
      console.log(`- ${a.email} / ${a.password}`);
    });
  } catch (error) {
    console.error('Failed to create admin accounts:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
};

createAdmins();
