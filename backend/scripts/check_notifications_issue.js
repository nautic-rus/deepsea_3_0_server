#!/usr/bin/env node
/**
 * Диагностический скрипт: кто получит уведомления (Rocket.Chat / Email)
 * при добавлении комментария к задаче.
 *
 * Использование:
 *   node scripts/check_notifications_issue.js [issue_id]
 *
 * По умолчанию issue_id = 33
 *
 * Переменные окружения для подключения к БД:
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 */

const { Pool } = require('pg');

const ISSUE_ID = Number(process.argv[2]) || 33;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'deepsea',
  user: process.env.DB_USER || 'deepsea',
  password: process.env.DB_PASSWORD || 'Ship123',
});

// ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(80));
  console.log(`  Проверка уведомлений при комментарии к задаче #${ISSUE_ID}`);
  console.log('='.repeat(80));

  // 1. Получаем задачу
  const issueRes = await pool.query(`
    SELECT i.id, i.title, i.project_id, i.assignee_id, i.author_id, i.status_id, i.is_active,
           p.code AS project_code, p.name AS project_name
    FROM issues i
    LEFT JOIN projects p ON p.id = i.project_id
    WHERE i.id = $1
  `, [ISSUE_ID]);

  if (issueRes.rows.length === 0) {
    console.error(`\n❌ Задача #${ISSUE_ID} не найдена!\n`);
    process.exit(1);
  }
  const issue = issueRes.rows[0];

  console.log(`\n📋 Задача: #${issue.id} — ${issue.title}`);
  console.log(`   Проект: ${issue.project_code || '—'} (id=${issue.project_id}, ${issue.project_name || '—'})`);
  console.log(`   Автор (author_id): ${issue.author_id || 'NULL'}`);
  console.log(`   Исполнитель (assignee_id): ${issue.assignee_id || 'NULL'}`);
  console.log(`   Активна: ${issue.is_active}`);

  // Получим имена автора и исполнителя
  if (issue.author_id) {
    const authorRes = await pool.query(`SELECT id, username, first_name, last_name, email FROM users WHERE id = $1`, [issue.author_id]);
    if (authorRes.rows.length) {
      const a = authorRes.rows[0];
      console.log(`   → Автор: ${a.first_name} ${a.last_name} (${a.username}, email: ${a.email})`);
    }
  }
  if (issue.assignee_id) {
    const assigneeRes = await pool.query(`SELECT id, username, first_name, last_name, email FROM users WHERE id = $1`, [issue.assignee_id]);
    if (assigneeRes.rows.length) {
      const a = assigneeRes.rows[0];
      console.log(`   → Исполнитель: ${a.first_name} ${a.last_name} (${a.username}, email: ${a.email})`);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // 2. Путь 1: прямые уведомления (user_notifications) для author и assignee
  // ──────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(80));
  console.log('📨  ПУТЬ 1: Прямые user_notifications (assignee + author задачи)');
  console.log('─'.repeat(80));
  console.log('   Логика: уведомляются assignee и author, если они не являются автором комментария.');
  console.log('   (Автор комментария = actor, который мы НЕ знаем в этом скрипте — покажем обоих)\n');

  const directRecipients = [];
  if (issue.assignee_id) directRecipients.push({ role: 'assignee', user_id: issue.assignee_id });
  if (issue.author_id && issue.author_id !== issue.assignee_id) directRecipients.push({ role: 'author', user_id: issue.author_id });

  if (directRecipients.length === 0) {
    console.log('   ⚠️  Нет прямых получателей (assignee_id и author_id пустые)');
  } else {
    for (const r of directRecipients) {
      console.log(`   ✅ user_id=${r.user_id} (роль: ${r.role})`);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // 3. Путь 2: уведомления через настройки (user_notification_settings)
  //    — это Rocket.Chat и Email
  // ──────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(80));
  console.log('📨  ПУТЬ 2: Уведомления по настройкам (Rocket.Chat / Email)');
  console.log('─'.repeat(80));

  // 3a. Проверим, существует ли событие comment_added
  const eventRes = await pool.query(`SELECT id, code, name FROM notification_events WHERE code = 'comment_added'`);
  if (eventRes.rows.length === 0) {
    console.log('\n   ❌ Событие "comment_added" НЕ НАЙДЕНО в таблице notification_events!');
    console.log('   Уведомления по настройкам НЕ будут отправлены.\n');
  } else {
    const event = eventRes.rows[0];
    console.log(`\n   Событие: "${event.code}" (id=${event.id}, name=${event.name})`);
  }

  // 3b. Проверим notification_methods
  const methodsRes = await pool.query(`SELECT id, code, name FROM notification_methods ORDER BY id`);
  console.log('\n   Доступные методы уведомлений:');
  for (const m of methodsRes.rows) {
    console.log(`     id=${m.id}  code="${m.code}"  name="${m.name}"`);
  }

  // 3c. Выполняем тот же запрос что и getRecipientsForEvent
  console.log('\n   Выполняем запрос getRecipientsForEvent(project_id=' + issue.project_id + ', "comment_added")...');

  const recipientsQuery = `
    SELECT uns.user_id, uns.project_id AS setting_project_id, uns.enabled,
           nm.code AS method_code, nm.name AS method_name,
           urc.rc_username, urc.rc_user_id,
           u.email, u.username, u.first_name, u.last_name, u.is_active AS user_is_active
    FROM public.user_notification_settings uns
    JOIN public.notification_methods nm ON nm.id = uns.method_id
    LEFT JOIN public.user_rocket_chat urc ON urc.user_id = uns.user_id
    LEFT JOIN public.users u ON u.id = uns.user_id
    WHERE uns.enabled = true
      AND uns.event_id = (SELECT id FROM public.notification_events WHERE code = $2 LIMIT 1)
      AND (uns.project_id IS NULL OR uns.project_id = $1)
    ORDER BY uns.user_id, nm.code
  `;

  const recipientsRes = await pool.query(recipientsQuery, [issue.project_id, 'comment_added']);

  if (recipientsRes.rows.length === 0) {
    console.log('\n   ⚠️  Нет получателей! Запрос вернул 0 строк.');
    console.log('   Возможные причины:');
    console.log('     — Нет записей в user_notification_settings с event "comment_added" и enabled=true');
    console.log('     — Нет записей с project_id=NULL или project_id=' + issue.project_id);
  } else {
    console.log(`\n   Найдено ${recipientsRes.rows.length} запис(ей) в настройках:\n`);

    const rocketRecipients = [];
    const emailRecipients = [];

    for (const r of recipientsRes.rows) {
      const scope = r.setting_project_id === null ? 'ГЛОБАЛЬНАЯ' : `проект id=${r.setting_project_id}`;
      const userName = `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.username || '?';

      console.log(`   👤 user_id=${r.user_id}  ${userName}  (${r.username})`);
      console.log(`      Метод: ${r.method_code} (${r.method_name})`);
      console.log(`      Область настройки: ${scope}`);
      console.log(`      Пользователь активен: ${r.user_is_active}`);

      if (r.method_code === 'rocket_chat') {
        console.log(`      RC username: ${r.rc_username || 'НЕ ЗАДАН'}`);
        console.log(`      RC user_id: ${r.rc_user_id || 'НЕ ЗАДАН'}`);
        if (!r.rc_username && !r.rc_user_id) {
          console.log(`      ⚠️  ПРОБЛЕМА: Не сможет получить Rocket.Chat уведомление — нет маппинга!`);
        }
        rocketRecipients.push(r);
      } else if (r.method_code === 'email') {
        console.log(`      Email: ${r.email || 'НЕ ЗАДАН'}`);
        if (!r.email) {
          console.log(`      ⚠️  ПРОБЛЕМА: Не сможет получить Email уведомление — email пустой!`);
        }
        emailRecipients.push(r);
      } else {
        console.log(`      ⚠️  Неизвестный метод: ${r.method_code}`);
      }
      console.log('');
    }

    // Итоговая сводка
    console.log('─'.repeat(80));
    console.log('📊  СВОДКА');
    console.log('─'.repeat(80));

    console.log(`\n   🚀 Rocket.Chat — ${rocketRecipients.length} получател(ей):`);
    if (rocketRecipients.length === 0) console.log('      (нет)');
    for (const r of rocketRecipients) {
      const name = `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.username;
      const dest = r.rc_username ? `@${r.rc_username}` : (r.rc_user_id || '❌ нет маппинга');
      console.log(`      user_id=${r.user_id}  ${name}  →  ${dest}`);
    }

    console.log(`\n   ✉️  Email — ${emailRecipients.length} получател(ей):`);
    if (emailRecipients.length === 0) console.log('      (нет)');
    for (const r of emailRecipients) {
      const name = `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.username;
      console.log(`      user_id=${r.user_id}  ${name}  →  ${r.email || '❌ нет email'}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // 4. Дополнительная диагностика: все настройки для comment_added
  // ──────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(80));
  console.log('🔍  ДОПОЛНИТЕЛЬНО: ВСЕ настройки для события "comment_added" (включая disabled)');
  console.log('─'.repeat(80));

  const allSettingsRes = await pool.query(`
    SELECT uns.user_id, uns.project_id, uns.enabled,
           nm.code AS method_code,
           u.username, u.first_name, u.last_name, u.is_active AS user_is_active
    FROM public.user_notification_settings uns
    JOIN public.notification_methods nm ON nm.id = uns.method_id
    LEFT JOIN public.users u ON u.id = uns.user_id
    WHERE uns.event_id = (SELECT id FROM public.notification_events WHERE code = 'comment_added' LIMIT 1)
    ORDER BY uns.user_id, uns.project_id NULLS FIRST, nm.code
  `);

  if (allSettingsRes.rows.length === 0) {
    console.log('\n   Нет ни одной настройки для события "comment_added" в БД.\n');
  } else {
    console.log(`\n   Всего ${allSettingsRes.rows.length} настроек:\n`);
    console.log('   ' + 'user_id'.padEnd(10) + 'username'.padEnd(20) + 'ФИО'.padEnd(25) + 'project_id'.padEnd(13) + 'method'.padEnd(15) + 'enabled'.padEnd(10) + 'user_active');
    console.log('   ' + '─'.repeat(100));
    for (const r of allSettingsRes.rows) {
      const name = `${r.first_name || ''} ${r.last_name || ''}`.trim();
      const projId = r.project_id === null ? 'NULL (глоб)' : String(r.project_id);
      console.log('   ' +
        String(r.user_id).padEnd(10) +
        (r.username || '').padEnd(20) +
        name.padEnd(25) +
        projId.padEnd(13) +
        r.method_code.padEnd(15) +
        String(r.enabled).padEnd(10) +
        String(r.user_is_active)
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // 5. Проверка: пользователи, назначенные на проект задачи
  // ──────────────────────────────────────────────────────────────────
  if (issue.project_id) {
    console.log('\n' + '─'.repeat(80));
    console.log(`🔍  Пользователи, назначенные на проект id=${issue.project_id} (${issue.project_code})`);
    console.log('─'.repeat(80));

    // Пробуем найти таблицу project_users или аналог
    const projectUsersRes = await pool.query(`
      SELECT pu.user_id, u.username, u.first_name, u.last_name, u.email, u.is_active
      FROM project_users pu
      JOIN users u ON u.id = pu.user_id
      WHERE pu.project_id = $1
      ORDER BY u.last_name, u.first_name
    `, [issue.project_id]).catch(() => ({ rows: [] }));

    if (projectUsersRes.rows.length === 0) {
      console.log('\n   (Таблица project_users пустая или не существует для этого проекта)');
    } else {
      console.log(`\n   Найдено ${projectUsersRes.rows.length} пользователей на проекте:\n`);
      for (const u of projectUsersRes.rows) {
        const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
        // Проверим, есть ли у этого пользователя настройка на comment_added
        const hasSetting = recipientsRes.rows.some(r => r.user_id === u.user_id);
        const marker = hasSetting ? '✅ есть настройка уведомлений' : '⚠️  НЕТ настройки уведомлений для comment_added';
        console.log(`   user_id=${u.user_id}  ${name} (${u.username})  active=${u.is_active}  —  ${marker}`);
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // 6. Проверка маппинга Rocket.Chat для всех пользователей проекта
  // ──────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(80));
  console.log('🔍  Маппинг Rocket.Chat (user_rocket_chat) для пользователей проекта');
  console.log('─'.repeat(80));

  const rcMappingRes = await pool.query(`
    SELECT urc.user_id, urc.rc_username, urc.rc_user_id,
           u.username, u.first_name, u.last_name
    FROM user_rocket_chat urc
    JOIN users u ON u.id = urc.user_id
    ORDER BY urc.user_id
  `).catch(() => ({ rows: [] }));

  if (rcMappingRes.rows.length === 0) {
    console.log('\n   Таблица user_rocket_chat пустая или не существует.\n');
  } else {
    console.log(`\n   Всего ${rcMappingRes.rows.length} маппингов:\n`);
    for (const r of rcMappingRes.rows) {
      const name = `${r.first_name || ''} ${r.last_name || ''}`.trim();
      console.log(`   user_id=${r.user_id}  ${name} (${r.username})  →  rc_username=${r.rc_username || 'NULL'}  rc_user_id=${r.rc_user_id || 'NULL'}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // 7. Потенциальные проблемы
  // ──────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(80));
  console.log('⚡  ПОТЕНЦИАЛЬНЫЕ ПРОБЛЕМЫ');
  console.log('─'.repeat(80));

  const problems = [];

  // Проблема: дублирование уведомлений (глобальная + проектная настройка)
  if (recipientsRes.rows.length > 0) {
    const userMethods = {};
    for (const r of recipientsRes.rows) {
      const key = `${r.user_id}_${r.method_code}`;
      if (!userMethods[key]) userMethods[key] = [];
      userMethods[key].push(r.setting_project_id);
    }
    for (const [key, projects] of Object.entries(userMethods)) {
      if (projects.length > 1) {
        const [uid, method] = key.split('_');
        problems.push(`ДУБЛЬ: user_id=${uid} получит ${projects.length} уведомлений через ${method} (настройки для project_id: ${projects.map(p => p === null ? 'NULL' : p).join(', ')})`);
      }
    }
  }

  // Проблема: Rocket.Chat без маппинга
  if (recipientsRes.rows.length > 0) {
    for (const r of recipientsRes.rows) {
      if (r.method_code === 'rocket_chat' && !r.rc_username && !r.rc_user_id) {
        problems.push(`RC БЕЗ МАППИНГА: user_id=${r.user_id} (${r.username}) — настройка на rocket_chat, но нет записи в user_rocket_chat`);
      }
    }
  }

  // Проблема: email пустой
  if (recipientsRes.rows.length > 0) {
    for (const r of recipientsRes.rows) {
      if (r.method_code === 'email' && !r.email) {
        problems.push(`EMAIL ПУСТ: user_id=${r.user_id} (${r.username}) — настройка на email, но email пользователя пустой`);
      }
    }
  }

  // Проблема: неактивный пользователь
  if (recipientsRes.rows.length > 0) {
    for (const r of recipientsRes.rows) {
      if (r.user_is_active === false) {
        problems.push(`НЕАКТИВНЫЙ: user_id=${r.user_id} (${r.username}) — пользователь деактивирован, но имеет настройку уведомлений`);
      }
    }
  }

  // Код в issuesService.js НЕ фильтрует по проекту пользователей — уведомление
  // может уйти пользователю, который НЕ назначен на проект задачи
  // (getRecipientsForEvent возвращает всех с project_id=NULL или project_id=<project>)

  if (problems.length === 0) {
    console.log('\n   ✅ Явных проблем не обнаружено.\n');
  } else {
    console.log('');
    for (const p of problems) {
      console.log(`   ⚠️  ${p}`);
    }
    console.log('');
  }

  console.log('='.repeat(80));
  console.log('  Готово.');
  console.log('='.repeat(80));
}

main()
  .catch((err) => {
    console.error('Ошибка:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
