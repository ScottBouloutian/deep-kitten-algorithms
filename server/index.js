const fs = require('fs');
const { bindNodeCallback, pipe, from } = require('rxjs');
const { filter, mergeMap, map, pairwise, tap, toArray } = require('rxjs/operators');
const slice = require('lodash/fp/slice');
const split = require('lodash/fp/split');
const flow = require('lodash/fp/flow');
const parseInt = require('lodash/fp/parseInt');
const shuffle = require('lodash/fp/shuffle');
const _map = require('lodash/fp/map');
const mean = require('lodash/fp/mean');
const times = require('lodash/fp/times');
const round = require('lodash/fp/round');
const identity = require('lodash/fp/identity');
const last = require('lodash/fp/last');
const tf = require("@tensorflow/tfjs-node");
const _getPixels = require("get-pixels");

const dataDirectory = '/Users/scottbouloutian/Desktop/cats';
const readDir = bindNodeCallback(fs.readdir);
const readFile = bindNodeCallback(fs.readFile);
const getPixels = bindNodeCallback(_getPixels);
const directoryPattern = "CAT_\\d{2}";
const filePattern = "\\d{8}_\\d{3}.jpg";

// Gets a list of paths on the file system to the image training data
function getFiles() {
  return readDir(dataDirectory).pipe(
    mergeMap(from),
    filter(file => new RegExp(`^${directoryPattern}$`).test(file)),
    mergeMap(directory => (
      readDir(`${dataDirectory}/${directory}`).pipe(
        mergeMap(from),
        map(file => `${directory}/${file}`)
      )
    )),
    filter(file => new RegExp(`^${directoryPattern}/${filePattern}\$`).test(file)),
    toArray(),
  );
}

// Reads an image file and converts it to a tensor
async function getImage(file) {
  const pixels = await getPixels(`${dataDirectory}/${file}`).toPromise();
  const shape = [pixels.shape[0], pixels.shape[1], 3];
  const buffer = tf.buffer(shape);
  for (let column=0; column<shape[0]; column++) {
    for (let row=0; row<shape[1]; row++) {
      for (let channel=0; channel<shape[2]; channel++) {
        const pixel = pixels.get(column, row, channel);
        buffer.set(column, row, channel, pixel);
      }
    }
  }
  const imageTensor = buffer
    .toTensor()
    .pad([
      [0, 1024 - shape[0]],
      [0, 1024 - shape[1]],
      [0, 0],
    ]);
  return tf.image
    .resizeNearestNeighbor(imageTensor, [64, 64])
    .mean(2, true)
    .toInt()
}

// Reads a face data file and converts it to a tensor
async function getFace(file) {
  const faceData = await readFile(`${dataDirectory}/${file}.cat`, 'utf8').toPromise();
  return flow(
    split(' '),
    _map(parseInt(10)),
    data => tf.tensor1d(data).slice(1, 9).toInt(),
  )(faceData);
}

getFiles()
  .subscribe(
    files => {
      const fileDataset = tf.data.array(files);
      const dataset = fileDataset
        .mapAsync(file => (
          Promise
            .all([getImage(file), getFace(file)])
            .then(([ xs, ys ]) => ({ xs, ys }))
        ))
        .batch(10);
      const model = tf.sequential();
      model.add(tf.layers.dense({ inputShape: [64, 64, 1], units: 64 * 64 }));
      model.add(tf.layers.conv2d({
        filters: 32,
        kernelSize: 5,
        strides: 1,
        padding: 'same',
        activation: 'relu',
      }));
      model.add(tf.layers.maxPooling2d({ poolSize: 5, padding: 'same' }));
      model.add(tf.layers.conv2d({
        filters: 50,
        kernelSize: 5,
        strides: 1,
        padding: 'same',
        activation: 'relu',
      }));
      model.add(tf.layers.maxPooling2d({ poolSize: 5, padding: 'same' }));
      model.add(tf.layers.conv2d({
        filters: 80,
        kernelSize: 5,
        strides: 1,
        padding: 'same',
        activation: 'relu',
      }));
      model.add(tf.layers.maxPooling2d({ poolSize: 5, padding: 'same' }));
      model.add(tf.layers.dropout({ rate: .25 }));
      model.add(tf.layers.flatten());
      model.add(tf.layers.dense({ units: 512 }));
      model.add(tf.layers.dropout({ rate: .5 }));
      model.add(tf.layers.dense({ units: 9 }));
      const optimizer = tf.train.adam();
      model.compile({ optimizer, loss: 'categoricalCrossentropy' });
      model.fitDataset(dataset, { epochs: 3 })
        .then(() => model.save(`file://${dataDirectory}/model.tf`))
        .then(() => console.log('done'));
    },
    error => console.error(error),
  );
