'use strict';

const { stat } = require('fs');

const { promisify } = require('bluebird');
const { Clone, Repository, Signature } = require('nodegit');

const statAsync = promisify(stat);

function clone(url, path, fetchOpts) {
  return Clone(url, path, { fetchOpts });
}

function getSignature() {
  return Signature.now('Elastic Jasper', 'court+jasper@elastic.co');
}

function open(path) {
  return Repository.open(path);
}

function openOrClone(path, url, fetchOpts) {
  return statAsync(path)
    .then(() => open(path))
    .catch({ code: 'ENOENT' }, () => clone(url, path, fetchOpts));
}

module.exports = {
  clone,
  getSignature,
  open,
  openOrClone
};
