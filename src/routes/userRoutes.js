import { getUserById, getUserProfile } from '../controllers/userController.js';

export default async function userRoutes(fastify, options) {
	fastify.get('/user/:id', getUserById);
	fastify.get(
		'/user/profile',
		{ preValidation: [fastify.authenticate] },
		getUserProfile
	);
}
