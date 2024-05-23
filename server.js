require('dotenv').config()
const axios = require('axios');

const Fastify = require('fastify');
const fastifyCors = require('@fastify/cors');
const fastifyCaching = require('@fastify/caching');
const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb');

const fastify = Fastify({ logger: true });

fastify.get('/', async (request, reply) => {
  reply.send({ dbUser: process.env.DATABASE_URL});
});

fastify.register(fastifyCors, {
  origin: (origin, cb) => {
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];
    if (allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error("Not allowed by CORS"));
    }
  }
});

fastify.register(fastifyCaching, {
  privacy: 'public',
  expiresIn: 3600 // 1 hour
});

const isValidIMDbID = (id) => /^tt\d+$/.test(id);

// GET USER BY ID
fastify.get('/user/:id', async (request, reply) => {
  const userId = request.params.id;
  console.log(`Received request for user ID: ${userId}`);

  try {
    const objectId = new ObjectId(userId);
    const user = await fastify.mongo.db.collection('users').findOne({ _id: objectId });

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
});

// GET MOVIES BY NAME VIA SEARCH INPUT WITH KINOPOISK
fastify.get('/kp/movies/search', async (request, reply) => {
  const movieTitle = request.query.title;
  console.log(`Received request for movie title: ${movieTitle}`);

  try {
    const apiURL = process.env.KINOPOISK_API_URL;
    const apiKey = process.env.KINOPOISK_API_KEY;

    const response = await axios.get(`${apiURL}movie/search`, {
      headers: {
        'X-API-KEY': apiKey
      },
      params: {
        query: movieTitle,
        limit: 10,
        page: 1
      }
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
});

// GET MOVIE BY TITLE FROM OMDB
fastify.get('/omdb/movie', async (request, reply) => {
  const movieTitle = request.query.title;
  console.log(`Received request for movie title: ${movieTitle}`);

  try {
    const apiURL = process.env.OMDB_API_URL;
    const apiKey = process.env.OMDB_API_KEY;
    const response = await axios.get(`${apiURL}?apikey=${apiKey}&t=${encodeURIComponent(movieTitle)}&plot=full`);
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
});

// GET MOVIE BY IMDb ID FROM OMDB AND KINOPOISK
fastify.get('/movie/:id', async (request, reply) => {
  const movieId = request.params.id;
  console.log(`Received request for movie ID: ${movieId}`);

  if (!isValidIMDbID(movieId)) {
    return reply.status(400).send({ message: 'Invalid IMDb ID format' });
  }

  try {
    // Check if movie exists in the db
    const movie = await fastify.mongo.db.collection('movies').findOne({ imdbID: movieId });
    if (movie) {
      console.log(`Movie found in DB: ${movieId}`);
      await reply.cache(3600).send(movie);
      return;
    }

    // Fetch movie data from OMDb API and Kinopoisk API in parallel
    const omdbURL = process.env.OMDB_API_URL;
    const omdbKey = process.env.OMDB_API_KEY;
    const kpURL = process.env.KINOPOISK_API_URL;
    const kpKey = process.env.KINOPOISK_API_KEY;

    const [omdbResponse, kpResponse] = await Promise.all([
      fastify.cache({ key: `omdb_${movieId}`, expiresIn: 3600 }, () => 
        axios.get(`${omdbURL}?apikey=${omdbKey}&i=${encodeURIComponent(movieId)}&plot=full`)
          .then(res => res.data)
      ),
      fastify.cache({ key: `kp_${movieId}`, expiresIn: 3600 }, () => 
        axios.get(`${kpURL}movie`, {
          headers: {
            'X-API-KEY': kpKey
          },
          params: {
            'externalId.imdb': movieId,
            limit: 1
          }
        }).then(res => res.data.docs[0])
      )
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

    // Save movie to the db
    await fastify.mongo.db.collection('movies').insertOne(unifiedMovie);
    console.log(`Movie saved to DB: ${movieId}`);

    reply.cache(3600).send(unifiedMovie);
  } catch (err) {
    console.log(`Error fetching movie with ID: ${movieId}`, err);
    fastify.log.error(err);
    return reply.status(500).send({ message: 'Internal server error' });
  }
});

async function run() {
  try {
    const uri = process.env.DATABASE_URL;
    const client = new MongoClient(uri, {
      serverApi: ServerApiVersion.v1
    });

    await client.connect();
    console.log('Connected successfully to MongoDB');
    const db = client.db('MovieList');
    fastify.decorate('mongo', { client, db });

    await db.collection('users').createIndex({ email: 1 });
    await db.collection('movies').createIndex({ imdbID: 1 });
    await db.collection('movies').createIndex({ kinopoiskId: 1 });

    await fastify.listen({ port: process.env.PORT || 3000 });
    console.log(`Server is running on port ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    console.error('Error starting server or connecting to MongoDB:', err.message);
    process.exit(1);
  }
}

run().catch(console.dir);