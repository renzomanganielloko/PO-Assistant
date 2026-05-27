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
    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Credenciales inválidas. Verifica tu correo y contraseña.' });
    }

    const token = jwt.sign({ _id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user._id, email: user.email, fullName: user.fullName, role: user.role }, token });
  } catch (error) {
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
    const users = await User.find({}, 'email fullName role createdAt').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios.' });
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

export { router as authRouter };
