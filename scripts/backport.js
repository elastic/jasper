// Description:
//   Backport a pull request to specific branches
//
// Commands:
//   jasper backport <pr-url> <branches> - Backport the given PR to the space-separated branches

'use strict';

const { cloneDeep, first, includes, last, once } = require('lodash');
const { resolve } = require('path');

const { createBackportFiles } = require('../src/backport');
const { sendError } = require('../src/error');
const { createIssue, createPullRequest, getCommits, getDiff, getInfo } = require('../src/github');
const { openOrClone } = require('../src/git');
const { createTmpFile } = require('../src/tmp');

const BACKPORT_REGEX = /backport (\S+) ((?:\S *)+)/;
const PR_URL_REGEX = /^https\:\/\/github.com\/([^\/]+\/[^\/]+)\/pull\/(\d+)$/;

function areDifferentPrs(pr1, pr2) {
  return pr1.number !== pr2.number;
}

module.exports = robot => {
  robot.respond(BACKPORT_REGEX, res => {
    const { gitqueue } = robot;

    const [ _cmd, url, allBranches ] = res.match;
    const targetBranches = allBranches.split(/\s+/);

    const [ _url, repo, number ] = url.match(PR_URL_REGEX);

    gitqueue.add(repo, () => backport(robot, res, repo, number, targetBranches));
  });

  // whenever backport PR without conflicts/updates goes green, merge
  robot.router.post('/backport', (req, res) => {
    // do nothing if PR is not in exactly this state:
      // labels: backport, noconflicts
      // green build, green cla
      // original commits?
  });
};

