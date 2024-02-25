const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const chatController = require('../controllers/chatController');
const messageController = require('../controllers/messageController');
const auth = require('../auth');

function updateSwitch(req, res, next) {
	if (req.body.update === 'remove') {
		return next('route');
	}

	return next();
}

// AUTH ROUTES
router.post('/auth/login', authController.auth_login);
router.get('/auth/logout', auth.deleteRefreshToken);
router.get('/auth/token', auth.refresh);
router.get('/auth/verify', auth.verify, (req, res, next) => {
	return res.status(200).send({ msg: 'verified' });
});

// USER ROUTES
router.get('/users', userController.user_list);
router.post('/users', userController.user_create);
router.get('/users/:userId', userController.user_detail);
router.put('/users/:userId', userController.user_update);
router.delete('/users/:userId', userController.user_delete);

// CHAT ROUTES
router.get('/chats', chatController.chat_list);
router.post('/chats', chatController.chat_create);
router.get('/chats/:chatId', chatController.chat_detail);
router.put('/chats/:chatId', updateSwitch, chatController.chat_add_users);
router.put('/chats/:chatId', chatController.chat_remove_user);
router.delete('/chats/:chatId', chatController.chat_delete);

// MESSAGE ROUTES
router.get('/:chatId/messages', messageController.message_list);
router.post('/:chatId/messages', messageController.message_create);
router.put('/:chatId/messages/:messageId', messageController.message_update);
router.delete('/:chatId/messages/:messageId', messageController.message_delete);

module.exports = router;
