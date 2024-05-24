import mongoose from 'mongoose';

const { Schema } = mongoose;

const roleSchema = new Schema({
  role: { type: String, required: true, unique: true }
});

const Role = mongoose.model('Role', roleSchema);
export default Role;
