import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/userModel.js'
import Role from '../models/roleModel.js';
import { dbURL } from '../config/index.js';  

const updatePasswords = async () => {
  try {
    await mongoose.connect(dbURL, { dbName: 'MovieList' });
    console.log('Connected successfully to MongoDB');

    const users = await User.find({});
    for (const user of users) {
      if (user.password && !user.password.startsWith('$2a$')) { 
        const hashedPassword = await bcrypt.hash(user.password, 10);
        user.password = hashedPassword;

        if (!user.role) {
          const userRole = await Role.findOne({ role: 'User' });
          user.role = userRole ? userRole._id : new mongoose.Types.ObjectId();
        }

        if (user.watched && user.watched.length > 0) {
          user.watched = user.watched.map(w => ({
            ...w,
            movie: w.movie || new mongoose.Types.ObjectId(),
            watchedAt: w.watchedAt || new Date(),
            userRating: w.userRating || 0
          }));
        }

        if (user.watchList && user.watchList.length > 0) {
          user.watchList = user.watchList.map(w => ({
            ...w,
            movie: w.movie || new mongoose.Types.ObjectId(),
            addedAt: w.addedAt || new Date()
          }));
        }

        await user.save({ validateBeforeSave: false }); 
        console.log(`Password updated for user: ${user.email}`);
      }
    }

    console.log('All passwords have been updated');
    mongoose.disconnect();
  } catch (err) {
    console.error('Error updating passwords:', err);
  }
};

updatePasswords();
