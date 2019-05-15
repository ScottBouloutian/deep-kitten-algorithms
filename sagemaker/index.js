const { bindNodeCallback, from, zip } = require('rxjs');
const { filter, mergeMap, toArray, map, take, skip, bufferCount } = require('rxjs/operators');
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
const parseInt = require('lodash/fp/parseInt');
const isNaN = require('lodash/fp/isNaN');

const s3 = new S3({ apiVersion: '2006-03-01' });
const dataDirectory = '/Users/scottbouloutian/Desktop/cats';
const readDir = bindNodeCallback(fs.readdir);
const upload = bindNodeCallback(s3.upload.bind(s3));
const readFile = bindNodeCallback(fs.readFile);
const writeFile = bindNodeCallback(fs.writeFile);
const unlink = bindNodeCallback(fs.unlink);
const directoryPattern = /^CAT_04$/;
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

// Read face feature data
function readFaceData(file) {
  return readFile(`${file.path}.cat`, 'utf8').pipe(
    map(split(' ')),
    mergeMap(from),
    skip(1),
    map(parseInt(10)),
    filter(number => !isNaN(number)),
    bufferCount(2),
    toArray(),
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

      // Draw eyes
      ctx.beginPath();
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.arc(data[0][0], data[0][1], 16, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(data[1][0], data[1][1], 16, 0, 2 * Math.PI);
      ctx.fill();

      // Draw nose
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.arc(data[2][0], data[2][1], 16, 0, 2 * Math.PI);
      ctx.fill();

      // Draw ears
      ctx.fillStyle = 'rgba(0,0,0,0.9)';
      ctx.beginPath();
      ctx.moveTo(data[3][0], data[3][1]);
      ctx.lineTo(data[4][0], data[4][1]);
      ctx.lineTo(data[5][0], data[5][1]);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(data[6][0], data[6][1]);
      ctx.lineTo(data[7][0], data[7][1]);
      ctx.lineTo(data[8][0], data[8][1]);
      ctx.fill();

      const toBuffer = bindNodeCallback(canvas.toBuffer.bind(canvas));
      return toBuffer();
    }),
    mergeMap(buffer => writeFile(`${file.path}.png`, buffer)),
    mergeMap(() => uploadFile(
        {
            ...file,
            name: replace(/\.jpg$/, '.png')(file.name),
            type: `${file.type}_annotation`,
            path: `${file.path}.png`,
        }
    )),
    mergeMap(() => unlink(`${file.path}.png`)),
  );
}

function uploadData() {
    getFiles().pipe(
      mergeMap(file => zip(
          uploadFile(file),
          annotateImage(file),
      )),
    ).subscribe(
        ([s3Response]) => console.log(s3Response),
        console.error,
    );
}
