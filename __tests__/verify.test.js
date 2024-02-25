const app = require('../app');
const request = require('supertest');
const initializeMongoServer = require('../mongo-test-config');
const createDocs = require('../populate-db');
const clearDocs = require('../clear-db');
const auth = require('../auth');
require('dotenv').config();
const jwt = require('jsonwebtoken');

describe('verify middleware', () => {
	let users;

	beforeAll(async () => {
		await initializeMongoServer();
	});

	async function setup() {
		const docs = await createDocs();
		users = docs.users;
	}

	async function teardown() {
		await clearDocs();
	}

	beforeEach(async () => {
		await setup();
	});

	afterEach(async () => {
		await teardown();
	});

	function mockGenerateToken(user) {
		return jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, {
			expiresIn: '4s',
		});
	}

	test('valid should pass verification check', () => {
		return request(app)
			.get('/test/auth/verify')
			.set({ authorization: 'BEARER' + ' ' + auth.generateToken(users[0]) })
			.expect(200)
			.expect(function (res) {
				expect(res.body.msg).toBe('verified');
			});
	});

	test('missing token should fail verification check', () => {
		return request(app).get('/test/auth/verify').expect(400);
	});

	test('invalid token should fail verification check', () => {
		return request(app)
			.get('/test/auth/verify')
			.set({ authorization: 'bowl of fruit' })
			.expect(401);
	});

	jest.setTimeout(10000);
	test('expired token should fail verification check', async () => {
		const token = 'BEARER' + ' ' + mockGenerateToken(users[0]);
		await new Promise((x) => setTimeout(x, 4000));

		return request(app)
			.get('/test/auth/verify')
			.set({ authorization: token })
			.expect(401);
	});
});