function backport(robot, res, repo, number, targetBranches) {
  const { github, template } = robot;

  const githubRepo = github.repo(repo);
  const pr = github.pr(repo, number);

  // The working PR is from the url specified in the backport command
  return getInfo(pr)

  // The accumulator builds toward [ workingPr, originalPr, msg, diff ]
  .then(workingPr => {
    const { base } = workingPr;

    if (includes(targetBranches, base.ref)) {
      throw new Error('Cannot backport into the same branch as the pull request itself');
    }

    // todo: check for 'has conflicts' label

    return [ workingPr ];
  })

  // When the working PR is a backport, then we also grab the original PR
  // that was being backported. If the working PR is not a backport, then
  // both the working and original PRs are the same.
  .then(accumulator => {
    const [ workingPr ] = accumulator;

    const { base, body } = workingPr;

    const matches = body.match(/^\s*backport pr #(\d+)\s*\n---/i);
    if (!matches) {
      return [ ...accumulator, cloneDeep(workingPr) ];
    }

    const [ _body, number ] = matches;
    const repo = base.repo.full_name;
    const pr = github.pr(repo, number);
    return getInfo(pr).then(originalPr => [ ...accumulator, originalPr ]);
  })

  .then(accumulator => {
    const [ workingPr, originalPr ] = accumulator;

    if (!originalPr.merged) {
      throw new Error('Cannot backport when the original pull request is unmerged');
    }

    const { number } = workingPr;
    const repo = workingPr.base.repo.full_name;
    const pr = github.pr(repo, number);
    return getCommits(pr)
      .then(commits => [ ...accumulator, commits ]);
  })

  // The pr/commit message gets built from the original PR's commits unless
  // we're using a different working PR. In that case, we inherit the working
  // PR's body.
  .then(accumulator => {
    const [ workingPr, originalPr, commits ] = accumulator;

    if (areDifferentPrs(workingPr, originalPr)) {
      return [ ...accumulator, workingPr.body ];
    }

    const { number, title } = workingPr;
    let num = 0;
    const commitMsgs = commits.map(data => {
      const { commit, sha } = data;
      const { author, committer, message } = commit;

      num++;

      const msg = [
        `**Commit ${num}:**`,
        `${message}\n`,
        `* Original sha: ${sha}`,
        `* Authored by ${author.name} <${author.email}> on ${author.date}`
      ];

      if (author.email !== committer.email) {
        msg.push(`* Committed by ${committer.name} <${committer.email}> on ${committer.date}`);
      }

      return msg.join('\n'); // between lines of an individual message
    }).join('\n\n'); // between messages

    const msg = [
      `${title}\n`,
      `Backports PR #${number}\n`,
      commitMsgs
    ].join('\n');

    return [ ...accumulator, msg ];
  })

  .then(accumulator => {
    const [ workingPr ] = accumulator;

    const { number } = workingPr;
    const repo = workingPr.base.repo.full_name;
    const pr = github.pr(repo, number);
    return getDiff(pr).then(diff => [ ...accumulator, diff ]);
  })

  // we have all of the remote information we need to make this happen
  .then(([ workingPr, originalPr, commits, msg, diff ]) => {
    let cleanupTmp = () => {};
    const diffPath = once(() => (
      createTmpFile(diff).then(([ path, destroy ]) => {
        // since we don't actually kill the jasper process at the end of
        // backporting, we need to manually destroy the tmp file
        cleanupTmp = destroy;
        return path;
      })
    ));

    const fromProxyPr = () => areDifferentPrs(workingPr, originalPr);

    function backportBranchName(target) {
      const prnum = fromProxyPr()
        ? `${originalPr.number}/${workingPr.number}`
        : `${workingPr.number}`;
      return `jasper/backport/${prnum}/${target}`;
    }

    const branchesWithConflicts = new Map();

    const repo = workingPr.base.repo;
    const repoDir = resolve(__dirname, '..', 'repos', repo.full_name);
    return openOrClone(repoDir, repo.ssh_url).then(git => {
      return targetBranches
        .reduce((promise, target) => {
          return promise
            .then(() => git('checkout', target))
            .then(() => git('reset', '--hard', `origin/${target}`))
            .then(() => {
              return git('branch', '-D', backportBranchName(target)).catch(err => {
                if (!includes(err.message, 'not found')) throw err;
              });
            })
            .then(() => git('checkout', '-b', backportBranchName(target)))
            .then(() => diffPath())
            .then(path => {
              return git('apply', '--reject', path).catch(err => {
                const matches = err.message.match(/applying patch .* with \d+ reject/gi);
                if (!matches) throw err;
                branchesWithConflicts.set(target, matches.length);

                const pr = workingPr;
                const output = err.message;
                const branch = backportBranchName(target);
                const starting = first(commits).sha;
                const ending = last(commits).sha;
                return git('clean', '-fdq')
                  .then(() => git('checkout', '--', '.'))
                  .then(() => createBackportFiles(robot.template, repoDir, {
                    pr, target, output, branch, starting, ending, msg
                  }));
              });
            })
            .then(() => git('add', '.'))
            .then(() => git('commit', '-m', msg, '--no-verify'));
        }, git('fetch', 'origin'))
        .then(() => {
          cleanupTmp(); // we're done with the diff file
          return Promise.all(
            targetBranches
              .map(backportBranchName)
              .map(branch => `${branch}:${branch}`)
              .map(refspec => git('push', 'origin', refspec))
          );
        })
        .then(() => {
          return Promise.all(
            targetBranches.map(target => {
              const head = backportBranchName(target);

              const { merged_by, number, title } = originalPr;

              let body = msg;
              if (fromProxyPr()) {
                body = [
                  msg,
                  `\n-------------------------------`,
                  `**Backported based on diff from PR #${workingPr.number}**`
                ].join('\n')
              }

              const params = {
                title: `[${target}] ${title}`,
                body,
                assignee: merged_by.login,
                labels: [ 'backport' ]
              };

              if (branchesWithConflicts.has(target)) {
                params.labels.push('has conflicts');
              }

              return createIssue(githubRepo, params).then(({ number }) => {
                const issue = number;
                const base = target;
                return createPullRequest(githubRepo, { base, head, issue });
              });
            })
          );
        })
        .then(() => {
          const allBranches = targetBranches.join(', ');
          const PR = targetBranches.length === 1 ? 'pull request' : 'pull requests';
          const msg = [
            `Created backport ${PR} for #${originalPr.number} to ${allBranches}`
          ];
          if (fromProxyPr()) {
            msg.push(` (via PR #${workingPr.number})`);
          }
          if (branchesWithConflicts.size) {
            msg.push(', though there are conflicts');
          }
          if (branchesWithConflicts.size > 1) {
            if (targetBranches.length === branchesWithConflicts.size) {
              msg.push(' in all branches');
            } else if (targetBranches.length > 1) {
              const conflicts = [...branchesWithConflicts.keys()].join(', ');
              msg.push(` in ${conflicts}`);
            }
          }
          res.send(msg.join('') + '.');
        })
    });
  })

  .catch(err => sendError(robot, res, err));
}
