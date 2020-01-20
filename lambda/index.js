const SageMakerRuntime = require('aws-sdk/clients/sagemakerruntime');
const { bindNodeCallback, from, zip } = require('rxjs');
const Busboy = require('busboy');

const sageMakerRuntime = new SageMakerRuntime({
  apiVersion: '2017-05-13',
  region: 'us-east-1',
});
const invokeEndpoint = bindNodeCallback(sageMakerRuntime.invokeEndpoint.bind(sageMakerRuntime));

function parseFormData(event) {
  const busboy = new Busboy({
    headers: {
      'content-type': event.headers['content-type'],
    }
  });
  return new Promise((resolve, reject) => {
    const result = { };
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        file.on('data', (data) => {
            result.file = data;
        });
        file.on('end', () => {
            result.filename = filename;
            result.contentType = mimetype;
        });
    });
    busboy.on('error', error => reject(error));
    busboy.on('finish', () => resolve(result));
    busboy.write(event.body, 'base64');
    busboy.end();
  });
}

module.exports.endpoint = async (event) => {
  const data = await parseFormData(event);
  const response = await invokeEndpoint({
    Body: data.file,
    EndpointName: 'deep-kitten-endpoint',
    Accept: 'image/png',
    ContentType: 'image/jpeg',
  }).toPromise();
  return {
    statusCode: 200,
    headers: {
      ['content-type']: 'text/plain',
      ['Access-Control-Allow-Headers']: 'content-type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      ['Access-Control-Allow-Origin']: '*',
    },
    body: response.Body.toString('base64'),
  };
}
