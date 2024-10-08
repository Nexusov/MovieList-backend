import axios from 'axios';
import Movie from '../models/movieModel.js';
import {
	omdbApiUrl,
	omdbApiKey,
	kinopoiskApiUrl,
	kinopoiskApiKey,
} from '../config/index.js';
import { isValidIMDbID } from '../utils/validators.js';
import User from '../models/userModel.js';

export const getMovieById = async (request, reply) => {
	const movieId = request.params.id;
	console.log(`Received request for movie ID: ${movieId}`);

	if (!isValidIMDbID(movieId)) {
		return reply.status(400).send({ message: 'Invalid IMDb ID format' });
	}

	try {
		const movie = await Movie.findOne({ imdbID: movieId });
		if (movie) {
			console.log(`Movie found in DB: ${movieId}`);
			await reply.cache(3600).send(movie);
			return;
		}

		const [omdbResponse, kpResponse] = await Promise.all([
			axios.get(
				`${omdbApiUrl}?apikey=${omdbApiKey}&i=${encodeURIComponent(
					movieId
				)}&plot=full`
			),
			axios.get(`${kinopoiskApiUrl}movie`, {
				headers: { 'X-API-KEY': kinopoiskApiKey },
				params: { 'externalId.imdb': movieId, limit: 1 },
			}),
		]);

		const omdbData = omdbResponse.data;
		const kpData = kpResponse.data.docs[0];

		if (omdbData.Response !== 'True') {
			return reply.status(404).send({ message: 'Movie not found in OMDb' });
		}

		if (!kpData) {
			return reply
				.status(404)
				.send({ message: 'Movie not found in Kinopoisk' });
		}

		const unifiedMovie = {
			imdbID: omdbData.imdbID,
			kinopoiskID: kpData.id,
			titleEn: omdbData.Title,
			titleRu: kpData.name,
			alternativeName: kpData.alternativeName || null,
			year: omdbData.Year,
			releasedDate: omdbData.Released,
			runtime: parseInt(omdbData.Runtime) || parseInt(kpData.movieLength),
			director: omdbData.Director,
			writer: omdbData.Writer,
			descriptionEn: omdbData.Plot,
			shortDescrEn: omdbData.Plot.split('. ')[0],
			descriptionRu: kpData.description,
			shortDescrRu:
				kpData.shortDescription || kpData.description.split('. ')[0],
			ratingKp: parseFloat(kpData.rating.kp.toFixed(1)),
			ratingIMDb: parseFloat(omdbData.imdbRating.toFixed(1)),
			ratingMetacritic: parseFloat(omdbData.Metascore.toFixed(1)),
			posterURL: omdbData.Poster,
			previewUrl: kpData.poster.previewUrl || null,
			genres: omdbData.Genre.split(', '),
			type: kpData.type,
			isSeries: kpData.isSeries,
			totalSeasons: kpData.totalSeasons || null,
		};

		await Movie.create(unifiedMovie);
		console.log(`Movie saved to DB: ${movieId}`);

		reply.cache(3600).send(unifiedMovie);
	} catch (err) {
		console.log(`Error fetching movie with ID: ${movieId}`, err);
		fastify.log.error(err);
		return reply.status(500).send({ message: 'Internal server error' });
	}
};

export const searchMovies = async (request, reply) => {
	const movieTitle = request.query.title;
	console.log(`Received request for movie title: ${movieTitle}`);

	try {
		const response = await axios.get(`${kinopoiskApiUrl}movie/search`, {
			headers: { 'X-API-KEY': kinopoiskApiKey },
			params: { query: movieTitle, limit: 10, page: 1 },
		});
		const movieData = response.data;

		if (movieData.docs && movieData.docs.length > 0) {
			const filteredMovies = movieData.docs.map((movie) => ({
				imdbID: movie.externalId.imdb || null,
				kinopoiskID: movie.id,
				titleEn: movie.alternativeName || null,
				titleRu: movie.name || null,
				shortDescription:
					movie.shortDescription || movie.description.split('. ')[0] || null,
				year: movie.year || null,
				posterURL: movie.poster ? movie.poster.url : null,
				ratingKp: movie.rating ? movie.rating.kp : null,
				ratingIMDb: movie.rating ? movie.rating.imdb : null,
				ratingMetacritic: movie.rating ? movie.rating.filmCritics : null,
				type: movie.type || null,
				internalVotes: movie.votes.imdb || movie.votes.kp || null,
			}));

			reply.send({ docs: filteredMovies });
		} else {
			return reply.status(404).send({ message: 'Movies not found' });
		}
	} catch (err) {
		console.log(`Error fetching movie with title: ${movieTitle}`, err);
		fastify.log.error(err);
		return reply.status(500).send({ message: 'Internal server error' });
	}
};

