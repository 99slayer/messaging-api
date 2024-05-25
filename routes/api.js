const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const accountController = require('../controllers/accountController');
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
router.get('/auth/verify', auth.verify, (req, res, next) => {
	return res.status(200).send('verified');
});
router.get('/auth/token', auth.refresh);
router.post(
	'/auth/storagecheck',
	auth.verify,
	authController.auth_storage_check,
);

// ACCOUNT ROUTES
router.get(
	'/users/:username/account',
	auth.verify,
	accountController.account_detail,
);
router.put(
	'/users/:username/account',
	auth.verify,
	accountController.account_update,
);
router.put(
	'/users/:username/account/:chatId',
	auth.verify,
	accountController.account_change_chat,
);

// USER ROUTES
router.get('/users', auth.verify, userController.user_list);
router.post('/users', userController.user_create);
router.get('/users/:username', auth.verify, userController.user_detail);

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
router.get('/chats/:chatId-:ownerId/check', auth.verify, (req, res, next) => {
	// Checks if user owns chat.
	if (!req.params.chatId || !req.params.ownerId) next();

	if (req.params.ownerId.toString() === res.locals.user.id) {
		return res.status(200).send({ owner: true });
	} else {
		return res.status(403).send({ owner: false });
	}
});

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
