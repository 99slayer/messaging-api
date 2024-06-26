const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TokenSchema = new Schema({
	refresh_token: { type: String, required: true },
});

module.exports = mongoose.model('Token', TokenSchema);
