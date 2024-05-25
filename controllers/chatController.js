const asyncHandler = require('express-async-handler');
const Chat = require('../models/chat');
const User = require('../models/user');

// Returns a list of the users chatrooms.
exports.chat_list = asyncHandler(async (req, res, next) => {
	const chats = [];
	const user = await User.findById(res.locals.user.id, 'chats');

	if (user.chats.length === 0) return res.sendStatus(400);

	for (const id of user.chats) {
		const chat = await Chat.findById(id, 'chat_name chat_owner users');
		chats.push(chat);
	}

	res.json({ chats });
});

exports.chat_detail = asyncHandler(async (req, res, next) => {
	if (req.params.chatId === null) return res.sendStatus(400);

	const chat = await Chat.findById(
		req.params.chatId,
		'-most_recent_update -start_date',
	).populate({
		path: 'users',
		select: 'username nickname profile_picture chats',
	});

	res.json({ chat });
});

// Request body should include an array of usernames
exports.chat_create = asyncHandler(async (req, res, next) => {
	const userIds = [];
	const usernames = req.body['user-list'].split(',');

	async function grabId(username) {
		const user = await User.find({ username }, '_id');
		return user[0]._id;
	}

	for (const username of usernames) {
		const id = await grabId(username);
		userIds.push(id);
	}

	// create and save chat
	const chat = new Chat({
		chat_name: req.body['chat-name'],
		chat_owner: res.locals.user.id,
		start_date: new Date(),
		users: [...userIds],
		messages: [],
		most_recent_update: new Date(),
	});

	await chat.save();

	async function addChat(userId) {
		await User.findOneAndUpdate(
			{ _id: userId },
			{ $push: { chats: chat } },
			{ new: true },
		);
	}

	// add chat to user docs
	for (const userId of userIds) {
		await addChat(userId);
	}

	res.status(200).send({ chatId: chat._id });
});

exports.chat_add_users = asyncHandler(async (req, res, next) => {
	const chat = await Chat.findById(req.params.chatId);

	if (chat.chat_owner.toString() !== res.locals.user.id) return;

	const usernames = req.body['user-list'].split(',');
	const ids = [...chat.users];

	async function addChat(username) {
		const user = await User.find({ username }, '_id');
		const userId = user[0]._id;

		if (chat.users.includes(userId)) return;

		await User.findOneAndUpdate(
			{ _id: userId },
			{ $addToSet: { chats: chat._id } },
			{ new: true },
		);

		ids.push(userId);
	}

	// add chat to user docs
	for (const username of usernames) {
		await addChat(username);
	}

	// add users to chat doc
	await Chat.findOneAndUpdate(
		{ _id: req.params.chatId },
		{ users: ids, chat_name: req.body['chat-name'] },
		{ new: true },
	);

	res.sendStatus(200);
});

exports.chat_remove_user = asyncHandler(async (req, res, next) => {
	const chat = await Chat.findById(req.params.chatId);

	if (
		chat.chat_owner.toString() !== res.locals.user.id &&
		req.body.username !== res.locals.user.username
	)
		return;

	const user = await User.find({ username: req.body.username }, '_id');
	const userId = user[0]._id;

	if (chat.chat_owner.toString() === userId.toString()) return;

	await User.findOneAndUpdate(
		{ _id: userId },
		{ $pull: { chats: req.params.chatId } },
		{ new: true },
	);

	await Chat.findOneAndUpdate(
		{ _id: req.params.chatId },
		{ $pull: { users: userId } },
		{ new: true },
	);

	res.sendStatus(200);
});

exports.chat_delete = asyncHandler(async (req, res, next) => {
	const chat = await Chat.findById(req.params.chatId);
	const userList = chat.users;

	if (res.locals.user.id !== chat.chat_owner.toString()) {
		return res.sendStatus(403);
	}

	async function removeChat(user) {
		await User.findOneAndUpdate(
			{ _id: user._id },
			{ $pull: { chats: req.params.chatId } },
			{ new: true },
		);
	}

	for (const user of userList) {
		removeChat(user);
	}

	await Chat.findByIdAndDelete(req.params.chatId);

	res.sendStatus(200);
});
