const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MessageSchema = new Schema({});

module.exports = mongoose.model('Message', MessageSchema);
