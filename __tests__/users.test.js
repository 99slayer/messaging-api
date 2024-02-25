const app = require('../app');
const request = require('supertest');
const initializeMongoServer = require('../mongo-test-config');
const createDocs = require('../populate-db');
const clearDocs = require('../clear-db');
const debug = require('debug')('test');

const testUser1 = {
	username: 'NinjaGuy49',
	password: 'password',
	'password-confirm': 'password',
	email: 'ninjaattack@fakemail.com',
	nickname: 'secret_blade',
	profile_picture: null,
	profile_text: 'You wont see me coming...',
	join_date: new Date(),
	chats: null,
};

describe('user routes/controllers', () => {
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

	describe('user_list', () => {
		beforeAll(async () => {
			await setup();
		});

		afterAll(async () => {
			await teardown();
		});

		test('status code should be 200', () => {
			return request(app).get('/test/users').expect(200);
		});

		test('content type should be json', () => {
			return request(app).get('/test/users').expect('Content-Type', /json/);
		});

		test('response body check', () => {
			return request(app)
				.get('/test/users')
				.then((res) => {
					expect(res.body.list).toBeDefined();
					expect(res.body.list.length).toBeGreaterThan(0);
					expect(res.body.list[0].username).toBeDefined();
				});
		});
	});

	describe('user_detail', () => {
		beforeAll(async () => {
			await setup();
		});

		afterAll(async () => {
			await teardown();
		});

		test('status code should be 200', () => {
			return request(app).get(`/test/users/${users[0]._id}`).expect(200);
		});

		test('content type should be json', () => {
			return request(app)
				.get(`/test/users/${users[0]._id}`)
				.expect('Content-Type', /json/)
				.expect(200);
		});

		test('response body check', () => {
			return request(app)
				.get(`/test/users/${users[0]._id}`)
				.then((res) => {
					debug(res.body);
					expect(res.body.user).toBeDefined();
					expect(res.body.user.username).toBeDefined();
					expect(res.body.user.password).toBeDefined();
					expect(res.body.user.email).toBeDefined();
				});
		});
	});

	describe('user_create', () => {
		afterAll(async () => {
			testUser1['password-confirm'] = 'password';
			await teardown();
		});

		test('new document should be in database', () => {
			return request(app)
				.post('/test/users')
				.type('form')
				.send(testUser1)
				.expect(200)
				.then(() => {
					return request(app)
						.get('/test/users')
						.expect(200)
						.expect(function (res) {
							expect(res.body.list[0].username).toEqual('NinjaGuy49');
							expect(res.body.list[0].password).toEqual('password');
							expect(res.body.list[0].email).toEqual(
								'ninjaattack@fakemail.com',
							);
						});
				});
		});

		test('should return an error if username already exists', () => {
			return request(app)
				.post('/test/users')
				.type('form')
				.send(testUser1)
				.expect(400)
				.then(() => {
					return request(app)
						.get('/test/users')
						.expect(200)
						.expect(function (res) {
							expect(res.body.list.length === 1).toBe(true);
						});
				});
		});

		test('should return an error if passwords dont match', () => {
			testUser1['password-confirm'] = 'paassword';
			return request(app)
				.post('/test/users')
				.type('form')
				.send(testUser1)
				.expect(400)
				.then(() => {
					return request(app)
						.get('/test/users')
						.expect(200)
						.expect(function (res) {
							expect(res.body.list.length === 1).toBe(true);
						});
				});
		});
	});

	describe('user_update', () => {
		beforeEach(async () => {
			await setup();
		});

		afterEach(async () => {
			await teardown();
		});

		test('should change nickname', () => {
			return request(app)
				.put(`/test/users/${users[0]._id}`)
				.type('form')
				.send({ nickname: 'super_secret_blade' })
				.expect(200)
				.then(() => {
					return request(app)
						.get('/test/users')
						.expect(200)
						.expect(function (res) {
							expect(res.body.list[0].nickname).toEqual('super_secret_blade');
						});
				});
		});

		test('should change email and nickname', () => {
			return request(app)
				.put(`/test/users/${users[0]._id}`)
				.type('form')
				.send({
					email: 'newemail@fakemail.com',
					nickname: 'super_secret_blade',
				})
				.expect(200)
				.then(() => {
					return request(app)
						.get('/test/users')
						.expect(200)
						.expect(function (res) {
							expect(res.body.list[0].email).toEqual('newemail@fakemail.com');
							expect(res.body.list[0].nickname).toEqual('super_secret_blade');
						});
				});
		});

		test('should return an error if username already exists', () => {
			return request(app)
				.put(`/test/users/${users[0]._id}`)
				.type('form')
				.send({ username: 'Hal' })
				.expect(400)
				.expect(function (res) {
					debug(res.body);
					expect(res.body.includes('That username already exists.')).toBe(true);
				});
		});

		test('should return an error if passwords dont match', () => {
			return request(app)
				.put(`/test/users/${users[0]._id}`)
				.type('form')
				.send({ password: 'newpassword', 'password-confirm': 'newppassword' })
				.expect(400)
				.expect(function (res) {
					debug(res.body);
					expect(res.body.includes('Passwords must match.')).toBe(true);
				});
		});
	});

	describe('user_delete', () => {
		beforeEach(async () => {
			await setup();
		});

		afterEach(async () => {
			await teardown();
		});

		test('should delete user from database', () => {
			const initialCount = users.length;

			return request(app)
				.delete(`/test/users/${users[0]._id}`)
				.expect(200)
				.then(() => {
					return request(app)
						.get('/test/users')
						.expect(200)
						.expect(function (res) {
							debug(initialCount);
							debug(res.body.list.length);
							expect(res.body.list.length).toBeLessThan(initialCount);
						});
				});
		});
	});
});
