// Description:
//   Set up a github client and make sure it is attached to the robot
//
// Commands:
//   jasper github limit - Returns the current rate limiting info from github

'use strict';

const promisifyAll = require('bluebird').promisifyAll;
const octonode = require('octonode');
const token = require('../.github-access.json').token;
const github = octonode.client(token);

module.exports = robot => {
  robot.github = promisifyAll(github);

  robot.respond(/github limit/, res => {
    github.limitAsync()
      .then(left => res.send(`${left} requests remaining`))
      .catch(err => robot.emit('error', err));
  });
};
