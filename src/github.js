'use strict';

const octonode = require('octonode');
const { promisify, promisifyAll } = require('bluebird');
const request = require('request');

const requestGet = promisify(request.get);

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

function getDiff(pr) {
  const { repo, number } = pr;
  if (!repo) throw new Error('You must specify a repo to get a diff');
  if (!number) throw new Error('You must specify a number to get a diff');
  const url = `https://patch-diff.githubusercontent.com/raw/${repo}/pull/${number}.diff`;
  return requestGet(url).then(res => res.body);
}

function getInfo(resource) {
  return promisify(resource.info, { context: resource })();
}

module.exports = {
  createClient,
  createIssue,
  createPullRequest,
  getCommits,
  getDiff,
  getInfo
};
