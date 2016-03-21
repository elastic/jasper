// Description:
//   Backport a pull request to specific branches
//
// Commands:
//   jasper backport <pr-url> <branches> - Backport the given PR to the space-separated branches

'use strict';

const { execFile } = require('child_process');
const fs = require('fs');

const { includes } = require('lodash');
const { resolve } = require('path');
const { promisify } = require('bluebird');
const request = require('request');
const tmp = require('tmp');

const { getCommits, getInfo } = require('../src/github');
const { openOrClone, getSignature } = require('../src/git');

const BACKPORT_REGEX = /backport (\S+) ((?:\S *)+)/;
const PR_URL_REGEX = /^https\:\/\/github.com\/([^\/]+\/[^\/]+)\/pull\/(\d+)$/;
const CONFLICTS_REGEX = /applied patch to \'.+\' with conflicts/i;

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

      let cleanupTmp = () => {};
      const diffFile = requestGet(info.diff_url)
        .then(res => res.body)
        .then(diff => {
          return tmpFile({ prefix: 'jasper-' }).then(([ path, fd, cleanup ]) => {
            cleanupTmp = cleanup;
            return writeFile(path, diff).then(() => path);
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
              .then(path => {
                return new Promise((resolve, reject) => {
                  const cwd = repoDir;
                  execFile('git', ['apply', '--3way', path], { cwd }, (err) => {
                    if (err && !CONFLICTS_REGEX.test(err.message)) {
                      return reject(err);
                    }
                    resolve();
                  });
                });
              })
              .then(() => repo.index())
              .then(index => {
                return index.addAll('.')
                  .then(() => index.write())
                  .then(() => index.writeTree());
              })
              .then(treeOid => {
                return Promise.all([
                  repo.getHeadCommit(),
                  getSignature()
                ]).then(([parent, signature]) => {
                  return repo.createCommit(
                    'HEAD',
                    signature,
                    signature,
                    commitMessage,
                    treeOid,
                    [parent]
                  );
                });
              });
          }, repo.fetch('origin'))
          .then(() => {
            // todo: push all backport branches
          })
          .then(() => {
            // todo: issue PRs from all backport branches, label:backport label:noconflicts
          })
          .then(() => {
            cleanupTmp();
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
