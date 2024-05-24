import { getUserById } from '../controllers/userController.js';

async function userRoutes(fastify, options) {
  fastify.get('/user/:id', getUserById);
}

export default userRoutes;
