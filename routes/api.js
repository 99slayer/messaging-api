const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const chatController = require('../controllers/chatController');
const messageController = require('../controllers/messageController');

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
router.put('/chats/:chatId', chatController.chat_update);
router.delete('/chat/:chatId', chatController.chat_delete);

// MESSAGE ROUTES
router.get('/:chatId/messages', messageController.message_list);
router.post('/:chatId/messages', messageController.message_create);
router.put('/:chatId/messages/:messageId', messageController.message_update);
router.delete('/:chatId/messages/:messageId', messageController.message_delete);

module.exports = router;
