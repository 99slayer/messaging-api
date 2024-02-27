const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const User = require('../models/user');
const Chat = require('../models/chat');

const innerWhitespace = (string) => {
	if (/\s/.test(string)) {
		throw new Error('There must not be any inner whitespace.');
	}

	return true;
};

exports.user_list = asyncHandler(async (req, res, next) => {
	const list = await User.find({});
	res.json({ list });
});

exports.user_detail = asyncHandler(async (req, res, next) => {
	const user = await User.findById(req.params.userId);
	res.json({ user });
});

exports.user_create = [
	body('username')
		.trim()
		.custom(innerWhitespace)
		.isLength({ min: 1, max: 50 })
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
		.custom(innerWhitespace)
		.isLength({ min: 8, max: 100 }),
	body('password-confirm')
		.trim()
		.custom(innerWhitespace)
		.isLength({ min: 8, max: 100 })
		.custom((value, { req }) => {
			// Checks if passwords match.
			if (value !== req.body.password) {
				throw new Error('Passwords must match.');
			}

			return true;
		}),
	body('email')
		.trim()
		.custom(innerWhitespace)
		.isEmail()
		.isLength({ min: 8, max: 100 }),
	body('nickname').trim().isLength({ min: 1, max: 50 }),
	body('profile_picture'),
	body('profile_text').trim().isLength({ max: 500 }),

	asyncHandler(async (req, res, next) => {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			const messages = errors.array().map((err) => err.msg);
			return res.status(400).send(messages);
		}

		const user = new User({
			username: req.body.username,
			password: req.body.password,
			email: req.body.email,
			nickname: req.body.nickname,
			profile_picture: req.body.profile_picture,
			profile_text: req.body.profile_text,
			join_date: new Date(),
			chats: null,
		});

		await user.save();
		res.sendStatus(200);
	}),
];

exports.user_update = [
	body('username')
		.if((value, { req }) => {
			return req.body.username;
		})
		.trim()
		.custom(innerWhitespace)
		.isLength({ min: 1, max: 50 })
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
		.custom(innerWhitespace)
		.isLength({ min: 8, max: 100 }),
	body('password-confirm')
		.if((value, { req }) => {
			return req.body['password-confirm'];
		})
		.trim()
		.custom(innerWhitespace)
		.isLength({ min: 8, max: 100 })
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
		.custom(innerWhitespace)
		.isEmail()
		.isLength({ min: 8, max: 100 }),
	body('nickname')
		.if((value, { req }) => {
			return req.body.nickname;
		})
		.trim()
		.isLength({ min: 1, max: 50 }),
	body('profile_picture').if((value, { req }) => {
		return req.body.profile_picture;
	}),
	body('profile_text')
		.if((value, { req }) => {
			return req.body.profile_text;
		})
		.trim()
		.isLength({ max: 500 }),

	asyncHandler(async (req, res, next) => {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			const messages = errors.array().map((err) => err.msg);
			return res.status(400).send(messages);
		}

		const originalUser = await User.findById(req.params.userId);

		await User.findOneAndUpdate(
			{ _id: req.params.userId },
			{
				username: req.body.username ? req.body.username : originalUser.username,
				password: req.body.password ? req.body.password : originalUser.password,
				email: req.body.email ? req.body.email : originalUser.email,
				nickname: req.body.nickname ? req.body.nickname : originalUser.nickname,
				profile_picture: req.body.profile_picture
					? req.body.profile_picture
					: originalUser.profile_picture,
				profile_text: req.body.profile_text
					? req.body.profile_text
					: originalUser.profile_text,
				join_date: originalUser.join_date,
				chats: originalUser.chats,
				_id: req.params.id,
			},
			{ new: true },
		);

		res.sendStatus(200);
	}),
];

exports.user_delete = asyncHandler(async (req, res, next) => {
	const user = await User.findById(req.params.userId);

	async function removeUser(chatId) {
		const updatedChat = await Chat.findOneAndUpdate(
			{ _id: chatId },
			{ $pull: { users: req.params.userId } },
			{ new: true },
		);
	}

	user.chats.forEach((chat) => {
		removeUser(chat._id);
	});

	await User.findByIdAndDelete(req.params.userId);
	res.sendStatus(200);
});
