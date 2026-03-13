-- Add project-level document notification events
INSERT INTO public.notification_events (code, name, description, status, created_at)
SELECT 'document_created_in_project', 'Document created in project', 'Notify project participants when a document is created in a project they participate in', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.notification_events WHERE code = 'document_created_in_project');

INSERT INTO public.notification_events (code, name, description, status, created_at)
SELECT 'document_updated_in_project', 'Document updated in project', 'Notify project participants when a document is updated in a project they participate in', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.notification_events WHERE code = 'document_updated_in_project');

INSERT INTO public.notification_events (code, name, description, status, created_at)
SELECT 'document_uploaded_in_project', 'Document file uploaded in project', 'Notify project participants when a file is uploaded to a document in a project they participate in', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.notification_events WHERE code = 'document_uploaded_in_project');
