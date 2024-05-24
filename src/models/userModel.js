import mongoose from 'mongoose';

const { Schema } = mongoose;

const watchedSchema = new Schema({
  movie: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
  watchedAt: { type: Date, required: true },
  userRating: { type: Number, min: 0, max: 10 }
});

const watchListSchema = new Schema({
  movie: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
  addedAt: { type: Date, required: true }
});

const userSchema = new Schema({
  name: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  googleId: { type: String },
  role: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
  watched: [watchedSchema],
  watchList: [watchListSchema]
});

const User = mongoose.model('User', userSchema);
export default User;
