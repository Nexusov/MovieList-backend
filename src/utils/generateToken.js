import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/index.js';

const generateToken = (userId) => {
  return jwt.sign({ _id: userId }, jwtSecret, { expiresIn: '30d' });
};

export default generateToken;
