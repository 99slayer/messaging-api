const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const chatController = require('../controllers/chatController');
const messageController = require('../controllers/messageController');
const auth = require('../auth');

function updateSwitch(req, res, next) {
	if (!req.body.update) {
		throw new Error('Body missing field.');
	}

	if (req.body.update === 'remove') {
		return next('route');
	}

	return next();
}

// AUTH ROUTES
router.post('/auth/login', authController.auth_login);
router.get('/auth/logout', auth.deleteRefreshToken);
router.get('/auth/token', auth.refresh);

// USER ROUTES
router.get('/users', auth.verify, userController.user_list);
router.post('/users', userController.user_create);
router.get('/users/:userId', auth.verify, userController.user_detail);
router.put('/users/:userId', auth.verify, userController.user_update);
router.delete('/users/:userId', auth.verify, userController.user_delete);

// CHAT ROUTES
router.get('/chats', auth.verify, chatController.chat_list);
router.post('/chats', auth.verify, chatController.chat_create);
router.get('/chats/:chatId', auth.verify, chatController.chat_detail);
router.put(
	'/chats/:chatId',
	auth.verify,
	updateSwitch,
	chatController.chat_add_users,
);
router.put('/chats/:chatId', auth.verify, chatController.chat_remove_user);
router.delete('/chats/:chatId', auth.verify, chatController.chat_delete);

// MESSAGE ROUTES
router.get('/:chatId/messages', auth.verify, messageController.message_list);
router.post(
	'/chats/:chatId/messages',
	auth.verify,
	messageController.message_create,
);
router.put(
	'/:chatId/messages/:messageId',
	auth.verify,
	messageController.message_update,
);
router.delete(
	'/:chatId/messages/:messageId',
	auth.verify,
	messageController.message_delete,
);

module.exports = router;
