const mongoose = require('mongoose');
const { DateTime } = require('luxon');
const Schema = mongoose.Schema;

const UserSchema = new Schema(
	{
		username: { type: String, required: true },
		password: { type: String, required: true },
		email: { type: String, required: true },
		nickname: { type: String, required: false },
		profile_picture: { type: Buffer, default: null },
		profile_text: { type: String, default: null },
		join_date: { type: Date, required: true },
		chats: [{ type: Schema.Types.ObjectId, ref: 'Chat' }],
		current_chat: { type: Schema.Types.ObjectId, ref: 'Chat', default: null },
		settings: { type: Map, of: String },
	},
	{ toJSON: { virtuals: true } },
);

UserSchema.virtual('join_date_formatted').get(function () {
	const dt = DateTime.fromJSDate(this.join_date);
	return dt.toLocaleString(DateTime.DATE_SHORT);
});

UserSchema.virtual('pfp_converted').get(function () {
	if (this.profile_picture === null) {
		return null;
	} else {
		return `data:image/jpeg;base64,${this.profile_picture.toString('base64')}`;
	}
});

module.exports = mongoose.model('User', UserSchema);
