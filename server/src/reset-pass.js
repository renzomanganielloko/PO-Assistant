import 'dotenv/config';
import { connectDB } from './db.js';
import { User } from './models/User.js';
import bcrypt from 'bcryptjs';

async function resetPassword() {
  try {
    await connectDB();
    
    const adminEmail = 'renzo.mg@knownonline.com';
    const admin = await User.findOne({ email: adminEmail });
    
    if (!admin) {
      console.error('Admin user not found!');
      process.exit(1);
    }

    // Set a very simple password
    const newPassword = '123';
    
    // Explicitly hash it here to avoid any schema hook issues
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    admin.password = hashedPassword;
    await admin.save();
    
    console.log('Password reset successfully!');
    console.log('New password is:', newPassword);
    
    process.exit(0);
  } catch (error) {
    console.error('Reset failed:', error);
    process.exit(1);
  }
}

resetPassword();
