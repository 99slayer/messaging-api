const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const auth = require('../auth');
const { getValidationMessages: gvm } = require('../util');

const innerWhitespace = (string) => {
	if (/\s/.test(string)) {
		throw new Error('There must not be any inner whitespace.');
	}

	return true;
};

exports.user_list = asyncHandler(async (req, res, next) => {
	const list = await User.find({}, 'username nickname profile_picture');
	res.json({ list });
});

exports.user_detail = asyncHandler(async (req, res, next) => {
	const user = await User.findOne(
		{ username: req.params.username },
		'username nickname profile_picture profile_text join_date',
	);
	res.json({ user });
});

exports.user_create = [
	body('username')
		.trim()
		.custom(innerWhitespace)
		.withMessage('Username should not have any spaces.')
		.notEmpty()
		.isLength({ max: 50 })
		.withMessage('Username should not be longer than 50 characters.')
		.custom(async (value, { req }) => {
			// Checks for duplicate usernames
			const users = await User.find({ username: req.body.username });

			if (users.length > 0) {
				throw new Error('That username already exists.');
			}

			return true;
		}),
	body('password')
		.trim()
		.matches(/\d+/)
		.withMessage('Password must contain at least one number.')
		.matches(/[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]+/)
		.withMessage('Password must contain at least one special character.')
		.custom(innerWhitespace)
		.withMessage('Password cannot have any spaces.')
		.isLength({ min: 8, max: 100 })
		.withMessage('Password should be between 8-100 characters.'),
	body('password-confirm')
		.trim()
		.custom((value, { req }) => {
			// Checks if passwords match.
			if (value !== req.body.password) {
				throw new Error('Passwords must match.');
			}

			return true;
		}),
	body('email')
		.trim()
		.isEmail()
		.withMessage('Invalid email.')
		.isLength({ min: 10, max: 150 })
		.withMessage('Email length is invalid.'),
	body('nickname')
		.if((value, { req }) => {
			return req.body.nickname;
		})
		.trim()
		.isLength({ min: 1, max: 50 })
		.withMessage('Nickname must be between 1-50 characters long.'),

	asyncHandler(async (req, res, next) => {
		const errors = validationResult(req);
		const returnData = {
			validation: gvm(errors),
		};

		if (!errors.isEmpty()) return res.status(400).send(returnData);

		bcrypt.hash(req.body.password, 10, async (err, hashedPswd) => {
			if (err) throw err;

			const user = new User({
				username: req.body.username,
				password: hashedPswd,
				email: req.body.email,
				nickname: req.body.nickname ? req.body.nickname : '',
				join_date: new Date(),
			});

			await user.save();
			res.cookie('refresh_token', await auth.generateRefreshToken(user), {
				secure: process.env.NODE_ENV !== 'development',
				httpOnly: true,
			});

			return res.status(200).send({
				user_id: user.id,
				username: user.username,
				user_nickname: user.nickname,
				access_token: auth.generateToken(user),
			});
		});
	}),
];
