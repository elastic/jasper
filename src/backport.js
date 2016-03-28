'use strict';

const fs = require('fs');
const { join } = require('path');

const { promisify } = require('bluebird');

const writeFile = promisify(fs.writeFile);

function createBackportFiles(template, path, params) {
  const { pr, target, output, branch, starting, ending, msg } = params;

  return backportFile(template, path, pr, target, output)
    .then(() => beginBackportFile(template, path, branch, starting, ending))
    .then(() => finishBackportFile(template, path, branch))
    .then(() => commitMsgBackportFile(path, msg));
}

function commitMsgBackportFile(path, msg) {
  const name = 'commit-message-backport.rej';
  const file = join(path, name);
  return writeFile(file, msg);
}

function finishBackportFile(template, path, branch) {
  const name = 'finish-backport.rej';
  const file = join(path, name);

  return template(name)
    .then(compile => compile({ branch }))
    .then(tpl => writeFile(file, tpl, { mode: 0o755 }));
}

function beginBackportFile(template, path, branch, starting, ending) {
  const name = 'begin-backport.rej';
  const file = join(path, name);

  return template(name)
    .then(compile => compile({ branch, starting, ending }))
    .then(tpl => writeFile(file, tpl, { mode: 0o755 }));
}

function backportFile(template, path, pr, target, output) {
  const name = 'backport.rej.md';
  const file = join(path, name);

  const { number } = pr;
  const url = pr.html_url;

  // we must define the regex inside the function so that unique pointers are
  // created on the regex every time the function is invoked
  // @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec#Finding_successive_matches
  const failed = totalMatches(/applying patch .* with (\d+) reject/gi, output);
  const succeeded = totalMatches(/applied patch .* cleanly/gi, output);
  const missing = totalMatches(/error\: .*\: No such file or directory/gi, output);

  return template(name)
    .then(compile => compile({ number, url, target, failed, succeeded, missing }))
    .then(tpl => writeFile(file, tpl));
}

function totalMatches(regex, output) {
  let matches;
  let total = 0;
  while ((matches = regex.exec(output)) !== null) {
    total++;
  }
  return total;
}

module.exports = {
  createBackportFiles
};
