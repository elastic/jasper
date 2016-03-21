'use strict';

const { stat } = require('fs');

const { promisify } = require('bluebird');
const { Clone, Repository, Signature } = require('nodegit');

const statAsync = promisify(stat);

function clone(url, path) {
  return Clone(url, path);
}

function getSignature() {
  return Signature.now('Elastic Jasper', 'court+jasper@elastic.co');
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
  getSignature,
  open,
  openOrClone
};
