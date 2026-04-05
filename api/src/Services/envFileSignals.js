'use strict';

const { EventEmitter } = require('events');

/** Broadcasts env-file changes to SSE clients (debounced writes + fs.watch). */
class EnvFileSignals extends EventEmitter {}
module.exports = new EnvFileSignals();
