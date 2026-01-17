-- Seed notification events (idempotent)
-- These are example events used to trigger notifications. Adjust or extend as needed.

INSERT INTO public.notification_events (code, name, description)
VALUES
  ('issue_created', 'Issue created', 'A new issue was created in a project'),
  ('issue_updated', 'Issue updated', 'An existing issue was updated'),
  ('comment_added', 'Comment added', 'A comment was added to an issue or document'),
  ('document_uploaded', 'Document uploaded', 'A new document was uploaded to a project'),
  ('user_mentioned', 'User mentioned', 'A user was mentioned in a comment or message'),
  ('project_invite', 'Project invite', 'A user was invited to a project'),
  ('task_assigned', 'Task assigned', 'A task/issue was assigned to a user'),
  ('status_changed', 'Status changed', 'The status of an issue or task changed'),
  ('deadline_changed', 'Deadline changed', 'The due date or deadline of an item was changed')
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description;

-- Check contents
SELECT * FROM public.notification_events ORDER BY id;
