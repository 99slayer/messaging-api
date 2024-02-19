const mongoose = require('mongoose');
const { DateTime } = require('luxon');
const Schema = mongoose.Schema;

const UserSchema = new Schema(
	{
		username: { type: String, required: true },
		password: { type: String, required: true },
		email: { type: String, required: true },
		nickname: { type: String, required: false },
		profile_picture: { type: Buffer, required: false },
		profile_text: { type: String, required: false },
		join_date: { type: Date, required: true },
		chats: [{ type: Schema.Types.ObjectId, ref: 'Chat' }],
	},
	{ toJSON: { virtuals: true } },
);

UserSchema.virtual('join_date_formatted').get(function () {
	const dt = DateTime.fromJSDate(this.join_date);
	return dt.toLocaleString(DateTime.DATE_SHORT);
});

module.exports = mongoose.model('User', UserSchema);
