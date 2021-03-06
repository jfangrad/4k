/*
  eslint
  no-console: 0,
  import/no-extraneous-dependencies: ["error", { "devDependencies": true }]
*/
const tj = require('togeojson');
const fs = require('fs');
const path = require('path');
const { DOMParser } = require('xmldom');

const mapsDir = path.join(__dirname, 'maps');
const files = fs.readdirSync(mapsDir);

function getFeatures(file) {
  const filePath = path.join(mapsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const kml = new DOMParser().parseFromString(content);

  const { features } = tj.kml(kml);
  return features;
}

// Do not do this.
// Originally I was parsing the description as an HTML document to find the right values.
// This took WAY too much memory and killed the whole thing

// This will parse the following from the description

/*
<td>WorldID</td>

<td>CHN-ANH-ANQ-ANQ</td>
*/

function getRegionKey(description) {
  const start = description.indexOf('WorldID');
  const closing = description.indexOf('>', start);
  const opener = description.indexOf('>', closing + 1);
  const finisher = description.indexOf('<', opener);

  if (opener < finisher && opener > 0) {
    return description.substring(opener + 1, finisher);
  }
  return null;
}

function writeRegion(feature) {
  try {
    const regionKey = getRegionKey(feature.properties.description);
    if (!regionKey) {
      return null;
    }

    if (!/^[A-Z0-9]{3,}(-[A-Z0-9]{3,})*$/.test(regionKey)) {
      throw new Error(`Invalid Region: ${regionKey}`);
    }

    // eslint-disable-next-line no-param-reassign
    feature.properties = { regionKey };

    const geojsonPath = path.join(__dirname, 'geojson', `${regionKey}.json`);
    return fs.writeFileSync(geojsonPath, JSON.stringify(feature));
  } catch (err) {
    console.error('Failed to parse:', feature.id, err);
    return null;
  }
}

files.map((file) => {
  if (!/\.kml$/.test(file)) {
    return [];
  }

  return getFeatures(file).map(writeRegion);
});
