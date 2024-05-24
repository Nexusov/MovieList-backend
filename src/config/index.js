import dotenv from 'dotenv';
dotenv.config();

export const dbURL = process.env.DATABASE_URL;
export const port = process.env.PORT || 3000;
export const jwtSecret = process.env.JWT_SECRET;
export const googleClientId = process.env.GOOGLE_CLIENT_ID;
export const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
export const googleCallbackURL = process.env.GOOGLE_CALLBACK_URL;
export const omdbApiUrl = process.env.OMDB_API_URL;
export const omdbApiKey = process.env.OMDB_API_KEY;
export const kinopoiskApiUrl = process.env.KINOPOISK_API_URL;
export const kinopoiskApiKey = process.env.KINOPOISK_API_KEY;
export const kinopoiskApiUrlAlt = process.env.KINOPOISK_API_URL_ALT;
export const kinopoiskApiKeyAlt = process.env.KINOPOISK_API_KEY_ALT;