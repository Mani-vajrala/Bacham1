import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma, config } from '../config.js';

export const registerProfessor = async (req, res) => {
  try {
    const { name, email, password, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const existing = await prisma.professor.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existing) {
      return res.status(400).json({ message: 'A professor account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const professor = await prisma.professor.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        department: department || 'Computer Science'
      }
    });

    const token = jwt.sign({ id: professor.id, email: professor.email }, config.jwtSecret, {
      expiresIn: '7d'
    });

    res.status(201).json({
      message: 'Professor registered successfully.',
      token,
      professor: {
        id: professor.id,
        name: professor.name,
        email: professor.email,
        department: professor.department
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed.', error: error.message });
  }
};

export const loginProfessor = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const professor = await prisma.professor.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!professor) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, professor.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: professor.id, email: professor.email }, config.jwtSecret, {
      expiresIn: '7d'
    });

    res.json({
      message: 'Login successful.',
      token,
      professor: {
        id: professor.id,
        name: professor.name,
        email: professor.email,
        department: professor.department
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed.', error: error.message });
  }
};

export const getProfessorProfile = async (req, res) => {
  try {
    res.json({
      professor: req.professor
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve profile.', error: error.message });
  }
};
