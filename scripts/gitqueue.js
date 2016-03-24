// Description:
//   Set up a queue for repo-specific workflows

'use strict';

module.exports = robot => {
  robot.gitqueue = new GitQueue(errorHandler(robot));
};

function errorHandler(robot) {
  return err => robot.emit('error', err);
}

class GitQueue {
  constructor(errorHandler) {
    this.repos = {};
    this.errorHandler = errorHandler;
  }

  add(repo, fn) {
    if (!this[repo]) {
      this[repo] = Promise.resolve();
    }
    this[repo] = this[repo]
      .then(() => fn(repo))
      .catch(err => this.errorHandler(err));
  }
}
