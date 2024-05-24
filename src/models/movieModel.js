import mongoose from 'mongoose';

const { Schema } = mongoose;

const movieSchema = new Schema({
  imdbID: { type: String, unique: true },
  kinopoiskID: { type: String, unique: true },
  titleEn: { type: String },
  titleRu: { type: String },
  alternativeName: { type: String },
  year: { type: String },
  releasedDate: { type: String },
  runtime: { type: Number },
  director: { type: String },
  writer: { type: String },
  descriptionEn: { type: String },
  shortDescrEn: { type: String },
  descriptionRu: { type: String },
  shortDescrRu: { type: String },
  ratingKp: { type: Number },
  ratingIMDb: { type: Number },
  ratingMetacritic: { type: Number },
  posterURL: { type: String },
  previewUrl: { type: String },
  genres: { type: [String] },
  type: { type: String },
  isSeries: { type: Boolean },
  totalSeasons: { type: Number }
});

const Movie = mongoose.model('Movie', movieSchema);
export default Movie;
