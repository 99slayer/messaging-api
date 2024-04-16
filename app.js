const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
require('dotenv').config();
const cors = require('cors');

const apiRouter = require('./routes/api');
const testRouter = require('./routes/test-routes');

const app = express();

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
app.use('/test', testRouter);

module.exports = app;
