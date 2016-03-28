// Description:
//   Set up template loader

'use strict';

const { resolve } = require('path');
const { createTemplateLoader } = require('../src/template');

module.exports = robot => {
  const dir = resolve(__dirname, '..', 'templates');
  robot.template = createTemplateLoader(dir);
};
