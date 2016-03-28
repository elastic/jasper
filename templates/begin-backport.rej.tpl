#!/bin/sh

REMOTE="upstream"
BRANCH="${branch}"
STARTING_SHA="${starting}"
ENDING_SHA="${ending}"

WORKING_BRANCH="tmp/$BRANCH"

git fetch $REMOTE

git checkout -b $WORKING_BRANCH $ENDING_SHA
git rebase $STARTING_SHA^ --onto $BRANCH
