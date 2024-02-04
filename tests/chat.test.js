const apiRouter = require('../routes/api');

const request = require('supertest');
const express = require('express');
const app = express();

app.use(express.urlencoded({ extended: false }));
app.use('/api', apiRouter);

describe('chat_list', () => {});

describe('chat_detail', () => {});

describe('chat_create', () => {});

describe('chat_update', () => {});

describe('chat_delete', () => {});
