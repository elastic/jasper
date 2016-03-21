'use strict';

const octonode = require('octonode');
const { promisify, promisifyAll } = require('bluebird');

function createClient(token) {
  const client = octonode.client(token);
  return promisifyAll(client);
}

function createIssue(repo, params) {
  return promisify(repo.issue, { context: repo })(params)
    .catch(err => {
      console.error(err.body.errors);
      throw err;
    });
}

function createPullRequest(repo, params) {
  return promisify(repo.pr, { context: repo })(params)
    .catch(err => {
      console.error(err.body.errors);
      throw err;
    });
}

function getCommits(resource) {
  return promisify(resource.commits, { context: resource })();
}

function getInfo(resource) {
  return promisify(resource.info, { context: resource })();
}

module.exports = {
  createClient,
  createIssue,
  createPullRequest,
  getCommits,
  getInfo
};
