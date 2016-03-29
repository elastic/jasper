#!/bin/sh

BRANCH="${branch}"
WORKING_BRANCH="tmp/$BRANCH"

git checkout $BRANCH
git reset --hard $WORKING_BRANCH
git branch -D $WORKING_BRANCH

sh backport-wrangle-into-commit.rej
