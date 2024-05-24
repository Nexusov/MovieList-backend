import { register, login, googleCallback } from '../controllers/authController.js';

async function authRoutes(fastify, options) {
  fastify.post('/register', register);
  fastify.post('/login', login);
  fastify.get('/login/google/callback', googleCallback);
}

export default authRoutes;
