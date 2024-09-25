import {
	addToWatched,
	addToWatchList,
	getUserById,
	getUserProfile,
} from '../controllers/userController.js';

export default async function userRoutes(fastify, options) {
	fastify.get('/user/:id', getUserById);
	fastify.get(
		'/user/profile',
		{ preValidation: [fastify.authenticate] },
		getUserProfile
	);
	fastify.post(
		'/user/watched',
		{ preValidation: [fastify.authenticate] },
		addToWatched
	);
	fastify.post(
		'/user/watchlist',
		{ preValidation: [fastify.authenticate] },
		addToWatchList
	);
}
