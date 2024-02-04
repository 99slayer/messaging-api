require('dotenv').config();

const mongoose = require('mongoose');
mongoose.set('strictQuery', false);
const db = process.env.TEST_DB;

main().catch((err) => console.log(err));
async function main() {
	await mongoose.connect(db);
}
