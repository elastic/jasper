// Description:
//   Set up a github client and make sure it is attached to the robot

'use strict';

const octonode = require('octonode');
const token = require('../.github-access.json').token;
const github = octonode.client(token);

module.exports = robot => {
  robot.github = github;
};
