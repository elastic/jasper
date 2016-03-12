# J.A.S.P.E.R.

**Just A Simply Productive Elastic Robot**

Because I wanted it to be an acronym so badly.

Jasper is a robot to automate common workflows at Elastic. Tell jasper what to
do on slack or on github. It's built on [hubot](https://hubot.github.com).

## Running jasper locally

Jasper assumes a node.js version of at least 5.8, and it's configured for nvm:

Make sure you have the correct version installed:

```sh
% nvm install
```

If you know you have the correct version, make sure you're using it:

```sh
% nvm use
```

Install the dependencies:

```sh
% npm install
```

Start up the hubot shell:

```sh
% npm start
```

Then you can interact with jasper by typing `jasper help`.

```
jasper> jasper help
jasper help - Displays all of the help commands that jasper knows about.
...
```

## Accessing Github

Jasper shines when it's interacting with github, but it can only do that on
behalf of an existing github user. To allow jasper to access github as a user,
log into that user on github and grab a personal access token from the personal
settings section. Jasper needs access to the `repo` scope.

You'll need to throw that token into a `.github-access.json` file at the root
of the jasper repo:

```
{
  "token": "yourpersonaltoken"
}
```

NOTE: This token will grant jasper read/write access to all public and private
repos that you have access to.
