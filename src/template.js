'use strict';

const fs = require('fs');
const { join } = require('path');

const { promisify } = require('bluebird');
const { template } = require('lodash');

const readFile = promisify(fs.readFile);

function createTemplateLoader(dir) {
  return name => loadTemplate(dir, name);
}

function loadTemplate(dir, name) {
  const path = join(dir, name);
  const options = {};
  return readFile(`${path}.tpl`, 'utf8').then(str => template(str, options));
}

module.exports = {
  createTemplateLoader,
  loadTemplate
};
