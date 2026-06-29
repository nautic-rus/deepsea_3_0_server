# `/api/specification_versions/{id}/import_parts`

Метод импортирует позиции спецификации в `specification_parts` для выбранной версии спецификации.

## Назначение

Эндпоинт нужен для загрузки строк спецификации из внешнего источника, а затем для нормализации и сохранения этих строк в локальную таблицу `specification_parts`.

Импорт выполняется для конкретной версии спецификации и всегда привязан к:

1. `specification_version_id`
2. `specification_id`
3. `project_id` спецификации
4. набору коннекторов, привязанных к спецификации

## Запрос

- `POST /api/specification_versions/{id}/import_parts`
- `Authorization: Bearer <token>`
- Права: `specifications.update`

### Path parameter

| Параметр | Тип | Описание |
| --- | --- | --- |
| `id` | integer | ID версии спецификации |

### Body

Метод принимает JSON-объект.

Основное поле:

| Поле | Тип | Описание |
| --- | --- | --- |
| `update_current_by_part_oid` | boolean | Если `true`, импорт обновляет существующие строки по `part_oid`, а не только добавляет новые |
| `use_default_part_code` | boolean | Если `true`, при отсутствии `row.part_code` используется `equipment_materials_projects.part_code_def` из привязки материала к проекту. Если `false`, значение из `part_code_def` игнорируется |

Также сервис может принять уже готовый payload внешнего источника. Если в теле запроса переданы `rows`, `items`, `data.rows`, `data.items`, `result.rows` или `result.items`, то внешний fetch пропускается, и эти данные нормализуются напрямую.

## Что делает метод

1. Проверяет аутентификацию.
2. Проверяет право `specifications.update`.
3. Проверяет, что версия спецификации существует.
4. Проверяет, что у версии есть связанная спецификация и проект.
5. Проверяет, что версия не заблокирована.
6. Загружает все коннекторы спецификации.
7. Оставляет только те строки, где есть:
   - `source_connector`
   - `project_connector`
   - `data_connector.oid`
8. Определяет ветку импорта по `source_connector.code`.
9. Формирует URL внешнего запроса.
10. Получает внешний payload или использует payload из тела запроса.
11. Нормализует строки в формат `specification_parts`.
12. Ищет материалы по `stock_code`.
13. Рассчитывает `quantity`.
14. Сохраняет строки в транзакции.
15. Если включён `update_current_by_part_oid`, обновляет совпадающие строки по `part_oid`.
16. Если `use_default_part_code = false`, не использует `equipment_materials_projects.part_code_def` как fallback для `part_code`.
17. После успешного импорта обновляет метаданные версии.

## Ветвление по источнику

Сервис различает несколько веток импорта:

| Код source connector | Ветка | URL |
| --- | --- | --- |
| `block_oid` | `blocks` | `/api/oracle/{project_code}/blocks` |
| `as_oid` | `astructure` | `/api/oracle/{project_code}/astructure` |
| `system_oid` | `systems` | `/api/oracle/{schemaName}/parts-by-system-oid?system_oid={oid}` |
| `equip_by_system_oid` | `equip_by_system_oid` | `/api/oracle/{schemaName}/equipment-by-system-oid?system_oid={oid}&filter={eq_type}&mechanical={eq_mech}` |
| `equip_by_zone_oid` | `equip_by_zone_oid` | `/api/oracle/{schemaName}/equipment-by-zone-oid?zone_oid={oid}&filter={eq_type}&mechanical={eq_mech}` |
| `tray_by_system_oid` | `tray_by_system_oid` | `/api/oracle/{schemaName}/tray-by-system-oid?system_oid={oid}` |
| `tray_by_zone_oid` | `tray_by_zone_oid` | `/api/oracle/{schemaName}/tray-by-zone-oid?zone_oid={oid}` |
| `cable_by_system_oid` | `cable_by_system_oid` | `/api/oracle/{schemaName}/cable-by-system-oid?system_oid={oid}` |
| `cable_by_zone_oid` | `cable_by_zone_oid` | `/api/oracle/{schemaName}/cable-by-zone-oid?zone_oid={oid}` |

