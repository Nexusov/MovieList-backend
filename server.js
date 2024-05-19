require('dotenv').config()
const axios = require('axios');

const Fastify = require('fastify');
const fastifyCors = require('@fastify/cors');
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
      reply.cache(3600).send(movieData); // 1h cache
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

// GET MOVIE BY IMDb ID FROM OMDB
fastify.get('/movie/:id', async (request, reply) => {
  const movieId = request.params.id;
  console.log(`Received request for movie ID: ${movieId}`);

  try {
    const apiURL = process.env.OMDB_API_URL;
    const apiKey = process.env.OMDB_API_KEY;
    const response = await axios.get(`${apiURL}?apikey=${apiKey}&i=${encodeURIComponent(movieId)}&plot=full`);
    const movieData = response.data;

    if (movieData.Response === "True") {
      return reply.send(movieData);
    } else {
      return reply.status(404).send({ message: 'Movie not found' });
    }
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

    await fastify.listen({ port: process.env.PORT || 3000 });
    console.log(`Server is running on port ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    console.error('Error starting server or connecting to MongoDB:', err.message);
    process.exit(1);
  }
}

run().catch(console.dir);