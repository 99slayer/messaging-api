// Formats express-validators validationResult object.
exports.getValidationMessages = function (result) {
	const msgs = {};

	for (const error of result.errors) {
		if (Object.keys(msgs).includes(error.path)) {
			msgs[error.path].push(error.msg);
		} else {
			msgs[error.path] = [];
			msgs[error.path].push(error.msg);
		}
	}

	return msgs;
};
