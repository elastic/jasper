#!/bin/sh

REMOTE="upstream"
BRANCH="${branch}"
COMMIT_MSG=`cat backport-commit-message.rej`

git reset --soft $REMOTE/$BRANCH
git stash
git reset --hard HEAD^
git stash apply --index

git commit -m "$COMMIT_MSG" --no-verify
