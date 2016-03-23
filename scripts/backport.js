// Description:
//   Backport a pull request to specific branches
//
// Commands:
//   jasper backport <pr-url> <branches> - Backport the given PR to the space-separated branches

'use strict';

const { includes, once } = require('lodash');
const { resolve } = require('path');

const { createIssue, createPullRequest, getCommits, getDiff, getInfo } = require('../src/github');
const { openOrClone } = require('../src/git');
const { createTmpFile } = require('../src/tmp');

const BACKPORT_REGEX = /backport (\S+) ((?:\S *)+)/;
const PR_URL_REGEX = /^https\:\/\/github.com\/([^\/]+\/[^\/]+)\/pull\/(\d+)$/;
const CONFLICTS_REGEX = /applied patch to \'.+\' with conflicts/i;

module.exports = robot => {
  robot.respond(BACKPORT_REGEX, res => {
    const { github } = robot;

    const [ _cmd, url, allBranches ] = res.match;
    const branches = allBranches.split(/\s+/);

    const [ _url, repo, number ] = url.match(PR_URL_REGEX);

    const githubRepo = github.repo(repo);
    const pr = github.pr(repo, number);

    Promise.all([
      getInfo(pr),
      getCommits(pr),
      getDiff(pr)
    ])
    .then(([ info, commits, diff ]) => {
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
          `**Commit ${num}:**`,
          `${message}`,
          '\n',
          `* Original sha: ${sha}`,
          `* Authored by ${author.name} <${author.email}> on ${author.date}`
        ];

        if (author.email !== committer.email) {
          msg.push(`* Committed by ${committer.name} <${committer.email}> on ${committer.date}`);
        }

        return msg.join('\n'); // between lines of an individual message
      }).join('\n\n'); // between messages

      let cleanupTmp = () => {};
      const diffPath = once(() => (
        createTmpFile(diff).then(([ path, destroy ]) => {
          // since we don't actually kill the jasper process at the end of
          // backporting, we need to manually destroy the tmp file
          cleanupTmp = destroy;
          return path;
        })
      ));

      function backportBranchName(target) {
        return `jasper/backport/${number}-${target}`;
      }

      function backportCommitMsg(target) {
        return `Backport PR #${number}\n---------\n\n${baseCommitMessage}`;
      }

      const branchesWithConflicts = [];

      const repoDir = resolve(__dirname, '..', 'repos', repo);
      return openOrClone(repoDir, info.base.repo.ssh_url).then(git => {
        return branches
          .reduce((promise, target) => {
            return promise
              .then(() => git('checkout', target))
              .then(() => git('checkout', '-b', backportBranchName(target)))
              .then(() => diffPath())
              .then(path => {
                return git('apply', '--3way', path).catch(err => {
                  if (!CONFLICTS_REGEX.test(err.message)) throw err;
                  branchesWithConflicts.push(target);
                });
              })
              .then(() => git('add', '.'))
              .then(() => git('commit', '-m', backportCommitMsg(target)));
          }, git('fetch', 'origin'))
          .then(() => {
            cleanupTmp();
            return Promise.all(
              branches
                .map(backportBranchName)
                .map(branch => `${branch}:${branch}`)
                .map(refspec => git('push', 'origin', refspec))
            );
          })
          .then(() => {
            return Promise.all(
              branches.map(base => {
                const head = backportBranchName(base);

                const params = {
                  title: `[backport] PR #${number} to ${base}`,
                  body: backportCommitMsg(base),
                  assignee: info.merged_by.login,
                  labels: [ 'backport' ]
                };

                if (includes(branchesWithConflicts, base)) {
                  params.labels.push('has conflicts');
                }

                return createIssue(githubRepo, params).then(({ number }) => {
                  const issue = number;
                  return createPullRequest(githubRepo, { base, head, issue });
                });
              })
            );
          })
          .then(() => {
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