Для `equip_by_system_oid` и `equip_by_zone_oid` параметры `filter` и `mechanical` берутся из `specifications_data_connector.eq_type` и `specifications_data_connector.eq_mech`.

Для `tray_by_system_oid` и `tray_by_zone_oid` эти параметры не используются.

Для `cable_by_system_oid` и `cable_by_zone_oid` дополнительные query-параметры тоже не используются.

Если `eq_type` или `eq_mech` пустые, соответствующий query-параметр в запрос не добавляется.

## Общая логика нормализации

После получения внешнего payload каждая строка проходит нормализацию.

Для импорта строка должна успешно пройти несколько проверок:

1. Должен существовать материал, связанный со `stock_code`.
2. Должны быть заполнены обязательные поля COG:
   - `COG_X`
   - `COG_Y`
   - `COG_Z`
3. Для конкретной ветки должен успешно рассчитаться `quantity`.

Если строка не проходит проверку, она не сохраняется, а попадает в `report` с причиной отказа.

## Как формируются `zone` и `zone_id`

Поле `zone` берётся из payload в зависимости от ветки:

- `astructure`: `ZONE`
- `systems`: `ZONEUSERID`
- `equip_by_system_oid` и `equip_by_zone_oid`: `ZONE_USERID`
- `tray_by_system_oid` и `tray_by_zone_oid`: `ZONE`
- `cable_by_system_oid` и `cable_by_zone_oid`: составное значение из `FROM_ZONE_USERID` и `TO_ZONE_USERID`

Поле `zone_id` определяется по `zones.code` внутри того же проекта спецификации:

1. Берётся значение зоны из источника.
2. Выполняется поиск в `zones` по:
   - `zones.project_id = project_id` спецификации
   - `zones.code = source zone`
3. Если найдено совпадение, в `specification_parts.zone_id` сохраняется `zones.id`.
4. Если совпадение не найдено, в `specification_parts.zone_id` сохраняется `null`.

## Как формируется `quantity`

Это самая важная часть импорта. Логика зависит от ветки источника и от `unit_id` материала.

### 1. `blocks`

Используется legacy-логика.

Исходные значения:

- `row.quantity`
- `row.total_weight`, заполняется из `WEIGHT_UNIT`
- `row.num_eq_part`
- `row.length`
- `material.unit_id`
- `material.weight`

Правила:

1. Если `unit_id = 2`
   - `quantity = total_weight`
   - если `total_weight` отсутствует, сервис временно подставляет `row.quantity` для отчёта
   - такая строка помечается как не полностью рассчитанная и не импортируется
2. Если `unit_id = 1`
   - `quantity = num_eq_part`
   - если `num_eq_part` отсутствует, сервис временно подставляет `row.quantity` для отчёта
   - такая строка помечается как не полностью рассчитанная и не импортируется
3. Если `unit_id = 3`
   - `quantity = length / 1000`
   - если `length` отсутствует, сервис временно подставляет `row.quantity` для отчёта
   - такая строка помечается как не полностью рассчитанная и не импортируется
4. Для остальных единиц
   - если есть `total_weight` и у материала задан `material.weight > 0`, то
     `quantity = total_weight / material.weight`
   - если есть только `total_weight`, то `quantity = total_weight`
   - если нет и этого, сервис временно подставляет `row.quantity` для отчёта

Для ветки `blocks` дополнительно забирается `SYMMETRY` и сохраняется в `specification_parts.symmetry`, если поле присутствует во внешнем payload.
Если `unit_id = 3`, значение `LENGTH` приводится к метрам через деление на `1000` перед сохранением и расчётом `quantity`.

Важно:

- если расчёт получился с fallback-значением, строка не сохраняется;
- в отчёте она будет отмечена с причиной, почему quantity пришлось брать не из целевого правила.

### 2. `astructure`

Используются поля:

- `row.total_weight`
- `row.length`
- `material.unit_id`
- `material.weight`

