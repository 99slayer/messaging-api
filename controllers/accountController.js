const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const User = require('../models/user');
const Token = require('../models/token');
const auth = require('../auth');
const { getValidationMessages: gvm } = require('../util');

const storage = multer.memoryStorage();
const MB = 1048576;
const upload = multer({
	storage,
	limits: { fileSize: MB * 6 },
});

const innerWhitespace = (string) => {
	if (/\s/.test(string)) {
		throw new Error('There must not be any inner whitespace.');
	}

	return true;
};

exports.account_detail = asyncHandler(async (req, res, next) => {
	const user = await User.findById(res.locals.user.id, '-chats -password');
	res.json({ user });
});

exports.account_update = [
	upload.single('file'),

	asyncHandler(async (req, res, next) => {
		const input = JSON.parse(req.body.json);
		req.body = input;
		next();
	}),

	body('username')
		.if((value, { req }) => {
			return req.body.username;
		})
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
		.if((value, { req }) => {
			return req.body.password;
		})
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
		.custom((value, { req }) => {
			if (req.body.password && !req.body['password-confirm']) {
				throw new Error('Password confirmation field is missing.');
			} else {
				return true;
			}
		})
		.if((value, { req }) => {
			return req.body['password-confirm'];
		})
		.trim()
		.custom((value, { req }) => {
			// Checks if passwords match.
			if (value !== req.body.password) {
				throw new Error('Passwords must match.');
			}

			return true;
		}),
	body('email')
		.if((value, { req }) => {
			return req.body.email;
		})
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
	body('profile-text')
		.if((value, { req }) => {
			return req.body['profile-text'];
		})
		.trim()
		.isLength({ max: 1000 })
		.withMessage('Profile text exceeds character limit.'),

	asyncHandler(async (req, res, next) => {
		let pswd = false;
		const errors = validationResult(req);
		const returnData = {
			validation: gvm(errors),
		};

		if (!errors.isEmpty()) return res.status(400).send(returnData);

		if (
			!!req.body.password &&
			!!req.body['password-confirm'] &&
			!returnData.validation.password
		) {
			pswd = true;
		}

		const originalUser = await User.findById(res.locals.user.id);

		bcrypt.hash(req.body.password || 'foo', 10, async (err, hashedPswd) => {
			if (err) throw err;
			let userData;
			if (req.body.theme) {
				originalUser.settings.set('theme', req.body.theme);
				await originalUser.save();
				userData = originalUser;
			} else {
				const updatedUser = await User.findOneAndUpdate(
					{ _id: res.locals.user.id },
					{
						username: req.body.username
							? req.body.username
							: originalUser.username,
						password: pswd ? hashedPswd : originalUser.password,
						email: req.body.email ? req.body.email : originalUser.email,
						nickname: req.body.nickname
							? req.body.nickname
							: originalUser.nickname,
						profile_picture: req.file
							? `data:image/jpeg;base64,${req.file.buffer.toString('base64')}`
							: originalUser.profile_picture,
						profile_text: req.body['profile-text']
							? req.body['profile-text']
							: originalUser.profile_text,
						join_date: originalUser.join_date,
						chats: originalUser.chats,
						_id: req.params.id,
					},
					{ new: true },
				);
				userData = updatedUser;
			}

			const token = req.cookies.refresh_token;

			if (token == null) return res.sendStatus(400);

			const removedToken = await Token.findOneAndDelete({
				refresh_token: token,
			});

			res.cookie('refresh_token', await auth.generateRefreshToken(userData), {
				secure: process.env.NODE_ENV !== 'development',
				httpOnly: true,
			});

			return res.status(200).send({
				access_token: auth.generateToken(userData),
				username: req.body.username ? req.body.username : '',
				user_nickname: req.body.nickname ? req.body.nickname : '',
			});
		});
	}),
];

exports.account_change_chat = asyncHandler(async (req, res, next) => {
	const updatedUser = await User.findOneAndUpdate(
		{ _id: res.locals.user.id },
		{
			current_chat: req.params.chatId,
		},
		{ new: true },
	);

	const token = req.cookies.refresh_token;

	if (token == null) return res.sendStatus(400);

	const removedToken = await Token.findOneAndDelete({
		refresh_token: token,
	});

	res.cookie('refresh_token', await auth.generateRefreshToken(updatedUser), {
		secure: process.env.NODE_ENV !== 'development',
		httpOnly: true,
	});

	return res.status(200).send({
		access_token: auth.generateToken(updatedUser),
	});
});
