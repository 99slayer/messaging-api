require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const debug = require('debug')('auth');
const Token = require('./models/token');

// Verifies user access using an access token.
function verify(req, res, next) {
	const authHeader = req.headers.authorization;
	const token = authHeader && authHeader.split(' ')[1];

	if (!token) return res.sendStatus(400);

	jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, authData) => {
		if (err) {
			debug(err);
			return res.status(401).send(err.message || 'Unauthorized');
		} else {
			res.locals.user = authData;
			next();
		}
	});
}

// Attempts to renew user access using a refresh token.
async function refresh(req, res, next) {
	if (!req.cookies.refresh_token) return res.sendStatus(400);

	const token = req.cookies.refresh_token;
	const tokenCheck = await Token.find({ refresh_token: token });

	// Refresh token is invalid.
	if (!tokenCheck) return res.sendStatus(401);

	jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, async (err, authData) => {
		if (err) {
			debug(err);

			if (err.name === 'TokenExpiredError') {
				await Token.findOneAndDelete({
					refresh_token: token,
				});
			}

			return res.sendStatus(401);
		} else {
			const accessToken = generateToken(authData);
			return res.status(200).json({ access_token: accessToken });
		}
	});
}

function generateToken(user, time = null) {
	const token = jwt.sign(
		{
			id: user._id || user.id,
			username: user.username,
			nickname: user.nickname,
			chat_id: user.chat_id || user.current_chat,
		},
		process.env.ACCESS_TOKEN_SECRET,
		{
			expiresIn: time || '30s',
		},
	);

	return token;
}

async function generateRefreshToken(user) {
	const token = jwt.sign(
		{
			id: user._id,
			username: user.username,
			nickname: user.nickname,
			chat_id: user.current_chat,
		},
		process.env.REFRESH_TOKEN_SECRET,
	);

	const refreshToken = new Token({
		refresh_token: token,
	});

	await refreshToken.save();

	return token;
}

async function deleteRefreshToken(req, res, next) {
	const token = req.cookies.refresh_token;

	if (token == null) return res.sendStatus(400);

	const removedToken = await Token.findOneAndDelete({
		refresh_token: token,
	});

	if (removedToken == null) return res.sendStatus(404);

	res.clearCookie('refresh_token');

	next();
}

module.exports = {
	verify,
	refresh,
	generateToken,
	generateRefreshToken,
	deleteRefreshToken,
};
