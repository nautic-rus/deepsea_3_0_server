const express = require('express');
const authMiddleware = require('./middleware/auth');
const ChatController = require('./controllers/chatController');
const { swaggerUi, swaggerSpec } = require('./swagger');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.use('/api-docs', swaggerUi.serve);
router.get('/api-docs', swaggerUi.setup(swaggerSpec));
router.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

router.use('/api/chat', authMiddleware);

router.post('/api/chat/rooms', ChatController.createRoom);
router.get('/api/chat/rooms', ChatController.listRooms);
router.get('/api/chat/rooms/:roomId', ChatController.getRoom);
router.delete('/api/chat/rooms/:roomId', ChatController.deleteRoom);
router.get('/api/chat/rooms/:roomId/members', ChatController.listMembers);
router.post('/api/chat/rooms/:roomId/invite', ChatController.invite);
router.post('/api/chat/rooms/:roomId/join', ChatController.join);
router.post('/api/chat/rooms/:roomId/leave', ChatController.leave);
router.post('/api/chat/rooms/:roomId/roles', ChatController.updateMemberRole);
router.post('/api/chat/rooms/:roomId/kick', ChatController.kickMember);
router.post('/api/chat/rooms/:roomId/messages', ChatController.sendMessage);
router.get('/api/chat/rooms/:roomId/messages', ChatController.listMessages);
router.post('/api/chat/rooms/:roomId/files', ChatController.sendFiles);
router.post('/api/chat/rooms/:roomId/messages/:eventId/edit', ChatController.editMessage);
router.delete('/api/chat/rooms/:roomId/messages/:eventId', ChatController.deleteMessage);
router.post('/api/chat/rooms/:roomId/messages/:eventId/reactions', ChatController.addReaction);
router.delete('/api/chat/rooms/:roomId/messages/:eventId/reactions', ChatController.removeReaction);
router.post('/api/chat/rooms/:roomId/read_markers', ChatController.setReadMarker);
router.post('/api/chat/read_markers/all', ChatController.markAllRead);
router.patch('/api/chat/rooms/:roomId/preferences', ChatController.updateRoomPreferences);
router.get('/api/chat/sync', ChatController.sync);
router.get('/api/chat/stream', ChatController.stream);
router.get('/api/chat/users/roles', ChatController.listSystemRoles);
router.get('/api/chat/users/:userId/role', ChatController.getSystemRole);
router.put('/api/chat/users/:userId/role', ChatController.setSystemRole);

module.exports = router;
