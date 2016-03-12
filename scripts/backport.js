// Description:
//   Backport a pull request to specific branches
//
// Commands:
//   jasper backport <pr-url> <versions> - Backport the given PR to the space-separated versions

'use strict';

module.exports = robot => {
  robot.respond(/backport (\S+) ((?:\S *)+)/, res => {
    const cmd = res.match.shift();
    const url = res.match.shift();
    const versions = res.match.shift().split(/\s+/);
    res.send("backport to", cmd, url, versions);

    // assert PR is merged
    // assert target is not in versions
    // for every version
      // create backport-<pull>-<version>
      // cherry-pick each commit, commit any conflicts
      // issue PR to <version> branch, label:backport label:noconflicts label:v<version>
  });

  // whenever backport PR without conflicts/updates goes green, merge
  robot.router.post('/backport', (req, res) => {
    // do nothing if PR is not in exactly this state:
      // labels: backport, noconflicts, v<version>
      // green build, green cla
      // original commits?
  });
};
