@echo off

node_modules/.bin/coffee.cmd^
 --nodejs "--harmony --harmony_destructuring --harmony_default_parameters"^
 node_modules/.bin/hubot.cmd --name "jasper" %*
