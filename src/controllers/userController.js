import User from '../models/userModel.js';
import { ObjectId } from 'mongodb';
import { findOrCreateMovie } from './movieController.js';

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

export const addToWatched = async (request, reply) => {
	const { movieId, userRating } = request.body;
	const userId = request.user._id;

	if (!userId || !movieId) {
		return reply
			.status(400)
			.send({ message: 'User ID and Movie ID are required' });
	}

	try {
		const movie = await findOrCreateMovie(movieId);

		const user = await User.findById(userId).populate('watched.movie');

		if (!user) {
			return reply.status(404).send({ message: 'User not found' });
		}

		const movieExists = user.watched.find((watch) =>
			watch.movie._id.equals(movie._id)
		);

		if (movieExists) {
			return reply
				.status(400)
				.send({ message: 'Movie already in watched list' });
		}

		user.watched.push({
			movie: movie._id,
			watchedAt: new Date(),
			userRating: userRating || null,
		});

		await user.save();
		reply.send({ message: 'Movie added to watched list' });
	} catch (error) {
		console.error('Error adding movie to watched list:', error);
		reply.status(500).send({ message: 'Internal server error' });
	}
};

export const addToWatchList = async (request, reply) => {
	const { movieId } = request.body; // Это kinopoiskID или imdbID
	const userId = request.user._id;

	if (!userId || !movieId) {
		return reply
			.status(400)
			.send({ message: 'User ID and Movie ID are required' });
	}

	try {
		// Получаем или создаем фильм с использованием функции findOrCreateMovie
		const movie = await findOrCreateMovie(movieId);

		if (!movie) {
			return reply.status(404).send({ message: 'Movie not found' });
		}

		console.log('Movie to add to watchList:', movie);
		console.log('Movie ID:', movie._id);

		const user = await User.findById(userId).populate('watchList.movie');

		if (!user) {
			return reply.status(404).send({ message: 'User not found' });
		}

		const movieExists = user.watchList.find(
			(watch) => watch.movie._id.toString() === movie._id.toString()
		);

		if (movieExists) {
			return reply.status(400).send({ message: 'Movie already in watchlist' });
		}

		// Добавляем фильм в watchList пользователя
		user.watchList.push({
			movie: movie._id, // Здесь должен быть ObjectId фильма
			addedAt: new Date(),
		});

		await user.save();
		reply.send({ message: 'Movie added to watchlist' });
	} catch (error) {
		console.error('Error adding movie to watchlist:', error);
		reply.status(500).send({ message: 'Internal server error' });
	}
};
