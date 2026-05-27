import 'dotenv/config';
import { connectDB } from './db.js';
import { User } from './models/User.js';

async function seed() {
  try {
    await connectDB();
    
    const adminEmail = 'renzo.mg@knownonline.com';
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
    } else {
      const admin = new User({
        email: adminEmail,
        password: 'admin-password-2024', // Se debe cambiar después
        fullName: 'Renzo Manganiello',
        role: 'admin'
      });
      await admin.save();
      console.log('Admin user created successfully');
      console.log('Email:', adminEmail);
      console.log('Password: admin-password-2024');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
