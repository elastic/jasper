### Backport of PR [#${number}](${url}) to branch ${target} failed

<% if (missing > 0) { %>
**${missing}** file<%- missing !== 1 ? 's' : '' %> could not be found in this branch,
<% } %>
**${failed}** patch<%- failed !== 1 ? 'es' : '' %> failed to apply,
while **${succeeded}** patch<%- succeeded !== 1 ? 'es were' : ' was' %> applied successfully.

-------------------------------------

The following script will rebase the commits that need to be backported onto
this backport branch. Resolve any conflicts as you normally would in a rebase.
You do *not* need to remove these backport.rej files, and you can add
additional commits if that's necessary.

```
sh begin-backport.rej
```

Once the conficts are resolved on your local backport branch, the following
script will remove the remnants of this backport commit and squash the newly
resolved commits (and any others you may have added) into a single backport
commit with the proper commit message. Finally, it'll replace the upstream
backport branch (the one from the backport PR) with the result.

```
sh finish-backport.rej
```
