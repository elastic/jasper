'use strict';

const octonode = require('octonode');
const { promisify, promisifyAll } = require('bluebird');

function createClient(token) {
  const client = octonode.client(token);
  return promisifyAll(client);
}

function getCommits(resource) {
  return promisify(resource.commits, { context: resource })();
}

function getInfo(resource) {
  return promisify(resource.info, { context: resource })();
}

module.exports = {
  createClient,
  getCommits,
  getInfo
};
