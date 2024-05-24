import { getMovieById, searchMovies, getMovieByTitle } from '../controllers/movieController.js';

async function movieRoutes(fastify, options) {
  fastify.get('/movie/:id', getMovieById);
  fastify.get('/kp/movies/search', searchMovies);
  fastify.get('/omdb/movie', getMovieByTitle);
}

export default movieRoutes;
