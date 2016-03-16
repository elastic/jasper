'use strict';

const { stat } = require('fs');

const { promisify } = require('bluebird');
const { Clone, Repository } = require('nodegit');

const statAsync = promisify(stat);

function clone(url, path) {
  return Clone(url, path);
}

function open(path) {
  return Repository.open(path);
}

function openOrClone(path, url) {
  return statAsync(path)
    .then(() => open(path))
    .catch({ code: 'ENOENT' }, () => clone(url, path));
}

module.exports = {
  clone,
  open,
  openOrClone
};
