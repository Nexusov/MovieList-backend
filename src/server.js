import Fastify from 'fastify';
import fastifyCaching from '@fastify/caching';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyOauth2 from '@fastify/oauth2';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import movieRoutes from './routes/movieRoutes.js';
import userRoutes from './routes/userRoutes.js';
import debugRoutes from './routes/debugRoutes.js'; 
import { dbURL, port, jwtSecret, googleClientId, googleClientSecret, googleCallbackURL } from './config/index.js';

const fastify = Fastify({ logger: true });

fastify.get('/', async (request, reply) => {
  reply.send({ dbUser: dbURL });
});

/* fastify.register(fastifyCors, {
  origin: (origin, cb) => {
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];
    if (allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error("Not allowed by CORS"));
    }
  }
}); */

fastify.register(fastifyCors, {
  origin: '*',
  methods: ['GET', 'PUT', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

fastify.register(fastifyCaching, {
  privacy: 'public',
  expiresIn: 3600 // 1 hour
});

fastify.register(fastifyJwt, { secret: jwtSecret });

fastify.register(fastifyOauth2, {
  name: 'googleOAuth2',
  credentials: {
    client: { id: googleClientId, secret: googleClientSecret },
    auth: fastifyOauth2.GOOGLE_CONFIGURATION
  },
  startRedirectPath: '/login/google',
  callbackUri: googleCallbackURL
});

fastify.register(authRoutes);
fastify.register(movieRoutes);
fastify.register(userRoutes);
fastify.register(debugRoutes); 

mongoose.connect(dbURL, {dbName: 'MovieList'})
  .then(() => {
    console.log('Connected successfully to MongoDB');
    fastify.listen({port}, (err, address) => {
      if (err) {
        fastify.log.error(err);
        process.exit(1);
      }
      fastify.log.info(`Server listening on ${address}`);
    });
  })
  .catch(err => {
    fastify.log.error(err);
    process.exit(1);
  });
