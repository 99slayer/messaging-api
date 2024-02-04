const apiRouter = require('../routes/api');

const request = require('supertest');
const express = require('express');
const app = express();

app.use(express.urlencoded({ extended: false }));
app.use('/api', apiRouter);

describe('message_list', () => {});

describe('message_create', () => {});

describe('message_update', () => {});

describe('message_delete', () => {});