Правила:

1. Если `unit_id = 2`
   - `quantity = total_weight`
   - если `total_weight` отсутствует, сервис временно подставляет `1` для отчёта
2. Если `unit_id = 1`
   - `quantity = 1`
3. Если `unit_id = 3`
   - `quantity = length`
   - если `length` отсутствует, сервис временно подставляет `1` для отчёта
4. Для остальных единиц
   - если есть `total_weight` и `material.weight > 0`, то `quantity = total_weight / material.weight`
   - иначе сервис временно подставляет `1` для отчёта

Важно:

- если расчёт не смог использовать целевое значение и ушёл в fallback, строка не сохраняется;
- это позволяет не импортировать сомнительные данные без корректной основы для quantity.

### 3. `systems`

Используется только `row.length` и `material.unit_id`.

Для `part_code` в этой ветке используется только `SPOOLID` из payload.

Правила:

1. Если `unit_id = 3`
   - `quantity = length`
   - если `length` отсутствует, строка не импортируется
2. Для всех остальных единиц
   - `quantity = 1`

Особенность:

- для `systems` fallback `1` считается нормальным и строка сохраняется;
- это означает, что для системных строк количество обычно не вычисляется из payload, а задаётся как одна позиция.

### 4. `equip_by_system_oid` и `equip_by_zone_oid`

Для equipment-веток количество всегда:

- `quantity = 1`

То есть:

1. Каждая строка оборудования считается одной единицей.
2. Значения из payload не используются для расчёта quantity.
3. Строка сохраняется только после прохождения остальных проверок:
   - наличие материала
   - наличие COG
   - корректная нормализация строки

### 5. `tray_by_system_oid` и `tray_by_zone_oid`

Для tray-веток:

1. `part_type` всегда записывается как `TRAY`.
2. Если `unit_id = 3`, `quantity` берется из `LENGTH`.
3. Во всех остальных случаях `quantity` рассчитывается из `WEIGHT` и веса материала.

### 6. `cable_by_system_oid` и `cable_by_zone_oid`

Для cable-веток:

1. `part_type` всегда записывается как `CABLE`.
2. `part_code` берётся из `CODE`.
3. `part_oid` берётся из `SEQID`.
4. `stock_code` берётся из `STOCK_CODE`.
5. Если `unit_id = 3`, `quantity` берётся из `LENGTH`.
6. Если `unit_id = 1`, `quantity = 1`.
7. Для остальных единиц строка попадает в `report`, потому что для кабельного payload нет данных для корректного пересчёта количества.

## Что ещё важно знать

### `part_oid` и режим обновления

Если `update_current_by_part_oid = true`, импорт пытается:

1. найти уже существующие строки в `specification_parts`
2. сопоставить их по `part_oid`
3. обновить найденные строки вместо вставки дублей

Если режим выключен, старые строки этой версии и соответствующего источника удаляются, а затем импортируются заново.

### `qty` и `quantity`

При сохранении используются два значения:

- `quantity` - основное вычисленное количество
- `qty` - дополнительное значение из payload, если оно есть, в том числе `num_eq_part`

При расчёте и проверке импорта основным является именно `quantity`.

### Результат метода

В ответе возвращается:

- `imported_count`
- `report_summary`
- `report`
- `data`
- `source`

`report` полезен для диагностики строк, которые не были импортированы.

## Пример

```http
POST /api/specification_versions/123/import_parts
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "update_current_by_part_oid": true,
  "use_default_part_code": false
}
```

## Кратко

Если нужно запомнить только главное:

1. Метод импортирует части в версию спецификации.
2. Источник определяется по `specifications_source_connector.code`.
3. Для `equip_by_*` в URL добавляются `filter` и `mechanical` из `specifications_data_connector.eq_type` и `eq_mech`.
4. Для `tray_by_*` используются только `system_oid` или `zone_oid`.
5. `quantity` считается по ветке импорта и `unit_id`.
6. Если quantity не удалось корректно вычислить, строка не сохраняется.
