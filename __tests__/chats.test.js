const app = require('../app');
const request = require('supertest');
const initializeMongoServer = require('../mongo-test-config');
const createDocs = require('../populate-db');
const clearDocs = require('../clear-db');
const debug = require('debug')('test:chats');

describe('chat routes/controller', () => {
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

	describe('chat_list', () => {
		beforeAll(async () => {
			await setup();
		});

		afterAll(async () => {
			await teardown();
		});

		test('status code should be 200', () => {
			return request(app).get('/test/chats').expect(200);
		});

		test('content type should be json', () => {
			return request(app)
				.get('/test/chats')
				.expect(200)
				.expect('Content-Type', /json/);
		});

		test('response body check', () => {
			return request(app)
				.get('/test/chats')
				.expect(200)
				.expect(function (res) {
					debug(res.body);
					expect(res.body.list).toBeDefined();
					expect(res.body.list.length).toBeGreaterThan(0);
				});
		});
	});

	describe('chat_detail', () => {
		beforeAll(async () => {
			await setup();
		});

		afterAll(async () => {
			await teardown();
		});

		test('status code should be 200', () => {
			return request(app).get(`/test/chats/${chats[0].id}`).expect(200);
		});

		test('content type should be json', () => {
			return request(app)
				.get(`/test/chats/${chats[0].id}`)
				.expect(200)
				.expect('Content-Type', /json/);
		});

		test('response body check', () => {
			return request(app)
				.get(`/test/chats/${chats[0].id}`)
				.expect(200)
				.expect(function (res) {
					debug(res.body);
					expect(res.body.chat).toBeDefined();
					expect(res.body.chat.start_date).toBeDefined();
					expect(res.body.chat.users).toBeDefined();
					expect(res.body.chat.messages).toBeDefined();
					expect(res.body.chat.messages[0].text).toEqual(
						chats[0].messages[0].text,
					);
					expect(res.body.chat.messages[1].text).toEqual(
						chats[0].messages[1].text,
					);
				});
		});
	});

	describe('chat_create', () => {
		beforeAll(async () => {
			await setup();
		});

		afterAll(async () => {
			await teardown();
		});

		test('new chat should be in database', () => {
			const initialChatCount = chats.length;

			return request(app)
				.post('/test/chats')
				.send({
					users: [users[0]._id, users[3]._id],
				})
				.expect(200)
				.then(() => {
					return request(app)
						.get('/test/chats')
						.expect(200)
						.expect(function (res) {
							expect(res.body.list.length).toBe(4);
							expect(res.body.list.length).toBeGreaterThan(initialChatCount);
						});
				});
		});

		test('users should store chat id', () => {
			return request(app)
				.get('/test/users')
				.expect(200)
				.expect(function (res) {
					expect(res.body.list[0].chats.length).toBe(2);
					expect(res.body.list[3].chats.length).toBe(2);
				});
		});
	});

	describe('chat_add_users', () => {
		beforeEach(async () => {
			await setup();
		});

		afterEach(async () => {
			await teardown();
		});

		test('should add one new user to chat document', () => {
			const initialUserCount = chats[0].users.length;

			return request(app)
				.put(`/test/chats/${chats[0]._id}`)
				.type('json')
				.send({ userIds: [users[2]._id], update: 'add' })
				.expect(200)
				.then(() => {
					return request(app)
						.get('/test/chats')
						.expect(200)
						.expect(function (res) {
							debug(initialUserCount);
							debug(res.body.list[0].users.length);
							expect(res.body.list[0].users.length).toBeGreaterThan(
								initialUserCount,
							);
						});
				});
		});

		test('should add one new chat to user document', () => {
			const initialChatCount = users[2].chats.length;

			return request(app)
				.put(`/test/chats/${chats[0]._id}`)
				.type('json')
				.send({ userIds: [users[2]._id], update: 'add' })
				.expect(200)
				.then(() => {
					return request(app)
						.get('/test/users')
						.expect(200)
						.expect(function (res) {
							debug(initialChatCount);
							debug(res.body.list[2].chats.length);
							expect(res.body.list[2].chats.length).toBeGreaterThan(
								initialChatCount,
							);
						});
				});
		});

		test('should add multiple new users to chat document', () => {
			const initialUserCount = chats[0].users.length;
			const initialChatCount1 = users[2].chats.length;
			const initialChatCount2 = users[3].chats.length;
			const initialChatCount3 = users[4].chats.length;

			return request(app)
				.put(`/test/chats/${chats[0]._id}`)
				.type('json')
				.send({
					userIds: [users[2]._id, users[3]._id, users[4]._id],
					update: 'add',
				})
				.expect(200)
				.then(() => {
					return request(app)
						.get('/test/chats')
						.expect(200)
						.expect(function (res) {
							debug(initialUserCount);
							debug(res.body.list[0].users.length);
							expect(res.body.list[0].users.length - initialUserCount).toBe(3);
						})
						.then(() => {
							return request(app)
								.get('/test/users')
								.expect(200)
								.expect(function (res) {
									debug([
										initialChatCount1,
										initialChatCount2,
										initialChatCount3,
									]);
									debug([
										res.body.list[2].chats.length,
										res.body.list[3].chats.length,
										res.body.list[4].chats.length,
									]);
									expect(res.body.list[2].chats.length).toBeGreaterThan(
										initialChatCount1,
									);
									expect(res.body.list[3].chats.length).toBeGreaterThan(
										initialChatCount2,
									);
									expect(res.body.list[4].chats.length).toBeGreaterThan(
										initialChatCount3,
									);
								});
						});
				});
		});
	});

	describe('chat_remove_user', () => {
		beforeEach(async () => {
			await setup();
		});

		afterEach(async () => {
			await teardown();
		});

		test('user should be removed from chat', () => {
			const initialUserCount = chats[0].users.length;

			return request(app)
				.put(`/test/chats/${chats[0]._id}`)
				.send({ userId: users[0]._id, update: 'remove' })
				.expect(200)
				.then(() => {
					return request(app)
						.get('/test/chats')
						.expect(200)
						.expect(function (res) {
							expect(res.body.list[0].users.length).toBeLessThan(
								initialUserCount,
							);
						});
				});
		});

		test('chat should be removed from user', () => {
			const initialChatCount = users[0].chats.length;

			return request(app)
				.put(`/test/chats/${chats[0]._id}`)
				.send({ userId: users[0]._id, update: 'remove' })
				.expect(200)
				.then(() => {
					return request(app)
						.get('/test/users')
						.expect(200)
						.expect(function (res) {
							debug(initialChatCount);
							debug(res.body.list[0].chats.length);
							expect(res.body.list[0].chats.length).toBeLessThan(
								initialChatCount,
							);
						});
				});
		});
	});

	describe('chat_delete', () => {
		beforeEach(async () => {
			await setup();
		});

		afterEach(async () => {
			await teardown();
		});

		test('status code should be 400', () => {
			return request(app).delete(`/test/chats/${chats[0]._id}`).expect(400);
		});

		test('should delete chat from database', () => {
			const initialCount = chats.length;
			return request(app)
				.put(`/test/chats/${chats[0]._id}`)
				.send({ userId: chats[0].users[0]._id, update: 'remove' })
				.expect(200)
				.then(() => {
					return request(app)
						.put(`/test/chats/${chats[0]._id}`)
						.send({ userId: chats[0].users[1]._id, update: 'remove' })
						.expect(200)
						.then(() => {
							return request(app)
								.delete(`/test/chats/${chats[0]._id}`)
								.expect(200)
								.then(() => {
									return request(app)
										.get('/test/chats')
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
	});
});
