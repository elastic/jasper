// Description:
//   Backport a pull request to specific branches
//
// Commands:
//   jasper backport <pr-url> <branches> - Backport the given PR to the space-separated branches

'use strict';

const mkdirp = require('mkdirp');

const { includes } = require('lodash');
const { Clone, Repository } = require('nodegit');
const { resolve } = require('path');

const { getCommits, getInfo } = require('../src/github');

const BACKPORT_REGEX = /backport (\S+) ((?:\S *)+)/;
const PR_URL_REGEX = /^https\:\/\/github.com\/([^\/]+\/[^\/]+)\/pull\/(\d+)$/;

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

      const repoDir = resolve(__dirname, '..', 'repos', repo);
      mkdirp.sync(repoDir); // todo: unsync this
      return Clone(info.base.repo.clone_url, repoDir)
        .catch(err => {
          if (!includes(err.message, 'exists and is not an empty directory')) {
            throw err;
          }
          return Repository.open(repoDir);
        })
        .then(repo => {
          const backports = branches.map(version => {
            // assert that we have appropriate labels

            // create backport-<pull>-<version>
            const branch = `jasper-backport-${number}-${version}`;
            console.log(`create ${branch}`);

            // cherry-pick each commit, commit any conflicts(?)
            commits.forEach(commit => {
              console.log(`cherry-pick ${commit.sha}`);
            });

            // issue PR to <version> branch, label:backport label:noconflicts
            const labels = ['backport', 'noconflicts'];
            console.log(`open pr to ${version} from ${branch} with labels: ${labels.join()}`);

            return branch;
          });

          // push changes to upstream
          console.log(`push branches to upstream: ${backports.join()}`);

          res.send('done');
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
