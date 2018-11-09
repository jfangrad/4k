global.Promise = require('bluebird');
const express = require('express');
const bodyParser = require('body-parser');
const createError = require('http-errors');

const geojson = require('./api/geojson');
const regions = require('./api/regions');
const validate = require('./api/validate');

const app = express.Router();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/status', (req, res) => res.status(200).json({ ok: true }));

app.get('/geojson/:regionKey', geojson.get);

app.get('/regions', regions.list);
app.get('/regions/:regionKey', regions.get);

app.post('/validate', validate.post);

app.use((req, res, next) => next(createError(404, 'not found')));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.expose ? err.message : 'unknown' });
});


module.exports = app;
