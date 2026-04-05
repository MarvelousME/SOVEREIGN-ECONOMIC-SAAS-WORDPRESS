'use strict';

const { EventEmitter } = require('events');

/** Broadcast env file changes to SSE clients + fs.watch. */
class EnvEditorEvents extends EventEmitter {}
module.exports = new EnvEditorEvents();
