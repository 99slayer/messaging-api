const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const Chat = require('../models/chat');

const storage = multer.memoryStorage();
const MB = 1048576;
const upload = multer({
	storage,
	limits: { fileSize: MB * 2 },
});

exports.message_list = asyncHandler(async (req, res, next) => {
	const chat = await Chat.findById(req.params.chatId).populate({
		path: 'messages',
		populate: [{ path: 'user' }],
	});
	const list = chat.messages;
	res.json({ list });
});

exports.message_create = [
	upload.single('file'),

	asyncHandler(async (req, res, next) => {
		const input = JSON.parse(req.body.json);
		req.body = input;
		next();
	}),

	body('image')
		.if((value, { req }) => {
			return req.file;
		})
		.custom((value, { req }) => {
			if (!req.file) return true;

			const types = ['image/png', 'image/jpeg', 'image/jpg'];
			const extensions = ['png', 'jpeg', 'jpg'];
			const getExtension = (fileName) => {
				return fileName.slice(((fileName.lastIndexOf('.') - 1) >>> 0) + 2);
			};

			if (!extensions.includes(getExtension(req.file.originalname))) {
				throw Error(
					`file ${req.file.originalname} has an invalid file extension.`,
				);
			}

			if (!types.includes(req.file.mimetype)) {
				throw Error(`file ${req.file.originalname} has an invalid mimetype.`);
			}

			if (req.file.size > MB * 2) {
				throw Error(`file ${req.file.originalname} is too big.`);
			}

			return true;
		}),
	body('text')
		.trim()
		.isLength({ max: 2000 })
		.withMessage('Message exceeds character limit.'),

	asyncHandler(async (req, res, next) => {
		if (!req.file && !req.body.text) {
			return;
		}

		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			const messages = errors.array().map((err) => err.msg);
			return res.status(400).send(messages);
		}

		const message = {
			user: res.locals.user.id,
			timestamp: new Date(),
			text: req.body.text ? req.body.text : null,
			image: req.file
				? `data:image/jpeg;base64,${req.file.buffer.toString('base64')}`
				: null,
		};

		const updatedChat = await Chat.findOneAndUpdate(
			{ _id: req.params.chatId },
			{
				$push: { messages: message },
				$set: { most_recent_update: new Date() },
			},
			{ new: true },
		);

		res.sendStatus(200);
	}),
];

exports.message_update = [
	asyncHandler(async (req, res, next) => {
		// Only allows message owners to edit them.
		const chat = await Chat.findById(req.params.chatId);
		const message = chat.messages.id(req.params.messageId);

		if (message.user.toString() !== res.locals.user.id) return;

		next();
	}),

	body('text')
		.trim()
		.notEmpty()
		.withMessage('Messages cannot be empty.')
		.isLength({ max: 900 })
		.withMessage('Message exceeds character limit.')
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

		if (
			errors
				.array()
				.map((error) => error.msg)
				.includes('Duplicate text will not be saved.')
		) {
			return res.sendStatus(200);
		}

		if (!errors.isEmpty()) {
			const messages = errors.array().map((err) => err.msg);
			return res.status(400).send(messages);
		}

		const updatedChat = await Chat.findOneAndUpdate(
			{ _id: req.params.chatId, 'messages._id': req.params.messageId },
			{ $set: { 'messages.$.text': req.body.text, 'messages.$.edited': true } },
			{ new: true },
		);

		res.sendStatus(200);
	}),
];

exports.message_delete = [
	asyncHandler(async (req, res, next) => {
		// Only allows message owners to delete them.
		const chat = await Chat.findById(req.params.chatId);
		const message = chat.messages.id(req.params.messageId);

		if (message.user.toString() !== res.locals.user.id) return;

		next();
	}),

	asyncHandler(async (req, res, next) => {
		const chat = await Chat.findOneAndUpdate(
			{ _id: req.params.chatId },
			{ $pull: { messages: { _id: req.params.messageId } } },
			{ new: true },
		);

		res.sendStatus(200);
	}),
];
