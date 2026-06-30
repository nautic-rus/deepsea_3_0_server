const swaggerUi = require('swagger-ui-express');

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'DeepSea Chat API',
    version: '1.0.0',
    description: 'Standalone Matrix-like chat service for DeepSea'
  },
  servers: [
    {
      url: 'https://v3.deep-sea.ru',
      description: 'Local chat service'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      ChatRoomCreateRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          topic: { type: 'string' },
          visibility: { type: 'string', enum: ['private', 'public'] },
          is_direct: { type: 'boolean' },
          member_user_ids: {
            type: 'array',
            items: { type: 'integer' }
          }
        }
      },
      ChatMessageRequest: {
        type: 'object',
        required: ['body'],
        properties: {
          body: { type: 'string' },
          msgtype: { type: 'string', example: 'm.text' },
          relates_to: { type: 'object' }
        }
      },
      ChatFileMessageRequest: {
        type: 'object',
        required: ['files'],
        properties: {
          body: { type: 'string' },
          files: {
            type: 'array',
            items: {
              type: 'object',
              required: ['storage_id', 'file_name'],
              properties: {
                storage_id: { type: 'integer' },
                file_name: { type: 'string' },
                file_size: { type: 'integer' },
                mime_type: { type: 'string' },
                url: { type: 'string' },
                bucket_name: { type: 'string' },
                object_key: { type: 'string' }
              }
            }
          }
        }
      },
      ChatReactionRequest: {
        type: 'object',
        required: ['key'],
        properties: {
          key: { type: 'string', example: '👍' }
        }
      },
      ChatEditRequest: {
        type: 'object',
        required: ['body'],
        properties: {
          body: { type: 'string' },
          msgtype: { type: 'string', example: 'm.text' }
        }
      },
      ChatReadMarkerRequest: {
        type: 'object',
        required: ['event_id'],
        properties: {
          event_id: { type: 'string' }
        }
      },
      ChatMemberRoleRequest: {
        type: 'object',
        required: ['user_id', 'role'],
        properties: {
          user_id: { type: 'integer' },
          role: { type: 'string', enum: ['owner', 'admin', 'member'] }
        }
      },
      ChatKickRequest: {
        type: 'object',
        required: ['user_id'],
        properties: {
          user_id: { type: 'integer' }
        }
      },
      ChatSystemRoleRequest: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { type: 'string', enum: ['admin', 'user'] }
        }
      },
      ChatRoomPreferencesRequest: {
        type: 'object',
        properties: {
          is_hidden: { type: 'boolean' },
          is_favorite: { type: 'boolean' }
        }
      }
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/chat/rooms': {
      post: {
        summary: 'Create chat room',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChatRoomCreateRequest' }
            }
          }
        },
        responses: { 201: { description: 'Room created' } }
      },
      get: {
        summary: 'List my rooms',
        parameters: [
          { name: 'include_hidden', in: 'query', schema: { type: 'boolean' } }
        ],
        responses: { 200: { description: 'Room list' } }
      }
    },
    '/api/chat/rooms/{roomId}': {
      get: {
        summary: 'Get room',
        parameters: [{ name: 'roomId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Room details' } }
      },
      delete: {
        summary: 'Delete room permanently',
        parameters: [{ name: 'roomId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Room deleted' } }
      }
    },
    '/api/chat/rooms/{roomId}/members': {
      get: {
        summary: 'List room members',
        parameters: [{ name: 'roomId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Room members' } }
      }
    },
    '/api/chat/rooms/{roomId}/invite': {
      post: {
        summary: 'Invite user to room',
        parameters: [{ name: 'roomId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['user_id'],
                properties: { user_id: { type: 'integer' } }
              }
            }
          }
        },
        responses: { 201: { description: 'Invite event created' } }
      }
    },
    '/api/chat/rooms/{roomId}/join': {
      post: {
        summary: 'Join room',
        parameters: [{ name: 'roomId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 201: { description: 'Join event created' } }
      }
    },
    '/api/chat/rooms/{roomId}/leave': {
      post: {
        summary: 'Leave room',
        parameters: [{ name: 'roomId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Leave event created' } }
      }
    },
    '/api/chat/rooms/{roomId}/roles': {
      post: {
        summary: 'Change participant role in room',
        parameters: [{ name: 'roomId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChatMemberRoleRequest' }
            }
          }
        },
        responses: { 200: { description: 'Role updated' } }
      }
    },
    '/api/chat/rooms/{roomId}/kick': {
      post: {
        summary: 'Kick participant from room',
        parameters: [{ name: 'roomId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChatKickRequest' }
            }
          }
        },
        responses: { 200: { description: 'Participant kicked' } }
      }
    },
    '/api/chat/rooms/{roomId}/messages': {
      post: {
        summary: 'Send text message',
        parameters: [{ name: 'roomId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChatMessageRequest' }
            }
          }
        },
        responses: { 201: { description: 'Message event created' } }
      },
      get: {
        summary: 'List room messages',
        parameters: [
          { name: 'roomId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'before', in: 'query', schema: { type: 'integer' } },
          { name: 'after', in: 'query', schema: { type: 'integer' } }
        ],
        responses: { 200: { description: 'Message timeline' } }
      }
    },
    '/api/chat/rooms/{roomId}/files': {
      post: {
        summary: 'Send file attachment message',
        parameters: [{ name: 'roomId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChatFileMessageRequest' }
            }
          }
        },
        responses: { 201: { description: 'File message created' } }
      }
    },
    '/api/chat/rooms/{roomId}/messages/{eventId}/edit': {
      post: {
        summary: 'Edit message',
        parameters: [
          { name: 'roomId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'eventId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChatEditRequest' }
            }
          }
        },
        responses: { 201: { description: 'Edit event created' } }
      }
    },
    '/api/chat/rooms/{roomId}/messages/{eventId}': {
      delete: {
        summary: 'Delete message',
        parameters: [
          { name: 'roomId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'eventId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Redaction event created' } }
      }
    },
    '/api/chat/rooms/{roomId}/messages/{eventId}/reactions': {
      post: {
        summary: 'Add reaction to message',
        parameters: [
          { name: 'roomId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'eventId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChatReactionRequest' }
            }
          }
        },
        responses: { 201: { description: 'Reaction event created' } }
      },
      delete: {
        summary: 'Remove own reaction from message',
        parameters: [
          { name: 'roomId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'eventId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'key', in: 'query', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Reaction removed' } }
      }
    },
    '/api/chat/rooms/{roomId}/read_markers': {
      post: {
        summary: 'Set read marker',
        parameters: [{ name: 'roomId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChatReadMarkerRequest' }
            }
          }
        },
        responses: { 200: { description: 'Read marker updated' } }
      }
    },
    '/api/chat/rooms/{roomId}/preferences': {
      patch: {
        summary: 'Update room preferences for current user',
        parameters: [{ name: 'roomId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChatRoomPreferencesRequest' }
            }
          }
        },
        responses: { 200: { description: 'Room preferences updated' } }
      }
    },
    '/api/chat/sync': {
      get: {
        summary: 'Incremental room sync',
        parameters: [
          { name: 'since', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } }
        ],
        responses: { 200: { description: 'Sync response' } }
      }
    },
    '/api/chat/users/roles': {
      get: {
        summary: 'List chat system roles',
        responses: { 200: { description: 'System roles list' } }
      }
    },
    '/api/chat/users/{userId}/role': {
      get: {
        summary: 'Get chat system role for user',
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'User system role' } }
      },
      put: {
        summary: 'Set chat system role for user',
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChatSystemRoleRequest' }
            }
          }
        },
        responses: { 200: { description: 'User system role updated' } }
      }
    }
  }
};

module.exports = {
  swaggerUi,
  swaggerSpec: spec
};
