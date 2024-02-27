require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const debug = require('debug')('auth');
const Token = require('./models/token');

// Verifies user access using an access token.
function verify(req, res, next) {
	const authHeader = req.headers.authorization;
	const token = authHeader && authHeader.split(' ')[1];

	if (token == null) return res.sendStatus(400);

	jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, authData) => {
		if (err) {
			debug(err);
			return res.sendStatus(401);
		} else {
			next();
		}
	});
}

// Attempts to renew user access using a refresh token.
async function refresh(req, res, next) {
	if (req.headers.refreshtoken == null) return res.sendStatus(400);

	const tokens = await Token.find({});
	const authHeader = req.headers.refreshtoken;
	const token = authHeader.split('=')[1];
	const tokenList = [];
	tokens.forEach((x) => tokenList.push(x.refresh_token));

	// Refresh token is not valid
	if (!tokenList.includes(token)) return res.sendStatus(401);

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
			const user = authData.user;
			const accessToken = generateToken(user);
			return res.json({ token: accessToken });
		}
	});
}

function generateToken(user) {
	return jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, {
		expiresIn: '30s',
	});
}

async function generateRefreshToken(user) {
	const token = jwt.sign({ user }, process.env.REFRESH_TOKEN_SECRET);

	const refreshToken = new Token({
		refresh_token: token,
	});

	await refreshToken.save();

	return token;
}

async function deleteRefreshToken(req, res, next) {
	const authHeader = req.headers.refreshtoken;
	const token = authHeader.split('=')[1];

	if (token == null) return res.sendStatus(400);

	const removedToken = await Token.findOneAndDelete({
		refresh_token: token,
	});

	if (removedToken == null) return res.sendStatus(404);

	return res.sendStatus(200);
}

module.exports = {
	verify,
	refresh,
	generateToken,
	generateRefreshToken,
	deleteRefreshToken,
};