export const getMovieByTitle = async (request, reply) => {
	const movieTitle = request.query.title;
	console.log(`Received request for movie title: ${movieTitle}`);

	try {
		const response = await axios.get(
			`${omdbApiUrl}?apikey=${omdbApiKey}&t=${encodeURIComponent(
				movieTitle
			)}&plot=full`
		);
		const movieData = response.data;

		if (movieData.Response === 'True') {
			return reply.send(movieData);
		} else {
			return reply.status(404).send({ message: 'Movie not found' });
		}
	} catch (err) {
		console.log(`Error fetching movie with title: ${movieTitle}`, err);
		fastify.log.error(err);
		return reply.status(500).send({ message: 'Internal server error' });
	}
};

export const addMovieToUserList = async (request, reply) => {
	const { id: movieId, action } = request.body;
	const userId = request.user._id;

	console.log(
		`Received request to add movie ID: ${movieId} to user ${userId} under action: ${action}`
	);

	try {
		// Ищем фильм в базе данных по imdbID
		let movie = await Movie.findOne({ imdbID: movieId });

		// Если фильм не найден в базе, загружаем данные из внешних API и сохраняем в базу
		if (!movie) {
			const [omdbResponse, kpResponse] = await Promise.all([
				axios.get(
					`${omdbApiUrl}?apikey=${omdbApiKey}&i=${encodeURIComponent(
						movieId
					)}&plot=full`
				),
				axios.get(`${kinopoiskApiUrl}movie`, {
					headers: { 'X-API-KEY': kinopoiskApiKey },
					params: { 'externalId.imdb': movieId, limit: 1 },
				}),
			]);

			const omdbData = omdbResponse.data;
			const kpData = kpResponse.data.docs[0];

			if (omdbData.Response !== 'True' || !kpData) {
				return reply
					.status(404)
					.send({ message: 'Movie not found in external sources' });
			}

			// Создаем новый объект фильма на основе данных из OMDb и Кинопоиска
			movie = await Movie.create({
				imdbID: omdbData.imdbID,
				kinopoiskID: kpData.id,
				titleEn: omdbData.Title,
				titleRu: kpData.name,
				alternativeName: kpData.alternativeName || null,
				year: omdbData.Year,
				releasedDate: omdbData.Released,
				runtime: parseInt(omdbData.Runtime) || parseInt(kpData.movieLength),
				director: omdbData.Director,
				writer: omdbData.Writer,
				descriptionEn: omdbData.Plot,
				shortDescrEn: omdbData.Plot.split('. ')[0],
				descriptionRu: kpData.description,
				shortDescrRu:
					kpData.shortDescription || kpData.description.split('. ')[0],
				ratingKp: parseFloat(kpData.rating.kp.toFixed(1)),
				ratingIMDb: parseFloat(omdbData.imdbRating.toFixed(1)),
				ratingMetacritic: parseFloat(omdbData.Metascore.toFixed(1)),
				posterURL: omdbData.Poster,
				previewUrl: kpData.poster.previewUrl || null,
				genres: omdbData.Genre.split(', '),
				type: kpData.type,
				isSeries: kpData.isSeries,
				totalSeasons: kpData.totalSeasons || null,
			});

			console.log(`New movie added to DB: ${movieId}`);
			console.log(movie);
		}

		// Ищем пользователя по userId
		const user = await User.findById(userId);

		if (!user) {
			return reply.status(404).send({ message: 'User not found' });
		}

		// Проверяем тип действия (watchLater или watchHistory)
		if (action === 'watchLater') {
			// Проверяем, есть ли фильм уже в watchLater
			const alreadyInWatchLater = user.watchList.some(
				(entry) => entry.movie.toString() === movie._id.toString()
			);
			if (alreadyInWatchLater) {
				return reply
					.status(400)
					.send({ message: 'Movie is already in the watch later list' });
			}

			// Добавляем фильм в watchLater
			user.watchList.push({ movie: movie._id, addedAt: new Date() });
			console.log(`Movie added to watch later list for user: ${userId}`);
		} else if (action === 'watchHistory') {
			// Проверяем, есть ли фильм уже в watched
			const alreadyWatched = user.watched.some(
				(entry) => entry.movie.toString() === movie._id.toString()
			);
			if (alreadyWatched) {
				return reply
					.status(400)
					.send({ message: 'Movie is already in the watch history' });
			}

			// Добавляем фильм в watched
			user.watched.push({ movie: movie._id, watchedAt: new Date() });
			console.log(`Movie added to watch history for user: ${userId}`);
		} else {
			return reply.status(400).send({ message: 'Invalid action' });
		}

		// Сохраняем изменения пользователя
		await user.save();

		reply
			.status(200)
			.send({ message: 'Movie successfully added to user list', user });
	} catch (err) {
		console.log(`Error adding movie to user list for user: ${userId}`, err);
		fastify.log.error(err);
		return reply.status(500).send({ message: 'Internal server error' });
	}
};
