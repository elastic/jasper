'use strict';

const fs = require('fs');

const { promisify } = require('bluebird');
const tmp = require('tmp');

const tmpFile = promisify(tmp.file, { multiArgs: true });
const writeFile = promisify(fs.writeFile);

function createTmpFile(content) {
  return tmpFile({ prefix: 'jasper-' }).then(([ path, fd, cleanup ]) => {
    return writeFile(path, content).then(() => [path, cleanup]);
  });
}

module.exports = {
  createTmpFile
};
