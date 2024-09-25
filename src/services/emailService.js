import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASSWORD,
	},
});

export const sendWelcomeEmail = (to, name) => {
	const mailOptions = {
		from: process.env.EMAIL_USER,
		to: to,
		subject: 'Welcome to Our App!',
		text: `Hi ${name},\n\nThank you for registering at our app. We are glad to have you on board!`,
	};

	return transporter.sendMail(mailOptions);
};
