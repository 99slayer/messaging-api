const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
require('dotenv').config();
const cors = require('cors');

const apiRouter = require('./routes/api');
const testRouter = require('./routes/test-routes');

const app = express();

const mongoose = require('mongoose');
mongoose.set('strictQuery', false);
const db = process.env.TEST_DB;

main().catch((err) => console.log(err));
async function main() {
	await mongoose.connect(db);
}

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
	cors({
		origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
		credentials: true,
	}),
);
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', apiRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	next({ status: 404 });
});

app.use(function (err, req, res, next) {
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};
	console.error(err);
	res.status(err.status || 500).json();
});

module.exports = app;
