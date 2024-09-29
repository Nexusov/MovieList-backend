import {
	getMovieById,
	searchMovies,
	getMovieByTitle,
	addMovieToUserList,
} from '../controllers/movieController.js';

async function movieRoutes(fastify, options) {
	fastify.get('/movie/:id', getMovieById);
	fastify.get('/kp/movies/search', searchMovies);
	fastify.get('/omdb/movie', getMovieByTitle);
	fastify.post(
		'/user/watchLater',
		{ preValidation: [fastify.authenticate] },
		(req, reply) => addMovieToUserList(req, reply, 'watchLater')
	);
	fastify.post(
		'/user/watchHistory',
		{ preValidation: [fastify.authenticate] },
		(req, reply) => addMovieToUserList(req, reply, 'watchHistory')
	);
}

export default movieRoutes;
