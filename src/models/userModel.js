import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  googleId: { type: String, unique: true, sparse: true },
  photo: { type: String },
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  watched: [
    {
      movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
      watchedAt: { type: Date, required: true },
      userRating: { type: Number }
    }
  ],
  watchList: [
    {
      movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
      addedAt: { type: Date, required: true }
    }
  ]
});

export default mongoose.model('User', userSchema);
