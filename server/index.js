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

getFiles()
  .subscribe(
    files => {
      const fileTensors = _map(file => tf.scalar(file))(files);
      const fileDataset = tf.data.array(fileTensors).shuffle(128).take(3);

      // Construct a dataset of the image training data
      const imageDataset = fileDataset.mapAsync(async tensor => {
        const [file] = await tensor.data();
        const pixels = await getPixels(`${dataDirectory}/${file}`).toPromise();
        const shape = [pixels.shape[0], pixels.shape[1], 3];
        const buffer = tf.buffer(shape, 'int32');
        for (let column=0; column<shape[0]; column++) {
          for (let row=0; row<shape[1]; row++) {
            for (let channel=0; channel<shape[2]; channel++) {
              const pixel = pixels.get(column, row, channel);
              buffer.set(column, row, channel, pixel);
            }
          }
        }
        return buffer.toTensor();
      });

      // Construct a dataset of the face coordinate training data
      const faceDataset = fileDataset.mapAsync(async tensor => {
          const [file] = await tensor.data();
          const faceData = await readFile(`${dataDirectory}/${file}.cat`, 'utf8').toPromise();
          return flow(
            split(' '),
            _map(parseInt(10)),
            data => tf.tensor1d(data).slice(1, 9).toInt(),
          )(faceData);
        });

      const dataset = tf.data.zip([imageDataset, faceDataset]);
      dataset.forEachAsync(console.log);
    },
    error => console.error(error),
  );
