const mongoose = require('mongoose');
const { DateTime } = require('luxon');
const Schema = mongoose.Schema;

const MessageSchema = new Schema(
	{
		user: { type: Schema.Types.ObjectId, ref: 'User' },
		timestamp: { type: Date, required: true },
		text: { type: String, required: true },
		edited: { type: Boolean, default: false },
	},
	{ toJSON: { virtuals: true } },
);

MessageSchema.virtual('timestamp_formatted').get(function () {
	const dt = DateTime.fromJSDate(this.timestamp);
	return (
		dt.toLocaleString(DateTime.DATE_SHORT) +
		' ' +
		dt.toLocaleString(DateTime.TIME_WITH_SECONDS)
	);
});

module.exports = MessageSchema;
