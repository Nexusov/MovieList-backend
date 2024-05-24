import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/index.js';

const authMiddleware = (request, reply, done) => {
  const token = request.headers.authorization && request.headers.authorization.split(' ')[1];
  if (!token) {
    return reply.status(401).send({ message: 'No token provided' });
  }
  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return reply.status(401).send({ message: 'Invalid token' });
    }
    request.user = decoded;
    done();
  });
};

export default authMiddleware;
