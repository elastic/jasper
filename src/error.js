'use strict';

function sendError(robot, res, err) {
  const msg = '[error] I screwed up... no idea how to handle this one:';
  if (robot.adapterName === 'slack') {
    robot.emit('slack-attachment', {
      attachments: [{ text: err.stack }],
      message: res.message,
      text: msg
    });
  } else {
    res.send(`${msg}\n${err.stack}`);
  }
}

module.exports = {
  sendError
};
