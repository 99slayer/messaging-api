const mongoose = require('mongoose');
const { DateTime } = require('luxon');
const Schema = mongoose.Schema;

const MessageSchema = new Schema(
	{
		user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		timestamp: { type: Date, required: true },
		text: { type: String, required: false },
		edited: { type: Boolean, default: false },
		image: { type: Buffer, default: null },
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

MessageSchema.virtual('image_converted').get(function () {
	if (this.image === null) {
		return null;
	} else {
		return `data:image/jpeg;base64,${this.image.toString('base64')}`;
	}
});

module.exports = MessageSchema;
