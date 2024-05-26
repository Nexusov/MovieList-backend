import User from '../models/userModel.js';
import { ObjectId } from 'mongodb';

export const getUserById = async (request, reply) => {
  const userId = request.params.id;
  console.log(`Received request for user ID: ${userId}`);

  try {
    const objectId = new ObjectId(userId);
    const user = await User.findById(objectId).populate('role');

    if (user) {
      console.log(`User found: ${user.email}`);
      return reply.send(user);
    } else {
      console.log(`User not found for ID: ${userId}`);
      return reply.status(404).send({ message: 'User not found' });
    }
  } catch (err) {
    console.log(`Error fetching user with ID: ${userId}`, err);
    fastify.log.error(err);
    return reply.status(500).send({ message: 'Internal server error' });
  }
};

export const getUserProfile = async (request, reply) => {
  try {
    const user = await User.findById(request.user._id).select('-password');
    reply.send(user);
  } catch (error) {
    reply.status(500).send({ message: 'Error fetching user profile' });
  }
};