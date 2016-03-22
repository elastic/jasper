'use strict';

const { execFile } = require('child_process');

module.exports = function gitcli(path) {
  return (cmd, ...args) => execgit(path, cmd, ...args);
};

function execgit(cwd, cmd, ...args) {
  return new Promise((resolve, reject) => {
    execFile('git', [cmd, ...args], { cwd }, err => {
      if (err) reject(err)
      else resolve();
    });
  });
}
