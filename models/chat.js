const mongoose = require('mongoose');
const MessageSchema = require('./message');
const Schema = mongoose.Schema;

const ChatSchema = new Schema({
	start_date: { type: Date },
	users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
	messages: [{ type: MessageSchema }],
});

module.exports = mongoose.model('Chat', ChatSchema);
