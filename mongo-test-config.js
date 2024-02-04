const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

async function initializeMongoServer() {
	const mongoServer = await MongoMemoryServer.create();
	const db = mongoServer.getUri();

	mongoose.connect(db);

	mongoose.connection.on('error', (e) => {
		if (e.message.code === 'ETIMEDOUT') {
			console.log(e);
			mongoose.connect(db);
		}
		console.log(e);
	});

	mongoose.connection.once('open', () => {
		console.log(`MongoDB successfully connected to ${db}`);
	});
}

module.exports = initializeMongoServer;
