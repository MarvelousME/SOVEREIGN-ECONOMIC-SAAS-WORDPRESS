'use strict';

const { EventEmitter } = require('events');

/** Broadcasts env file changes to SSE subscribers and fs.watch. */
module.exports = new EventEmitter();
module.exports.setMaxListeners(100);
