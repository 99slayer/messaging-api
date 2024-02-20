const asyncHandler = require('express-async-handler');
const Chat = require('../models/chat');
const { body, validationResult } = require('express-validator');

exports.message_list = asyncHandler(async (req, res, next) => {
	const chat = await Chat.findById(req.params.chatId);
	const list = chat.messages;
	res.json({ list });
});

exports.message_create = [
	body('text').trim().isLength({ min: 1, max: 900 }),

	asyncHandler(async (req, res, next) => {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			return res.sendStatus(400);
		}

		const message = {
			user: req.body.userId,
			timestamp: new Date(),
			text: req.body.text,
		};

		const updatedChat = await Chat.findOneAndUpdate(
			{ _id: req.params.chatId },
			{ $push: { messages: message } },
			{ new: true },
		);

		res.sendStatus(200);
	}),
];

exports.message_update = [
	body('text')
		.trim()
		.isLength({ min: 1, max: 900 })
		.custom(async (value, { req }) => {
			const chat = await Chat.findById(req.params.chatId).populate('messages');
			const message = chat.messages.id(req.params.messageId);

			if (value === message.text) {
				throw new Error('Duplicate text will not be saved.');
			}

			return true;
		}),

	asyncHandler(async (req, res, next) => {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			return res.sendStatus(400);
		}

		const updatedChat = await Chat.findOneAndUpdate(
			{ _id: req.params.chatId, 'messages._id': req.params.messageId },
			{ $set: { 'messages.$.text': req.body.text, 'messages.$.edited': true } },
			{ new: true },
		);

		res.sendStatus(200);
	}),
];

exports.message_delete = asyncHandler(async (req, res, next) => {
	const chat = await Chat.findOneAndUpdate(
		{ _id: req.params.chatId },
		{ $pull: { messages: { _id: req.params.messageId } } },
		{ new: true },
	);

	res.sendStatus(200);
});
