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
      url: 'http://localhost:3100',
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
        responses: { 200: { description: 'Room list' } }
      }
    },
    '/api/chat/rooms/{roomId}': {
      get: {
        summary: 'Get room',
        parameters: [{ name: 'roomId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Room details' } }
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
    '/api/chat/sync': {
      get: {
        summary: 'Incremental room sync',
        parameters: [
          { name: 'since', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } }
        ],
        responses: { 200: { description: 'Sync response' } }
      }
    }
  }
};

module.exports = {
  swaggerUi,
  swaggerSpec: spec
};
