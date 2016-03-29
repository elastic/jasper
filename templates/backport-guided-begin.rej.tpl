#!/bin/sh

REMOTE="upstream"
BRANCH="${branch}"
WORKING_BRANCH="tmp/$BRANCH"
STARTING_SHA="${starting}"
ENDING_SHA="${ending}"

git fetch $REMOTE

git checkout -b $WORKING_BRANCH $ENDING_SHA
git rebase $STARTING_SHA^ --onto $BRANCH
