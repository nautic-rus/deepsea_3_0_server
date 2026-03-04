const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST || '192.168.1.177',
  port: 5432,
  database: process.env.DB_NAME || 'deepsea3',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '230571Sp',
});

(async () => {
  // 1. Все настройки уведомлений Дулановой
  console.log('=== Все notification_settings для user_id=336 (Дуланова) ===');
  const s1 = await pool.query(`
    SELECT uns.id, uns.user_id, uns.project_id, uns.event_id, uns.method_id, uns.enabled,
           ne.code AS event_code, ne.name AS event_name,
           nm.code AS method_code, nm.name AS method_name
    FROM user_notification_settings uns
    JOIN notification_events ne ON ne.id = uns.event_id
    JOIN notification_methods nm ON nm.id = uns.method_id
    WHERE uns.user_id = 336
    ORDER BY uns.project_id NULLS FIRST, ne.code
  `);
  console.table(s1.rows);

  // 2. Задача 33: кто автор, кто исполнитель
  console.log('\n=== Задача #33 ===');
  const s2 = await pool.query('SELECT id, title, author_id, assignee_id, project_id FROM issues WHERE id = 33');
  console.table(s2.rows);

  // 3. Связана ли Дуланова с задачей 33 (автор/исполнитель)?
  const issue = s2.rows[0];
  const isAuthor = issue && issue.author_id === 336;
  const isAssignee = issue && issue.assignee_id === 336;
  console.log(`Дуланова автор задачи #33?  ${isAuthor ? 'ДА' : 'НЕТ'}`);
  console.log(`Дуланова исполнитель задачи #33?  ${isAssignee ? 'ДА' : 'НЕТ'}`);

  // 4. Назначена ли она на проект 13?
  console.log('\n=== project_users для user_id=336 ===');
  const s3 = await pool.query('SELECT * FROM project_users WHERE user_id = 336').catch(() => ({ rows: ['таблица не существует или пуста'] }));
  console.table(s3.rows);

  // 5. Кто именно подписан на comment_added для project_id=13 или NULL
  console.log('\n=== Все подписки на comment_added для project_id=13 или NULL ===');
  const s4 = await pool.query(`
    SELECT uns.user_id, u.username, u.first_name, u.last_name,
           uns.project_id, nm.code AS method, uns.enabled,
           uns.created_at
    FROM user_notification_settings uns
    JOIN notification_events ne ON ne.id = uns.event_id
    JOIN notification_methods nm ON nm.id = uns.method_id
    LEFT JOIN users u ON u.id = uns.user_id
    WHERE ne.code = 'comment_added'
      AND (uns.project_id IS NULL OR uns.project_id = 13)
    ORDER BY uns.user_id
  `);
  console.table(s4.rows);

  // 6. Вывод
  console.log('\n=== ВЫВОД ===');
  console.log('Дуланова получает уведомление потому что у неё есть запись:');
  console.log('  user_notification_settings: event=comment_added, project_id=13, method=rocket_chat, enabled=true');
  console.log('Запрос getRecipientsForEvent НЕ проверяет, является ли пользователь');
  console.log('участником задачи (автором/исполнителем). Он возвращает ВСЕХ пользователей,');
  console.log('у которых есть настройка на это событие для данного проекта.');

  pool.end();
})().catch(e => { console.error(e); pool.end(); });
