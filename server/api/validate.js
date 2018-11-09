const createError = require('http-errors');
const fs = require('fs');
const path = require('path');
const which = require('which-polygon');
const Pbf = require('pbf');
const geobuf = require('geobuf');

const regions = {};

function getRegionGeoJson(regionKey) {
  const filePath = path.join(__dirname, '..', '..', 'data', 'geojson', `${regionKey}.proto`);
  const contents = fs.readFileSync(filePath);
  return geobuf.decode(new Pbf(contents));
}

function getMatcher(regionKey) {
  if (regions[regionKey]) {
    return regions[regionKey];
  }

  const geojson = getRegionGeoJson(regionKey);

  regions[regionKey] = which(geojson);
  return regions[regionKey];
}

exports.post = (req, res, next) => {
  const data = req.body;

  if (!data) {
    return next(createError(400, 'Missing body data'));
  }

  if (!data.locations) {
    return next(createError(400, 'Missing locations on body data'));
  }

  const locations = Object.values(data.locations);

  const erroredLocations = {};
  const numLocations = locations.length;
  let numFailed = 0;
  let numError = 0;

  Object.values(data.locations).forEach(({
    key,
    regionKey,
    latitude,
    longitude,
  }) => {
    if (!regionKey || !latitude || !longitude) {
      numError += 1;
      erroredLocations[`${key}`] = `Improper data found at key: ${key}. Missing regionKey, latitude, or longitude`;
      return;
    }

    const matcher = getMatcher(regionKey);
    if (!matcher || !matcher([longitude, latitude])) {
      erroredLocations[`${key}`] = `Incorrect region ${regionKey} for lat: ${latitude}, long: ${longitude}`;
      numFailed += 1;
    }
  });

  const successRate = ((numLocations - numError - numFailed) / (numLocations - numError)) * 100;

  const response = {
    totalLocationsCount: numLocations,
    successRate,
    erroredLocations,
  };

  return res.status(200).json(response);
};
