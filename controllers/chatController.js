const asyncHandler = require('express-async-handler');
const Chat = require('../models/chat');
const User = require('../models/user');

exports.chat_list = asyncHandler(async (req, res, next) => {
	const chats = [];
	const user = await User.findById(res.locals.user._id, 'chats');

	for (const id of user.chats) {
		const chat = await Chat.findById(id, 'chat_name chat_owner users');
		chats.push(chat);
	}

	res.json({ chats });
});

exports.chat_detail = asyncHandler(async (req, res, next) => {
	const chat = await Chat.findById(
		req.params.chatId,
		'-most_recent_update -start_date',
	).populate({
		path: 'users',
		select: 'username nickname profile_picture chats',
	});

	res.json({ chat });
});

// Request body should include an array of user ids.
exports.chat_create = asyncHandler(async (req, res, next) => {
	const userIds = req.body['user-list'].split(',');

	const chat = new Chat({
		chat_name: req.body['chat-name'],
		chat_owner: res.locals.user._id,
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

	userIds.forEach((id) => {
		addChat(id);
	});

	res.status(200).send({ chatId: chat._id });
});

exports.chat_add_users = asyncHandler(async (req, res, next) => {
	const chat = await Chat.findById(req.params.chatId);
	const userIds = req.body['user-list'].split(',');

	async function addChat(userId) {
		if (chat.users.includes(userId)) return;

		const updatedUser = await User.findOneAndUpdate(
			{ _id: userId },
			{ $push: { chats: chat._id } },
			{ new: true },
		);
	}

	// add chat to user docs
	userIds.forEach((id) => {
		addChat(id);
	});

	// add users to chat doc
	const updatedChat = await Chat.findOneAndUpdate(
		{ _id: req.params.chatId },
		{ users: userIds, chat_name: req.body['chat-name'] },
		{ new: true },
	);

	res.sendStatus(200);
});

exports.chat_remove_user = asyncHandler(async (req, res, next) => {
	const chat = await Chat.findById(req.params.chatId);

	if (chat.chat_owner === req.body.userId) return;

	await User.findOneAndUpdate(
		{ _id: req.body.userId },
		{ $pull: { chats: req.params.chatId } },
		{ new: true },
	);

	await Chat.findOneAndUpdate(
		{ _id: req.params.chatId },
		{ $pull: { users: req.body.userId } },
		{ new: true },
	);

	res.sendStatus(200);
});

exports.chat_delete = asyncHandler(async (req, res, next) => {
	const chat = await Chat.findById(req.params.chatId);
	const userList = chat.users;

	if (res.locals.user._id !== chat.chat_owner.toString()) {
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
