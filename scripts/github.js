// Description:
//   Set up a github client and make sure it is attached to the robot
//
// Commands:
//   jasper github limit - Returns the current rate limiting info from github

'use strict';

const { token } = require('../.github-access.json');
const { createClient } = require('../src/github');

module.exports = robot => {
  const github = createClient(token);

  robot.github = github;

  robot.respond(/github limit/, res => {
    github.limitAsync()
      .then(left => res.send(`${left} requests remaining`))
      .catch(err => robot.emit('error', err));
  });
};
