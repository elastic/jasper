// Description:
//   Backport a pull request to specific branches
//
// Commands:
//   jasper backport <pr-url> <branches> - Backport the given PR to the space-separated branches

'use strict';

const resolve = require('path').resolve;
const includes = require('lodash').includes;
const mkdirp = require('mkdirp');
const nodegit = require('nodegit');

const BACKPORT_REGEX = /backport (\S+) ((?:\S *)+)/;
const PR_URL_REGEX = /^https\:\/\/github.com\/([^\/]+\/[^\/]+)\/pull\/(\d+)$/;

module.exports = robot => {
  robot.respond(BACKPORT_REGEX, res => {
    const github = robot.github;

    const cmd = res.match.shift();
    const url = res.match.shift();
    const branches = res.match.shift().split(/\s+/);
    //res.send("backport to", cmd, url, branches);

    // get org/repo/pull# from url
    const match = url.match(PR_URL_REGEX);
    match.shift(); // get rid of first value
    const repo = match.shift();
    const number = match.shift();
    console.log(repo, number);

    const pr = github.pr(repo, number);

    pr.info((err, info) => {
      if (err) return console.error('err', err);
      //console.log(info);

      const target = info.base.ref;
      if (includes(branches, target)) return console.error('cannot backport into original pr target branch');

      const merged = info.merged;
      if (!merged) return console.error('pr is not yet merged'); // todo: uncomment

      const repoDir = resolve(__dirname, '..', 'repos', repo);
      mkdirp.sync(repoDir); // todo: unsync this
      nodegit.Clone(info.base.repo.clone_url, repoDir)
        .catch(err => {
          if (!includes(err.message, 'exists and is not an empty directory')) {
            return robot.emit('error', err);
          }
          return nodegit.Repository.open(repoDir);
        })
        .then(repo => {
          // todo: do this in parallel
          pr.commits((err, commits) => {
            if (err) return console.error('err', err);

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
          })
        });
    });
  });

  // whenever backport PR without conflicts/updates goes green, merge
  robot.router.post('/backport', (req, res) => {
    // do nothing if PR is not in exactly this state:
      // labels: backport, noconflicts
      // green build, green cla
      // original commits?
  });
};
