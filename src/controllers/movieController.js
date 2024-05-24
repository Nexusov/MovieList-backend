import axios from 'axios';
import Movie from '../models/movieModel.js';
import { omdbApiUrl, omdbApiKey, kinopoiskApiUrl, kinopoiskApiKey } from '../config/index.js';
import { isValidIMDbID } from '../utils/validators.js';


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
      axios.get(`${omdbApiUrl}?apikey=${omdbApiKey}&i=${encodeURIComponent(movieId)}&plot=full`),
      axios.get(`${kinopoiskApiUrl}movie`, {
        headers: { 'X-API-KEY': kinopoiskApiKey },
        params: { 'externalId.imdb': movieId, limit: 1 }
      })
    ]);

    const omdbData = omdbResponse.data;
    const kpData = kpResponse.data.docs[0];

    if (omdbData.Response !== "True") {
      return reply.status(404).send({ message: 'Movie not found in OMDb' });
    }

    if (!kpData) {
      return reply.status(404).send({ message: 'Movie not found in Kinopoisk' });
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
      shortDescrRu: kpData.shortDescription || kpData.description.split('. ')[0],
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
      params: { query: movieTitle, limit: 10, page: 1 }
    });
    const movieData = response.data;

    if (movieData.docs && movieData.docs.length > 0) {
      const filteredMovies = movieData.docs.map(movie => ({
        imdbID: movie.externalId.imdb || null,
        kinopoiskID: movie.id,
        titleEn: movie.alternativeName || null,
        titleRu: movie.name || null,
        shortDescription: movie.shortDescription || movie.description.split('. ')[0] || null,
        year: movie.year || null,
        posterURL: movie.poster ? movie.poster.url : null,
        ratingKp: movie.rating ? movie.rating.kp : null,
        ratingIMDb: movie.rating ? movie.rating.imdb : null,
        ratingMetacritic: movie.rating ? movie.rating.filmCritics : null,
        type: movie.type || null,
        internalVotes: movie.votes.imdb || movie.votes.kp || null
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
    const response = await axios.get(`${omdbApiUrl}?apikey=${omdbApiKey}&t=${encodeURIComponent(movieTitle)}&plot=full`);
    const movieData = response.data;

    if (movieData.Response === "True") {
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
