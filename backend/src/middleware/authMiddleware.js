import jwt from 'jsonwebtoken';
import { config, prisma } from '../config.js';

export const authenticateProfessor = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);

    const professor = await prisma.professor.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, department: true }
    });

    if (!professor) {
      return res.status(401).json({ message: 'Invalid token. Professor not found.' });
    }

    req.professor = professor;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token is invalid or expired.', error: error.message });
  }
};
