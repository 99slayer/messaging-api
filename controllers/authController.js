const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const User = require('../models/user');
const auth = require('../auth');

exports.auth_login = [
	body('username').trim().isLength({ min: 1, max: 50 }),
	body('password').trim().isLength({ min: 8 }),

	asyncHandler(async (req, res, next) => {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			const messages = errors.array().map((err) => err.msg);
			return res.status(400).send(messages);
		}

		const user = await User.findOne({ username: req.body.username });

		if (!user) return res.sendStatus(404);
		if (user.password !== req.body.password) return res.sendStatus(400);

		res.cookie('refresh_token', auth.generateRefreshToken(user), {
			secure: process.env.NODE_ENV !== 'development',
			httpOnly: true,
		});
		return res.status(200).send({
			access_token: auth.generateToken(user),
		});
	}),
];
