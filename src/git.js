'use strict';

const { stat } = require('fs');

const { promisify } = require('bluebird');
const gitcli = require('./gitcli');

const statAsync = promisify(stat);

function clone(url, path) {
  const git = gitcli();
  return git('clone', url, path).then(() => open(path));
}

function open(path) {
  return gitcli(path);
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
