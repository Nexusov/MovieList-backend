import bcrypt from 'bcryptjs';
import fetch from 'node-fetch';
import User from '../models/userModel.js';
import Role from '../models/roleModel.js';
import generateToken from '../utils/generateToken.js';
import isPasswordStrong from '../utils/isPasswordStrong.js';
import { sendWelcomeEmail } from '../services/emailService.js';

export const register = async (request, reply) => {
	const { name, email, password } = request.body;

	if (!name || !email || !password) {
		return reply
			.status(400)
			.send({ message: 'Name, email, and password are required' });
	}

	if (!isPasswordStrong(password)) {
		return reply.status(400).send({
			message:
				'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one number',
		});
	}

	let user = await User.findOne({ email });
	if (user) {
		return reply
			.status(400)
			.send({ message: 'User with this email already exists' });
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
		photo: null,
		watched: [],
		watchList: [],
	});

	await user.save();
	const token = generateToken(user._id);
	reply.send({ token });
};

export const login = async (request, reply) => {
	const { email, password } = request.body;

	console.log(`Received login request for email: ${email}`);

	if (!email || !password) {
		return reply
			.status(400)
			.send({ message: 'Email and password are required' });
	}

	const user = await User.findOne({ email }).populate('role');
	console.log(`User found: ${user ? user.email : 'None'}`);

	if (!user) {
		return reply
			.status(400)
			.send({ message: 'No account found with this email' });
	}

	if (user.googleId) {
		return reply.status(400).send({
			message: 'No password set for this account. Please use Google login.',
		});
	}

	const isPasswordValid = await bcrypt.compare(password, user.password);
	if (!isPasswordValid) {
		return reply.status(400).send({ message: 'Invalid password' });
	}

	const token = generateToken(user._id);
	reply.send({ token });
};

export const googleCallback = async (request, reply) => {
	try {
		console.log('Received Google login callback');
		const { access_token } = request.query;

		if (!access_token) {
			throw new Error('No access token provided');
		}

		console.log('Access token:', access_token);

		const response = await fetch(
			'https://www.googleapis.com/oauth2/v3/userinfo',
			{
				headers: { Authorization: `Bearer ${access_token}` },
			}
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch user profile: ${response.statusText}`);
		}

		const profile = await response.json();
		console.log('Google profile:', profile);

		if (!profile.email) {
			throw new Error('Google profile is missing email');
		}

		let user = await User.findOne({ email: profile.email });
		if (!user) {
			const userRole = await Role.findOne({ role: 'User' });

			let username = profile.name;
			let userExists = await User.findOne({ name: username });

			if (userExists) {
				username = profile.email;
			}

			user = new User({
				name: username,
				email: profile.email,
				googleId: profile.sub,
				role: userRole._id,
				photo: profile.picture,
				watched: [],
				watchList: [],
			});
			await user.save();
			console.log('New user created:', user);
		} else {
			console.log('Existing user found:', user);
		}

		const jwtToken = generateToken(user._id);

		sendWelcomeEmail(user.email, user.name)
			.then(() => console.log('Welcome email sent'))
			.catch((err) => console.error('Error sending welcome email:', err));

		reply.send({ token: jwtToken });
	} catch (error) {
		console.error('Error in Google callback:', error);
		reply
			.status(500)
			.send({ message: 'Internal Server Error', error: error.message });
	}
};
