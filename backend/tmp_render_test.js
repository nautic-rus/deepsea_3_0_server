const S = require('./src/api/services/notificationTemplateService');

(async () => {
  const ctx = {
    project: { code: 'PRJ' },
    issue: { id: 44, title: 'СИСТЕМА ТОПЛИВНАЯ. ТРУБОПРОВОД ПОДАЧИ ТОПЛИВА К ИНСИНЕРАТОРУ' },
    actor: { first_name: 'Иван', last_name: 'Иванов' },
    changes: {
      before: {"id":44,"title":"СИСТЕМА ТОПЛИВНАЯ. ТРУБОПРОВОД ПОДАЧИ ТОПЛИВА К ИНСИНЕРАТОРУ ","description":"","comment":null,"project_id":1,"stage_id":1,"status_id":4,"type_id":2,"specialization_id":3,"directory_id":51,"assigne_to":null,"created_by":341,"is_active":true,"created_at":"2026-02-25T12:21:04.285Z","updated_at":"2026-02-27T06:29:26.452Z","code":"200101-701-008СБ","priority":"medium","due_date":"2026-02-02T21:00:00.000Z","estimated_hours":8},
      after: {"id":44,"title":"СИСТЕМА ТОПЛИВНАЯ. ТРУБОПРОВОД ПОДАЧИ ТОПЛИВА К ИНСИНЕРАТОРУ ","description":"","comment":null,"project_id":1,"stage_id":1,"status_id":4,"type_id":2,"specialization_id":3,"directory_id":51,"assigne_to":null,"created_by":341,"is_active":true,"created_at":"2026-02-25T12:21:04.285Z","updated_at":"2026-02-27T06:31:05.682Z","code":"200101-701-008СБ","priority":"low","due_date":"2026-02-02T21:00:00.000Z","estimated_hours":8}
    }
  };

  const res = await S.render('issue_updated', 'rocket_chat', ctx);
  console.log('\n=== RENDERED TEXT ===\n');
  console.log(res.text);
})();
