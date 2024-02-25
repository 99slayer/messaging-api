const app = require('../app');
const request = require('supertest');
const initializeMongoServer = require('../mongo-test-config');
const createDocs = require('../populate-db');
const clearDocs = require('../clear-db');
const debug = require('debug')('test');

describe('message routes/controllers', () => {
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

	describe('message_list', () => {
		beforeEach(async () => {
			await setup();
		});

		afterEach(async () => {
			await teardown();
		});

		test('status code should be 200', () => {
			return request(app).get(`/test/${chats[0]._id}/messages`).expect(200);
		});

		test('content type should be json', () => {
			return request(app)
				.get(`/test/${chats[0]._id}/messages`)
				.expect(200)
				.expect('Content-Type', /json/);
		});

		test('response body check', () => {
			return request(app)
				.get(`/test/${chats[0]._id}/messages`)
				.expect(200)
				.expect(function (res) {
					expect(res.body.list).toBeDefined();
					expect(res.body.list.length).toBe(4);
				});
		});
	});

	describe('message_create', () => {
		beforeEach(async () => {
			await setup();
		});

		afterEach(async () => {
			await teardown();
		});

		test('new message should be stored in chat document', () => {
			const initialMessageCount = chats[0].messages.length;
			return request(app)
				.post(`/test/${chats[0]._id}/messages`)
				.type('json')
				.send({ userId: users[0]._id, text: 'message text' })
				.expect(200)
				.then(() => {
					return request(app)
						.get(`/test/${chats[0]._id}/messages`)
						.expect(200)
						.expect(async function (res) {
							debug(initialMessageCount);
							debug(res.body.list.length);
							expect(res.body.list.length).toBeGreaterThan(initialMessageCount);
							expect(res.body.list[res.body.list.length - 1].text).toBe(
								'message text',
							);
						});
				});
		});

		test('chats most_recent_update field should be updated', async () => {
			const initialDate = chats[0].most_recent_update;
			await new Promise((x) => setTimeout(x, 2000));

			return request(app)
				.post(`/test/${chats[0]._id}/messages`)
				.type('json')
				.send({ userId: users[0]._id, text: 'message text' })
				.expect(200)
				.then(() => {
					return request(app)
						.get('/test/chats')
						.expect(200)
						.expect(function (res) {
							const initialMS = initialDate.getTime();
							const newDate = new Date(res.body.list[0].most_recent_update);
							const newMS = newDate.getTime();
							debug(`Difference in milliseconds: ${newMS - initialMS}`);
							expect(newMS).toBeGreaterThan(initialMS);
						});
				});
		});

		test('exceeding character limit should return status code 400', () => {
			return request(app)
				.post(`/test/${chats[0]._id}/messages`)
				.type('json')
				.send({
					userId: users[0]._id,
					text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris blandit pretium nisl, vel molestie magna molestie sit amet. Sed condimentum, nunc a vestibulum dictum, nisl urna eleifend turpis, nec vulputate nibh nulla vel augue. Donec venenatis stesten vel ullamcorper convallis. Pellentesque hendrerit mi tellus, at auctor velit placerat eu. Sed a rutrum odio, mattis tempor orci. Morbi leo nisl, sagittis in commodo ac, maximus in erat. Proin vehicula purus facilisis fermentum aliquet. Praesent lorem orci, efficitur ac nulla et, fringilla tincidunt odio. Donec eu scelerisque lorem, vel tempus magna. Mauris purus neque, rutrum nec accumsan ut, vehicula eget augue. Nulla ac nisl vehicula, semper odio id, hendrerit eros. Proin volutpat justo porta lorem porta bibendum. Donec blandit urna consequat orci tristique maximus in in orci. Nam dignissim magna nulla, ut semper purus semper eu. Duis ut. Nam dignissim magna nulla, ut semper purus semper eu. Duis ut.',
				})
				.expect(400);
		});
	});

	describe('message_update', () => {
		beforeEach(async () => {
			await setup();
		});

		afterEach(async () => {
			await teardown();
		});

		test('should update message text and set edited field to true', () => {
			return request(app)
				.put(`/test/${chats[0]._id}/messages/${chats[0].messages[0]._id}`)
				.type('json')
				.send({ text: 'updated text' })
				.expect(200)
				.then(() => {
					return request(app)
						.get(`/test/${chats[0]._id}/messages`)
						.expect(200)
						.expect(function (res) {
							debug(res.body.list[0]);
							expect(res.body.list[0].text).toBe('updated text');
							expect(res.body.list[0].edited).toBe(true);
						});
				});
		});

		test('updating text with an empty string should return status code 400', () => {
			return request(app)
				.put(`/test/${chats[0]._id}/messages/${chats[0].messages[0]._id}`)
				.type('json')
				.send({ text: '' })
				.expect(400)
				.then(() => {
					return request(app)
						.get(`/test/${chats[0]._id}/messages`)
						.expect(200)
						.expect(function (res) {
							debug(res.body.list[0]);
							expect(res.body.list[0].text).toBe('Hi.');
							expect(res.body.list[0].edited).toBe(false);
						});
				});
		});

		// tests duplicate text input
		test('updating text with duplicate text should return status code 400', () => {
			return request(app)
				.put(`/test/${chats[0]._id}/messages/${chats[0].messages[0]._id}`)
				.type('json')
				.send({ text: 'Hi.' })
				.expect(400)
				.then(() => {
					return request(app)
						.get(`/test/${chats[0]._id}/messages`)
						.expect(200)
						.expect(function (res) {
							debug(res.body.list[0]);
							expect(res.body.list[0].text).toBe('Hi.');
							expect(res.body.list[0].edited).toBe(false);
						});
				});
		});
	});

	describe('message_delete', () => {
		beforeEach(async () => {
			await setup();
		});

		afterEach(async () => {
			await teardown();
		});

		test('should delete message from chat', () => {
			const initialCount = chats[0].messages.length;

			return request(app)
				.delete(`/test/${chats[0]._id}/messages/${chats[0].messages[0]._id}`)
				.expect(200)
				.then(() => {
					return request(app)
						.get(`/test/${chats[0]._id}/messages`)
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
