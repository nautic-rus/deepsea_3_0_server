const EventEmitter = require('events');

class CacheInvalidator extends EventEmitter {
  invalidate(entity, info = {}) {
    // entity: string (table name or key), info: optional metadata
    try {
      this.emit('invalidate', String(entity).toLowerCase(), info);
    } catch (e) {
      // swallow errors from listeners
    }
  }

  invalidateAll(info = {}) {
    this.invalidate('all', info);
  }
}

module.exports = new CacheInvalidator();
