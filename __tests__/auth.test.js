const app = require('../app');
const request = require('supertest');
const initializeMongoServer = require('../mongo-test-config');
const createDocs = require('../populate-db');
const clearDocs = require('../clear-db');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const Token = require('../models/token');
const debug = require('debug')('test');

describe('auth routes/controllers', () => {
	let users;
	const tokens = [];

	beforeAll(async () => {
		await initializeMongoServer();
	});

	async function setup() {
		const docs = await createDocs();
		users = docs.users;
	}

	async function teardown() {
		await clearDocs();
		for (const token in tokens) {
			tokens.pop();
		}
	}

	async function mockGenerateRefreshToken(user) {
		const token = jwt.sign({ user }, process.env.REFRESH_TOKEN_SECRET, {
			expiresIn: '4s',
		});

		await Token.findOneAndUpdate(
			{ refresh_token: token },
			{ $setOnInsert: { refresh_token: token } },
			{ upsert: true },
		);

		return token;
	}

	describe('auth_login', () => {
		beforeAll(async () => {
			await setup();
		});

		afterAll(async () => {
			await teardown();
		});

		test('should accept the user credentials and return status code 200 and token', () => {
			return request(app)
				.post('/test/auth/login')
				.send({ username: 'boggs', password: 'password' })
				.expect(200)
				.expect(function (res) {
					debug(res.body);
					expect(res.body.token).toBeDefined();
				});
		});

		test('should reject unknown user login attempt', () => {
			return request(app)
				.post('/test/auth/login')
				.send({ username: 'shadyloginguy', password: 'password' })
				.expect(404);
		});

		test('should reject incorrect password login attempt', () => {
			return request(app)
				.post('/test/auth/login')
				.send({ username: 'boggs', password: 'passworf' })
				.expect(400);
		});
	});

	describe('auth_token', () => {
		beforeAll(async () => {
			await setup();
			tokens.push('=' + (await mockGenerateRefreshToken(users[0])));
		});

		afterAll(async () => {
			await teardown();
		});

		test('should return a new access token', () => {
			return request(app)
				.get('/test/auth/token')
				.set({ refreshtoken: tokens[0] })
				.expect(200)
				.expect(function (res) {
					debug(res.body);
					expect(res.body.token).toBeDefined();
				});
		});

		test('missing refresh token should fail', () => {
			return request(app).get('/test/auth/token').expect(400);
		});

		test('invalid refresh token should fail', () => {
			return request(app)
				.get('/test/auth/token')
				.set({ refreshtoken: 'invalid refresh token' })
				.expect(401);
		});

		jest.setTimeout(10000);
		test('expired refresh token should fail and token should be removed from database', async () => {
			const initialTokenCount = tokens.length;
			await new Promise((x) => setTimeout(x, 4000));

			return request(app)
				.get('/test/auth/token')
				.set({ refreshtoken: tokens[0] })
				.expect(401)
				.expect(async function (res) {
					const tokenCheck = await Token.find({});
					debug(tokenCheck);
					debug(initialTokenCount);
					expect(tokenCheck.length).toBeLessThan(initialTokenCount);
				});
		});
	});

	describe('auth_logout', () => {
		beforeAll(async () => {
			await setup();
			tokens.push('=' + (await mockGenerateRefreshToken(users[0])));
		});

		afterAll(async () => {
			await teardown();
		});

		test('should delete refresh token from DB', () => {
			const initialTokenCount = tokens.length;
			return request(app)
				.get('/test/auth/logout')
				.expect(200)
				.set({ refreshtoken: tokens[0] })
				.expect(async function (res) {
					const tokenCheck = await Token.find({});
					debug(tokenCheck);
					debug(initialTokenCount);
					expect(tokenCheck.length).toBeLessThan(initialTokenCount);
				});
		});
	});
});
