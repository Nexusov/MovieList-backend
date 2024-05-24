import User from '../models/userModel.js';

async function debugRoutes(fastify, options) {
  fastify.get('/debug/users', async (request, reply) => {
    try {
      const users = await User.find({});
      console.log('All users:', users);
      reply.send(users);
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });
}

export default debugRoutes;
