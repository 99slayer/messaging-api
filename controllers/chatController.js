const asyncHandler = require('express-async-handler');
const Chat = require('../models/chat');
const User = require('../models/user');

exports.chat_list = asyncHandler(async (req, res, next) => {
	const list = await Chat.find({});
	res.json({ list });
});

exports.chat_detail = asyncHandler(async (req, res, next) => {
	const chat = await Chat.findById(req.params.chatId);
	res.json({ chat });
});

// request body should include an array of user ids
exports.chat_create = asyncHandler(async (req, res, next) => {
	const chat = new Chat({
		start_date: new Date(),
		users: [...req.body.users],
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

	req.body.users.forEach((id) => {
		addChat(id);
	});

	res.sendStatus(200);
});

exports.chat_add_users = asyncHandler(async (req, res, next) => {
	const chat = await Chat.findById(req.params.chatId);

	async function addChat(userId) {
		const updatedUser = await User.findOneAndUpdate(
			{ _id: userId },
			{ $push: { chats: chat._id } },
			{ new: true },
		);
	}

	// add chat to user docs
	req.body.userIds.forEach((id) => {
		addChat(id);
	});

	// add users to chat doc
	const updatedChat = await Chat.findOneAndUpdate(
		{ _id: req.params.chatId },
		{ $push: { users: { $each: [...req.body.userIds] } } },
		{ new: true },
	);

	res.sendStatus(200);
});

exports.chat_remove_user = asyncHandler(async (req, res, next) => {
	const user = await User.findOneAndUpdate(
		{ _id: req.body.userId },
		{ $pull: { chats: req.params.chatId } },
		{ new: true },
	);

	const chat = await Chat.findOneAndUpdate(
		{ _id: req.params.chatId },
		{ $pull: { users: req.body.userId } },
		{ new: true },
	);

	res.sendStatus(200);
});

exports.chat_delete = asyncHandler(async (req, res, next) => {
	const chat = await Chat.findById(req.params.chatId);

	if (chat.users.length !== 0) {
		return res.status(400).send('There are still users in chat document.');
	}

	const deletedChat = await Chat.findByIdAndDelete(req.params.chatId);

	res.sendStatus(200);
});
