#!/bin/sh

REMOTE="upstream"
BRANCH="${branch}"

COMMIT_MSG=`cat commit-message-backport.rej`

WORKING_BRANCH="tmp/$BRANCH"

git checkout $BRANCH
git reset --hard $WORKING_BRANCH
git branch -D $WORKING_BRANCH

git reset --soft $REMOTE/$BRANCH
git stash
git reset --hard HEAD^
git stash apply --index

git commit -m "$COMMIT_MSG"
git push -f $REMOTE $BRANCH