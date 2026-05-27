import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { auth, admin } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`Login attempt for email: "${email}"`);
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    console.log(`Cleaned email: "${cleanEmail}"`);
    
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      console.log('User not found in DB');
      return res.status(401).json({ message: 'Credenciales inválidas. Verifica tu correo y contraseña.' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: 'Tu cuenta ha sido pausada. Contacta al administrador.' });
    }

    const isMatch = await user.comparePassword(password);
    console.log(`Password match result: ${isMatch}`);

    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas. Verifica tu correo y contraseña.' });
    }

    const token = jwt.sign({ _id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user._id, email: user.email, fullName: user.fullName, role: user.role }, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// Create User (Admin only)
router.post('/register', auth, admin, async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json({ message: 'Usuario creado exitosamente', user: { id: user._id, email: user.email, fullName: user.fullName } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'El correo ya está registrado.' });
    }
    res.status(400).json({ message: error.message });
  }
});

// List all users (Admin only)
router.get('/users', auth, admin, async (req, res) => {
  try {
    const users = await User.find({}, 'email fullName role isActive createdAt').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios.' });
  }
});

// Toggle user status (Admin only)
router.put('/users/:id/toggle', auth, admin, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: 'Usuario no encontrado.' });
    if (targetUser.role === 'admin') {
      return res.status(403).json({ message: 'No se puede pausar a un administrador.' });
    }
    
    targetUser.isActive = !targetUser.isActive;
    await targetUser.save();
    
    res.json({ message: 'Estado del usuario actualizado.', isActive: targetUser.isActive });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el estado del usuario.' });
  }
});

// Delete user (Admin only)
router.delete('/users/:id', auth, admin, async (req, res) => {
  try {
    const userToDelete = await User.findById(req.params.id);
    if (userToDelete.role === 'admin') {
      return res.status(403).json({ message: 'No se puede eliminar a un administrador.' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Usuario eliminado.' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar usuario.' });
  }
});

// Get current user profile
router.get('/me', auth, async (req, res) => {
  res.json({ user: { id: req.user._id, email: req.user.email, fullName: req.user.fullName, role: req.user.role } });
});

// Change password
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!(await req.user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'La contraseña actual es incorrecta.' });
    }

    req.user.password = newPassword; // Pre-save hook will hash it
    await req.user.save();

    res.json({ message: 'Contraseña actualizada exitosamente.' });
  } catch (error) {
    res.status(500).json({ message: 'Error al cambiar la contraseña.' });
  }
});

export { router as authRouter };
