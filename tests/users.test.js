const apiRouter = require('../routes/api');

const request = require('supertest');
const express = require('express');
const app = express();

app.use(express.urlencoded({ extended: false }));
app.use('/api', apiRouter);

describe('user_list', () => {});

describe('user_detail', () => {});

describe('user_create', () => {});

describe('user_update', () => {});

describe('user_delete', () => {});
