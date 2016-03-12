// Description:
//   Set up a github client and make sure it is attached to the robot
//
// Commands:
//   jasper github limit - Returns the current rate limiting info from github

'use strict';

const octonode = require('octonode');
const token = require('../.github-access.json').token;
const github = octonode.client(token);

module.exports = robot => {
  robot.github = github;

  robot.respond(/github limit/, res => {
    github.limit(function (err, left, max) {
      if (err) return robot.emit('err', err);
      res.send(`${left} of ${max} remaining`);
    });
  });
};
