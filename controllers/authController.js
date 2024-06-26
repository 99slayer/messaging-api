const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const auth = require('../auth');
const { getValidationMessages: gvm } = require('../util');

exports.auth_login = [
	body('username')
		.trim()
		.notEmpty()
		.withMessage('Username field cannot be empty.')
		.isLength({ max: 50 }),
	body('password')
		.trim()
		.notEmpty()
		.withMessage('Password field cannot be empty.')
		.isLength({ min: 8, max: 100 }),

	asyncHandler(async (req, res, next) => {
		const errors = validationResult(req);
		const returnData = {
			validation: gvm(errors),
		};

		if (!errors.isEmpty()) return res.status(400).send(returnData);

		const user = await User.findOne({ username: req.body.username });

		if (!user) {
			returnData.validation.username = ['Username does not exist.'];
			return res.status(404).send(returnData);
		}

		if (!(await bcrypt.compare(req.body.password, user.password))) {
			returnData.validation.password = ['Incorrect password'];
			return res.status(400).send(returnData);
		}

		res.setHeader('Access-Control-Allow-Credentials', true);
		res.cookie('refresh_token', await auth.generateRefreshToken(user), {
			secure: process.env.NODE_ENV !== 'development',
			httpOnly: true,
		});
		return res.status(200).send({
			user_id: user.id,
			username: user.username,
			user_nickname: user.nickname,
			user_theme: user.get('settings.theme')
				? user.get('settings.theme')
				: 'theme-default',
			access_token: auth.generateToken(user),
			current_chat_id: user.current_chat,
		});
	}),
];

exports.auth_storage_check = asyncHandler(async (req, res, next) => {
	const usernameCheck = res.locals.user.username === req.body.username;
	const nicknameCheck = res.locals.user.nickname === req.body.nickname;
	const chatCheck = res.locals.user.chat_id === req.body.currentChat;
	const check = usernameCheck && nicknameCheck && chatCheck;
	return res.status(200).send({ ok: check });
});
