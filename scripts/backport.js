// Description:
//   Backport a pull request to specific branches
//
// Commands:
//   jasper backport <pr-url> <branches> - Backport the given PR to the space-separated branches

'use strict';

const fs = require('fs');

const { includes } = require('lodash');
const { resolve } = require('path');
const { promisify } = require('bluebird');
const request = require('request');
const tmp = require('tmp');

const { getCommits, getInfo } = require('../src/github');
const { openOrClone } = require('../src/git');

const BACKPORT_REGEX = /backport (\S+) ((?:\S *)+)/;
const PR_URL_REGEX = /^https\:\/\/github.com\/([^\/]+\/[^\/]+)\/pull\/(\d+)$/;

const requestGet = promisify(request.get);
const tmpFile = promisify(tmp.file, { multiArgs: true });
const writeFile = promisify(fs.writeFile);

module.exports = robot => {
  robot.respond(BACKPORT_REGEX, res => {
    const { github } = robot;

    const [ _cmd, url, allBranches ] = res.match;
    const branches = allBranches.split(/\s+/);

    const [ _url, repo, number ] = url.match(PR_URL_REGEX);

    const pr = github.pr(repo, number);

    Promise.all([
      getInfo(pr),
      getCommits(pr)
    ])
    .then(([ info, commits ]) => {
      const target = info.base.ref;
      if (includes(branches, target)) {
        throw new Error('Cannot backport into original PR target branch');
      }

      const { merged } = info;
      if (!merged) {
        throw new Error('Cannot backport unmerged pull requests');
      }

      const original = info.head.ref;

      let num = 0;
      const baseCommitMessage = commits.map(data => {
        const { commit, sha } = data;
        const { author, committer, message } = commit;

        num++;

        const msg = [
          `[Commit ${num}]`,
          `${message}\n`,
          `Original sha: ${sha}`,
          `Authored by ${author.name} <${author.email}> on ${author.date}`,
          `Committed by ${committer.name} <${committer.email}> on ${committer.date}`
        ];

        return msg.join('\n'); // between lines of an individual message
      }).join('\n\n'); // between messages

      const diffFile = requestGet(info.diff_url)
        .then(res => res.body)
        .then(diff => {
          return tmpFile({ prefix: 'jasper-' }).then(([ path, fd, cleanup ]) => {
            return writeFile(path, diff).then(() => [ path, cleanup ]);
          });
        });

      const repoDir = resolve(__dirname, '..', 'repos', repo);
      return openOrClone(repoDir, info.base.repo.clone_url).then(repo => {
        return branches
          .reduce((promise, target) => {
            const backportBranch = `jasper/backport/${number}-${target}-${original}`;

            const commitMessage = `Backport PR #${number} to ${target}\n\n${baseCommitMessage}`;

            return promise
              .then(() => repo.getReferenceCommit(`origin/${target}`))
              .then(commit => repo.createBranch(backportBranch, commit))
              .then(() => repo.checkoutBranch(backportBranch))
              .then(() => diffFile)
              .then(([ path, cleanup ]) => {
                console.log(`\n${commitMessage}`);
                console.log(`\n\n${path}`);

                // todo: issue PR to <target> branch, label:backport label:noconflicts
                cleanup();
              });
          }, repo.fetch('origin'))
          .then(() => {
            // todo: push all branches
            const allBranches = branches.join(', ');
            res.send(`Backported pull request #${number} to ${allBranches}`);
          })
      });
    })
    .catch(err => robot.emit('error', err));
  });

  // whenever backport PR without conflicts/updates goes green, merge
  robot.router.post('/backport', (req, res) => {
    // do nothing if PR is not in exactly this state:
      // labels: backport, noconflicts
      // green build, green cla
      // original commits?
  });
};
