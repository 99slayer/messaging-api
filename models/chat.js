const mongoose = require('mongoose');
const MessageSchema = require('./message');
const Schema = mongoose.Schema;

const ChatSchema = new Schema({
	chat_name: { type: String, required: true },
	chat_owner: { type: Schema.Types.ObjectId, ref: 'User' },
	start_date: { type: Date },
	users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
	messages: [{ type: MessageSchema }],
	most_recent_update: { type: Date, default: null },
});

module.exports = mongoose.model('Chat', ChatSchema);
