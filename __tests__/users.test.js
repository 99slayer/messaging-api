const app = require('../app');
const request = require('supertest');
const initializeMongoServer = require('../mongo-test-config');
const createDocs = require('../populate-db');
const clearDocs = require('../clear-db');
const debug = require('debug')('test:users');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Chat = require('../models/chat');

const testUser1 = {
	username: 'NinjaGuy49',
	password: 'p4ssword!',
	'password-confirm': 'p4ssword!',
	email: 'ninjaattack@fakemail.com',
	nickname: 'secret_blade',
	join_date: new Date(),
};

describe('user routes/controllers', () => {
	let users;
	let chats;

	beforeAll(async () => {
		await initializeMongoServer();
	});

	async function setup() {
		const docs = await createDocs();
		users = docs.users;
		chats = docs.chats;
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

		test('response body removed', () => {
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

		test('response body removed', () => {
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
						.expect(async function (res) {
							const user = res.body.list[0];
							expect(user.username).toEqual(testUser1.username);
							expect(user.email).toEqual(testUser1.email);
							expect(
								await bcrypt.compare(testUser1.password, user.password),
							).toBe(true);
							expect(await bcrypt.compare('banana', user.password)).not.toBe(
								true,
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

		test('should change user password', () => {
			const initialPassword = users[0].password;

			return request(app)
				.put(`/test/users/${users[0]._id}`)
				.send({
					password: 'newpassword1*',
					'password-confirm': 'newpassword1*',
				})
				.expect(200)
				.then(() => {
					return request(app)
						.get('/test/users')
						.expect(200)
						.expect(async function (res) {
							expect(res.body.list[0].password).not.toBe(initialPassword);
							expect(
								await bcrypt.compare(
									'newpassword1*',
									res.body.list[0].password,
								),
							).toBe(true);
							expect(
								await bcrypt.compare(
									'newpppassword',
									res.body.list[0].password,
								),
							).not.toBe(true);
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
							debug(
								`user ${res.body.list.length < initialCount ? 'has' : 'has not'} been removed from database.`,
							);
							debug(
								`initial count: ${initialCount} / current count: ${res.body.list.length}`,
							);
							expect(res.body.list.length).toBeLessThan(initialCount);
						});
				});
		});

		test('should remove users from the chats they were in', () => {
			let user = users[0];
			const initialChatCount = user.chats.length;

			return request(app)
				.put(`/test/chats/${chats[2]._id}`)
				.send({ update: 'add', userIds: [user._id] })
				.expect(200)
				.expect(async function (res) {
					user = await User.findById(user._id);
					expect(user.chats.length).toBeGreaterThan(initialChatCount);
				})
				.then(() => {
					return request(app)
						.delete(`/test/users/${user._id}`)
						.expect(200)
						.then(() => {
							return request(app)
								.get('/test/chats')
								.expect(200)
								.expect(async function (res) {
									let usersRemoved = true;

									async function checkChat(chatId) {
										const chat = await Chat.findById(chatId);
										const removed = !chat.users.includes(user._id);
										debug(
											`user id: <${user._id}> ${removed ? 'has' : 'has not'} been removed from chat user field: ${chat.users}`,
										);
										return removed;
									}

									for (let i = 0; i < user.chats.length; i++) {
										const removed = await checkChat(user.chats[i]);

										if (!removed) {
											usersRemoved = false;
											break;
										}
									}

									expect(usersRemoved).toBe(true);
								});
						});
				});
		});
	});
});
