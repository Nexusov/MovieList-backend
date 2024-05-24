import bcrypt from 'bcryptjs';
import fetch from 'node-fetch';
import User from '../models/userModel.js';
import Role from '../models/roleModel.js';
import generateToken from '../utils/generateToken.js';
import isPasswordStrong from '../utils/isPasswordStrong.js';

export const register = async (request, reply) => {
  const { name, email, password } = request.body;

  if (!name || !email || !password) {
    return reply.status(400).send({ message: 'Name, email, and password are required' });
  }

  if (!isPasswordStrong(password)) {
    return reply.status(400).send({ message: 'Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, and one number.' });
  }

  let user = await User.findOne({ email });
  if (user) {
    return reply.status(400).send({ message: 'Email is already in use' });
  }

  user = await User.findOne({ name });
  if (user) {
    return reply.status(400).send({ message: 'Username is already taken' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userRole = await Role.findOne({ role: 'User' });

  user = new User({
    name,
    email,
    password: hashedPassword,
    role: userRole._id,
    watched: [],
    watchList: []
  });
  
  await user.save();
  const token = generateToken(user._id);
  reply.send({ token });
};

export const login = async (request, reply) => {
  const { email, password } = request.body;

  console.log(`Received login request for email: ${email}`);

  if (!email || !password) {
    return reply.status(400).send({ message: 'Email and password are required' });
  }

  const user = await User.findOne({ email }).populate('role');
  console.log(`User found: ${user ? user.email : 'None'}`);

  if (!user) {
    return reply.status(400).send({ message: 'No account found with this email' });
  }

  if (!user.password) {
    return reply.status(400).send({ message: 'No password set for this account. Please use Google login.' });
  }
  
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return reply.status(400).send({ message: 'Invalid password' });
  }
  
  const token = generateToken(user._id);
  reply.send({ token });
};

export const googleCallback = async (request, reply) => {
  const token = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });
  const profile = await response.json();
  
  let user = await User.findOne({ email: profile.email });
  if (!user) {
    const userRole = await Role.findOne({ role: 'User' });
    user = new User({
      name: profile.name,
      email: profile.email,
      googleId: profile.sub,
      role: userRole._id,
      watched: [],
      watchList: []
    });
    await user.save();
  }
  
  const jwtToken = generateToken(user._id);
  reply.send({ token: jwtToken });
};
