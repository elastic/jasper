'use strict';

const { execFile } = require('child_process');

module.exports = function (path) {
  return (cmd, ...args) => gitexec(path, cmd, ...args);
};

function gitexec(cwd, cmd, ...args) {
  return new Promise((resolve, reject) => {
    execFile('git', [cmd, ...args], { cwd }, err => {
      if (err) reject(err)
      else resolve();
    });
  });
}
