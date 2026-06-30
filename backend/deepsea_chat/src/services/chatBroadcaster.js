const clientsByUserId = new Map();
let heartbeatTimer = null;

function normalizeUserId(userId) {
  const id = Number(userId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function writeSse(res, eventName, payload) {
  if (res.writableEnded || res.destroyed) return false;
  if (eventName) {
    res.write(`event: ${eventName}\n`);
  }
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
  return true;
}

function removeClient(userId, res) {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return;

  const clients = clientsByUserId.get(normalizedUserId);
  if (!clients) return;

  clients.delete(res);
  if (clients.size === 0) {
    clientsByUserId.delete(normalizedUserId);
  }
}

function ensureHeartbeat() {
  if (heartbeatTimer) return;

  heartbeatTimer = setInterval(() => {
    for (const [userId, clients] of clientsByUserId.entries()) {
      if (!clients || clients.size === 0) {
        clientsByUserId.delete(userId);
        continue;
      }

      for (const res of clients) {
        if (res.writableEnded || res.destroyed) {
          removeClient(userId, res);
          continue;
        }
        res.write(': ping\n\n');
      }
    }
  }, 25000);

  heartbeatTimer.unref();
}

class ChatBroadcaster {
  static register(userId, res) {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId) {
      throw new Error('Invalid user id');
    }

    if (!clientsByUserId.has(normalizedUserId)) {
      clientsByUserId.set(normalizedUserId, new Set());
    }

    clientsByUserId.get(normalizedUserId).add(res);
    ensureHeartbeat();

    writeSse(res, 'connected', {
      ok: true,
      user_id: normalizedUserId,
      connected_at: new Date().toISOString()
    });

    const cleanup = () => removeClient(normalizedUserId, res);
    res.on('close', cleanup);
    res.on('finish', cleanup);

    return cleanup;
  }

  static sendToUser(userId, eventName, payload) {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId) return 0;

    const clients = clientsByUserId.get(normalizedUserId);
    if (!clients || clients.size === 0) return 0;

    let delivered = 0;
    for (const res of clients) {
      if (writeSse(res, eventName, payload)) {
        delivered += 1;
      } else {
        removeClient(normalizedUserId, res);
      }
    }
    return delivered;
  }

  static sendToUsers(userIds, eventName, payload) {
    const uniqueUserIds = [...new Set((Array.isArray(userIds) ? userIds : []).map(normalizeUserId).filter(Boolean))];
    let delivered = 0;
    for (const userId of uniqueUserIds) {
      delivered += this.sendToUser(userId, eventName, payload);
    }
    return delivered;
  }

  static hasClients(userId) {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId) return false;
    const clients = clientsByUserId.get(normalizedUserId);
    return Boolean(clients && clients.size > 0);
  }
}

module.exports = ChatBroadcaster;
