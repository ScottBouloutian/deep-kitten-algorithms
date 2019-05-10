const { bindNodeCallback, from, zip } = require('rxjs');
const { filter, mergeMap, toArray, map, take, tap } = require('rxjs/operators');
const fs = require('fs');
const S3 = require('aws-sdk/clients/s3');
const startsWith = require('lodash/fp/startsWith');
const join = require('lodash/fp/join');
const replace = require('lodash/fp/replace');
const split = require('lodash/fp/split');
const chunk = require('lodash/fp/chunk');
const forEach = require('lodash/fp/forEach');
const slice = require('lodash/fp/slice');
const _zip = require('lodash/fp/zip');
const { loadImage, createCanvas } = require('canvas');

const s3 = new S3({ apiVersion: '2006-03-01' });
const dataDirectory = '/Users/scottbouloutian/Desktop/cats';
const readDir = bindNodeCallback(fs.readdir);
const upload = bindNodeCallback(s3.upload.bind(s3));
const readFile = bindNodeCallback(fs.readFile);
const writeFile = bindNodeCallback(fs.writeFile);
const directoryPattern = /^CAT_\d{2}$/;
const validationDirectory = "CAT_06";
const filePattern = /^\d{8}_\d{3}\.jpg$/;
const bucket = 'scottbouloutian-dev';

// Gets a list of paths on the file system to the image training data
function getFiles() {
  return readDir(dataDirectory).pipe(
    mergeMap(from),
    filter(file => directoryPattern.test(file)),
    mergeMap(directory => (
      readDir(`${dataDirectory}/${directory}`).pipe(
        mergeMap(from),
        map(name => {
          const type = directory === validationDirectory ? 'validation' : 'train';
          const path = join('/')([dataDirectory, directory, name]);
          return { name, directory, type, path };
        }),
      )
    )),
    filter(file => directoryPattern.test(file.directory) && filePattern.test(file.name)),
    take(1),
  );
}

// Uploads a file to s3
function uploadFile(file) {
  const stream = fs.createReadStream(file.path);
  return upload({
    Bucket: bucket,
    Key: `cat-learning/${file.type}/${file.name}`,
    Body: stream,
  });
}

function readFaceData(file) {
  return readFile(`${file.path}.cat`, 'utf8').pipe(
    map(split(' ')),
    map(slice(1, 19)),
    map(chunk(6)),
    map(_zip([
      'rgba(0,0,0,0.3)',
      'rgba(0,0,0,0.6)',
      'rgba(0,0,0,0.9)',
    ])),
  )
}

// Creates an annotated image file
function annotateImage(file) {
  return zip(
    from(loadImage(file.path)),
    readFaceData(file),
  ).pipe(
    mergeMap(([image, data]) => {
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext('2d', { pixelFormat: 'A8' });
      forEach(([color, points]) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(points[0], points[1]);
        ctx.lineTo(points[2], points[3]);
        ctx.lineTo(points[4], points[5]);
        ctx.fill();
      })(data);
      const toBuffer = bindNodeCallback(canvas.toBuffer.bind(canvas));
      return toBuffer();
    }),
    mergeMap(buffer => writeFile(`${file.path}.png`, buffer)),
  )
}

getFiles().pipe(
  tap(console.log),
  mergeMap(file => {
    return annotateImage(file);
  }),
).subscribe(console.log, console.error);
