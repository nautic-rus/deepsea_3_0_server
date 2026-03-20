-- Migration: 017_populate_sfi_codes.sql
-- Add multilingual columns to sfi_codes and populate all SFI codes with RU/EN descriptions
-- SFI (Ship's Functional Index) - standard classification system for ship equipment

BEGIN;

-- 1. Add multilingual columns if not exist
ALTER TABLE public.sfi_codes
  ADD COLUMN IF NOT EXISTS name_ru VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description_ru TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT;

-- 2. Create/truncate temp helper to insert with parent lookup
-- Insert top-level groups (level 1) first, then subgroups

-- ============================================================
-- LEVEL 1 — Main Groups
-- ============================================================

INSERT INTO public.sfi_codes (code, name, name_ru, name_en, description_ru, description_en, parent_id, level, order_index)
VALUES
  ('0',  'Hull',                               'Корпус',                                        'Hull',                                        'Корпусные конструкции судна',                                             'Ship hull structures',                                           NULL, 1, 0),
  ('1',  'General Systems',                    'Общесудовые системы',                           'General Systems',                             'Общесудовые системы и оборудование',                                     'General ship systems and equipment',                             NULL, 1, 1),
  ('2',  'Cargo Handling',                     'Грузовое оборудование',                         'Cargo Handling',                              'Системы и оборудование для грузовых операций',                           'Cargo operation systems and equipment',                          NULL, 1, 2),
  ('3',  'Accommodation',                      'Жилые помещения',                               'Accommodation',                               'Жилые и общественные помещения, бытовые системы',                        'Living quarters, public spaces, hotel systems',                  NULL, 1, 3),
  ('4',  'Machinery Main Components',          'Главные механизмы',                             'Machinery Main Components',                   'Главные двигатели и движительный комплекс',                              'Main engines and propulsion system',                             NULL, 1, 4),
  ('5',  'Machinery Systems',                  'Вспомогательные механизмы и системы',           'Machinery Systems',                           'Вспомогательные механизмы и судовые системы',                           'Auxiliary machinery and ship systems',                           NULL, 1, 5),
  ('6',  'Ship Control Systems',               'Системы управления судном',                     'Ship Control Systems',                        'Навигационное и управляющее оборудование',                               'Navigation and ship control equipment',                          NULL, 1, 6),
  ('7',  'Safety Systems',                     'Системы безопасности',                          'Safety Systems',                              'Системы обеспечения безопасности судна и экипажа',                       'Ship and crew safety systems',                                   NULL, 1, 7),
  ('8',  'Electrical Systems',                 'Электрические системы',                         'Electrical Systems',                          'Электрогенерирующее и электрораспределительное оборудование',            'Power generation and distribution equipment',                    NULL, 1, 8),
  ('9',  'Instrumentation and Automation',     'Контрольно-измерительное оборудование и АСУ',  'Instrumentation and Automation',              'Контрольно-измерительные системы и системы автоматизации',               'Instrumentation, monitoring and automation systems',             NULL, 1, 9)
ON CONFLICT (code) DO UPDATE SET
  name      = EXCLUDED.name,
  name_ru   = EXCLUDED.name_ru,
  name_en   = EXCLUDED.name_en,
  description_ru = EXCLUDED.description_ru,
  description_en = EXCLUDED.description_en,
  level     = EXCLUDED.level,
  order_index = EXCLUDED.order_index;

-- ============================================================
-- LEVEL 2 — Sub-Groups of Group 0 (Hull)
-- ============================================================

INSERT INTO public.sfi_codes (code, name, name_ru, name_en, description_ru, description_en, parent_id, level, order_index)
VALUES
  ('01', 'Foundations and Structure',          'Основания и конструкции',                       'Foundations and Structure',                   'Фундаментные конструкции и силовые элементы корпуса',                    'Foundation structures and hull structural elements',             (SELECT id FROM public.sfi_codes WHERE code='0'), 2, 0),
  ('02', 'Shell and Watertight Bulkheads',     'Обшивка и водонепроницаемые переборки',         'Shell and Watertight Bulkheads',               'Наружная обшивка и водонепроницаемые переборки',                         'Outer shell plating and watertight bulkheads',                   (SELECT id FROM public.sfi_codes WHERE code='0'), 2, 1),
  ('03', 'Superstructure and Deckhouses',      'Надстройки и рубки',                            'Superstructure and Deckhouses',               'Надстройки, рубки и надпалубные конструкции',                            'Superstructures, deckhouses and above-deck structures',          (SELECT id FROM public.sfi_codes WHERE code='0'), 2, 2),
  ('04', 'Decks',                              'Палубы',                                        'Decks',                                       'Палубные покрытия и настилы',                                            'Deck coverings and plating',                                     (SELECT id FROM public.sfi_codes WHERE code='0'), 2, 3),
  ('05', 'Masts and Rigging',                  'Мачты и такелаж',                               'Masts and Rigging',                           'Мачты, стрелы и такелаж',                                                'Masts, booms and rigging',                                       (SELECT id FROM public.sfi_codes WHERE code='0'), 2, 4),
  ('06', 'Hull Outfitting',                    'Корпусное насыщение',                           'Hull Outfitting',                             'Корпусное насыщение и фурнитура',                                        'Hull fittings and outfitting',                                   (SELECT id FROM public.sfi_codes WHERE code='0'), 2, 5),
  ('07', 'Rudder and Steering Gear (Hull)',    'Рулевое устройство (корпусная часть)',          'Rudder and Steering Gear (Hull)',             'Рулевое устройство, балансирная часть',                                  'Rudder structure and balanced rudder',                           (SELECT id FROM public.sfi_codes WHERE code='0'), 2, 6),
  ('08', 'Anchoring and Mooring (Hull)',       'Якорно-швартовное оборудование (корпус)',       'Anchoring and Mooring (Hull)',                'Якорные клюзы, цепные ящики, кнехты (корпусная часть)',                 'Hawsepipes, chain lockers, bitts (hull part)',                   (SELECT id FROM public.sfi_codes WHERE code='0'), 2, 7)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en,
  description_ru=EXCLUDED.description_ru, description_en=EXCLUDED.description_en,
  parent_id=EXCLUDED.parent_id, level=EXCLUDED.level, order_index=EXCLUDED.order_index;

-- ============================================================
-- LEVEL 2 — Sub-Groups of Group 1 (General Systems)
-- ============================================================

INSERT INTO public.sfi_codes (code, name, name_ru, name_en, description_ru, description_en, parent_id, level, order_index)
VALUES
  ('10', 'Bilge and Ballast Systems',          'Осушительная и балластная системы',             'Bilge and Ballast Systems',                   'Системы осушения трюмов и балластные системы',                           'Bilge drainage and ballast water systems',                       (SELECT id FROM public.sfi_codes WHERE code='1'), 2, 0),
  ('11', 'Fire Extinguishing Systems',         'Системы пожаротушения',                         'Fire Extinguishing Systems',                  'Стационарные и переносные системы пожаротушения',                        'Fixed and portable fire extinguishing systems',                  (SELECT id FROM public.sfi_codes WHERE code='1'), 2, 1),
  ('12', 'Compressed Air Systems',             'Системы сжатого воздуха',                       'Compressed Air Systems',                      'Системы сжатого воздуха общесудового назначения',                        'General service compressed air systems',                         (SELECT id FROM public.sfi_codes WHERE code='1'), 2, 2),
  ('13', 'Hydraulic Systems',                  'Гидравлические системы',                        'Hydraulic Systems',                           'Общесудовые гидравлические системы',                                     'General ship hydraulic systems',                                 (SELECT id FROM public.sfi_codes WHERE code='1'), 2, 3),
  ('14', 'Fresh Water Systems',                'Системы пресной воды',                          'Fresh Water Systems',                         'Системы питьевой и технической пресной воды',                            'Drinking and technical fresh water systems',                     (SELECT id FROM public.sfi_codes WHERE code='1'), 2, 4),
  ('15', 'Sanitary Systems',                   'Санитарные системы',                            'Sanitary Systems',                            'Санитарные системы и сточные воды',                                      'Sanitary and sewage systems',                                    (SELECT id FROM public.sfi_codes WHERE code='1'), 2, 5),
  ('16', 'Ventilation and Air Conditioning',   'Вентиляция и кондиционирование',                'Ventilation and Air Conditioning',            'Системы вентиляции и кондиционирования воздуха',                         'Ventilation and air conditioning systems',                       (SELECT id FROM public.sfi_codes WHERE code='1'), 2, 6),
  ('17', 'Refrigeration Systems',              'Холодильные установки',                         'Refrigeration Systems',                       'Судовые холодильные установки провизионных камер',                       'Ship provision refrigeration systems',                           (SELECT id FROM public.sfi_codes WHERE code='1'), 2, 7),
  ('18', 'Heating Systems',                    'Системы отопления',                             'Heating Systems',                             'Системы парового и водяного отопления',                                  'Steam and hot water heating systems',                            (SELECT id FROM public.sfi_codes WHERE code='1'), 2, 8)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en,
  description_ru=EXCLUDED.description_ru, description_en=EXCLUDED.description_en,
  parent_id=EXCLUDED.parent_id, level=EXCLUDED.level, order_index=EXCLUDED.order_index;

-- ============================================================
-- LEVEL 2 — Sub-Groups of Group 2 (Cargo Handling)
-- ============================================================

INSERT INTO public.sfi_codes (code, name, name_ru, name_en, description_ru, description_en, parent_id, level, order_index)
VALUES
  ('20', 'Cargo Holds',                        'Грузовые трюмы',                                'Cargo Holds',                                 'Грузовые трюмы и трюмные помещения',                                     'Cargo holds and hold spaces',                                    (SELECT id FROM public.sfi_codes WHERE code='2'), 2, 0),
  ('21', 'Cargo Cranes and Derricks',          'Грузовые краны и стрелы',                       'Cargo Cranes and Derricks',                   'Судовые грузовые краны и грузовые стрелы',                               'Ship cargo cranes and derricks',                                 (SELECT id FROM public.sfi_codes WHERE code='2'), 2, 1),
  ('22', 'Cargo Pumps and Piping',             'Грузовые насосы и трубопроводы',                'Cargo Pumps and Piping',                      'Грузовые насосы и трубопроводные системы',                               'Cargo pumps and pipeline systems',                               (SELECT id FROM public.sfi_codes WHERE code='2'), 2, 2),
  ('23', 'Cargo Refrigeration',                'Охлаждение груза',                              'Cargo Refrigeration',                         'Системы охлаждения грузовых помещений',                                  'Cargo space refrigeration systems',                              (SELECT id FROM public.sfi_codes WHERE code='2'), 2, 3),
  ('24', 'Cargo Tank Venting',                 'Вентиляция грузовых танков',                    'Cargo Tank Venting',                          'Системы вентиляции и инертного газа для грузовых танков',               'Cargo tank ventilation and inert gas systems',                   (SELECT id FROM public.sfi_codes WHERE code='2'), 2, 4),
  ('25', 'Cargo Monitoring',                   'Контроль груза',                                'Cargo Monitoring',                            'Системы контроля и измерения груза',                                     'Cargo monitoring and measurement systems',                       (SELECT id FROM public.sfi_codes WHERE code='2'), 2, 5),
  ('26', 'Cargo Heating and Cooling',          'Подогрев и охлаждение груза',                   'Cargo Heating and Cooling',                   'Системы подогрева и охлаждения груза при перевозке',                     'Cargo heating and cooling during transport',                     (SELECT id FROM public.sfi_codes WHERE code='2'), 2, 6),
  ('27', 'Special Cargo Equipment',            'Специальное грузовое оборудование',             'Special Cargo Equipment',                     'Специализированное оборудование для перевозки определённых грузов',      'Specialised equipment for specific cargoes',                     (SELECT id FROM public.sfi_codes WHERE code='2'), 2, 7)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en,
  description_ru=EXCLUDED.description_ru, description_en=EXCLUDED.description_en,
  parent_id=EXCLUDED.parent_id, level=EXCLUDED.level, order_index=EXCLUDED.order_index;

-- ============================================================
-- LEVEL 2 — Sub-Groups of Group 3 (Accommodation)
-- ============================================================

INSERT INTO public.sfi_codes (code, name, name_ru, name_en, description_ru, description_en, parent_id, level, order_index)
VALUES
  ('30', 'Crew Cabins',                        'Каюты экипажа',                                 'Crew Cabins',                                 'Каюты и каютное оборудование экипажа',                                   'Crew cabins and cabin equipment',                                (SELECT id FROM public.sfi_codes WHERE code='3'), 2, 0),
  ('31', 'Public Spaces',                      'Общественные помещения',                        'Public Spaces',                               'Салоны, столовые и общественные помещения',                               'Lounges, mess rooms and public spaces',                          (SELECT id FROM public.sfi_codes WHERE code='3'), 2, 1),
  ('32', 'Galley and Pantry',                  'Камбуз и провиантская',                         'Galley and Pantry',                           'Камбуз, провиантская кладовая и оборудование приготовления пищи',       'Galley, provision store and food preparation equipment',         (SELECT id FROM public.sfi_codes WHERE code='3'), 2, 2),
  ('33', 'Hospital and Medical',               'Медицинские помещения',                         'Hospital and Medical',                        'Лазарет и медицинское оборудование',                                     'Sick bay and medical equipment',                                 (SELECT id FROM public.sfi_codes WHERE code='3'), 2, 3),
  ('34', 'Sanitary Spaces',                    'Санитарные помещения',                          'Sanitary Spaces',                             'Туалеты, душевые и санитарные блоки',                                    'Toilets, showers and sanitary units',                            (SELECT id FROM public.sfi_codes WHERE code='3'), 2, 4),
  ('35', 'Laundry',                            'Прачечная',                                     'Laundry',                                     'Прачечная и оборудование для стирки',                                    'Laundry and washing equipment',                                  (SELECT id FROM public.sfi_codes WHERE code='3'), 2, 5),
  ('36', 'Interior Furnishings',               'Внутренняя отделка и мебель',                   'Interior Furnishings',                        'Внутренняя отделка, облицовки и мебель',                                 'Interior finishes, linings and furniture',                       (SELECT id FROM public.sfi_codes WHERE code='3'), 2, 6),
  ('37', 'Recreational Facilities',            'Объекты отдыха',                                'Recreational Facilities',                     'Оборудование для отдыха и развлечений экипажа',                          'Crew recreation and entertainment equipment',                    (SELECT id FROM public.sfi_codes WHERE code='3'), 2, 7)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en,
  description_ru=EXCLUDED.description_ru, description_en=EXCLUDED.description_en,
  parent_id=EXCLUDED.parent_id, level=EXCLUDED.level, order_index=EXCLUDED.order_index;

-- ============================================================
-- LEVEL 2 — Sub-Groups of Group 4 (Machinery Main Components)
-- ============================================================

INSERT INTO public.sfi_codes (code, name, name_ru, name_en, description_ru, description_en, parent_id, level, order_index)
VALUES
  ('40', 'Main Engine',                        'Главный двигатель',                             'Main Engine',                                 'Главный судовой двигатель (ДВС или турбина)',                             'Main ship engine (ICE or turbine)',                              (SELECT id FROM public.sfi_codes WHERE code='4'), 2, 0),
  ('41', 'Gearbox and Clutch',                 'Редуктор и муфта',                              'Gearbox and Clutch',                          'Редуктор, муфты и валопровод',                                           'Reduction gear, clutches and shaft line',                        (SELECT id FROM public.sfi_codes WHERE code='4'), 2, 1),
  ('42', 'Shafting and Bearings',              'Гребной вал и подшипники',                      'Shafting and Bearings',                       'Гребной вал, дейдвудная труба и подшипники',                             'Propeller shaft, stern tube and bearings',                       (SELECT id FROM public.sfi_codes WHERE code='4'), 2, 2),
  ('43', 'Propeller',                          'Гребной винт',                                  'Propeller',                                   'Гребной винт фиксированного или регулируемого шага',                     'Fixed pitch or controllable pitch propeller',                    (SELECT id FROM public.sfi_codes WHERE code='4'), 2, 3),
  ('44', 'Thrusters',                          'Подруливающие устройства',                      'Thrusters',                                   'Носовые и кормовые подруливающие устройства',                            'Bow and stern thrusters',                                        (SELECT id FROM public.sfi_codes WHERE code='4'), 2, 4),
  ('45', 'Azimuth Propulsors',                 'Азимутальные движители',                        'Azimuth Propulsors',                          'Поворотные колонки типа Azipod и аналоги',                               'Azimuth drive units (Azipod and equivalent)',                    (SELECT id FROM public.sfi_codes WHERE code='4'), 2, 5),
  ('46', 'Fuel Oil System for Main Engine',    'Система топлива ГД',                            'Fuel Oil System for Main Engine',             'Система топливоподготовки и топливоподачи главного двигателя',           'Fuel conditioning and supply system for main engine',            (SELECT id FROM public.sfi_codes WHERE code='4'), 2, 6),
  ('47', 'Lubricating Oil System for Main Engine', 'Система смазки ГД',                        'Lubricating Oil System for Main Engine',      'Система смазки и охлаждения поршней главного двигателя',                'Lubrication and piston cooling system for main engine',          (SELECT id FROM public.sfi_codes WHERE code='4'), 2, 7),
  ('48', 'Cooling Water System for Main Engine', 'Система охлаждения ГД',                      'Cooling Water System for Main Engine',        'Система охлаждения главного двигателя',                                  'Main engine cooling water system',                               (SELECT id FROM public.sfi_codes WHERE code='4'), 2, 8),
  ('49', 'Starting and Control for Main Engine', 'Пуск и управление ГД',                       'Starting and Control for Main Engine',        'Системы пуска и дистанционного управления главным двигателем',           'Starting and remote control systems for main engine',            (SELECT id FROM public.sfi_codes WHERE code='4'), 2, 9)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en,
  description_ru=EXCLUDED.description_ru, description_en=EXCLUDED.description_en,
  parent_id=EXCLUDED.parent_id, level=EXCLUDED.level, order_index=EXCLUDED.order_index;

-- ============================================================
-- LEVEL 2 — Sub-Groups of Group 5 (Machinery Systems)
-- ============================================================

INSERT INTO public.sfi_codes (code, name, name_ru, name_en, description_ru, description_en, parent_id, level, order_index)
VALUES
  ('50', 'Auxiliary Engines and Generators',   'Вспомогательные дизель-генераторы',             'Auxiliary Engines and Generators',            'Вспомогательные дизель-генераторные агрегаты',                           'Auxiliary diesel generating sets',                               (SELECT id FROM public.sfi_codes WHERE code='5'), 2, 0),
  ('51', 'Boilers and Steam Systems',          'Котлы и паровые системы',                       'Boilers and Steam Systems',                   'Судовые котлы и системы пара',                                           'Ship boilers and steam systems',                                 (SELECT id FROM public.sfi_codes WHERE code='5'), 2, 1),
  ('52', 'Pumps and Piping Systems',           'Насосы и трубопроводные системы',               'Pumps and Piping Systems',                    'Вспомогательные насосы и судовые трубопроводные системы',               'Auxiliary pumps and ship piping systems',                        (SELECT id FROM public.sfi_codes WHERE code='5'), 2, 2),
  ('53', 'Heat Exchangers',                    'Теплообменники',                                'Heat Exchangers',                             'Теплообменники и охладители вспомогательного оборудования',              'Heat exchangers and coolers for auxiliary equipment',            (SELECT id FROM public.sfi_codes WHERE code='5'), 2, 3),
  ('54', 'Separators',                         'Сепараторы',                                    'Separators',                                  'Топливные и масляные сепараторы',                                        'Fuel and lubricating oil separators',                            (SELECT id FROM public.sfi_codes WHERE code='5'), 2, 4),
  ('55', 'Compressors',                        'Компрессоры',                                   'Compressors',                                 'Воздушные и газовые компрессоры',                                        'Air and gas compressors',                                        (SELECT id FROM public.sfi_codes WHERE code='5'), 2, 5),
  ('56', 'Air Receivers and Accumulators',     'Воздушные ресиверы и аккумуляторы',             'Air Receivers and Accumulators',              'Воздушные ресиверы пусковые и рабочего давления',                        'Starting air receivers and working pressure receivers',          (SELECT id FROM public.sfi_codes WHERE code='5'), 2, 6),
  ('57', 'Sea Water Cooling System',           'Система забортного охлаждения',                 'Sea Water Cooling System',                    'Система забортного водяного охлаждения',                                 'Sea water cooling system',                                       (SELECT id FROM public.sfi_codes WHERE code='5'), 2, 7),
  ('58', 'Fuel Oil System (General)',          'Общая топливная система',                       'Fuel Oil System (General)',                   'Общесудовая система хранения и передачи топлива',                        'Ship-wide fuel oil storage and transfer system',                 (SELECT id FROM public.sfi_codes WHERE code='5'), 2, 8),
  ('59', 'Lubricating Oil System (General)',   'Общая масляная система',                        'Lubricating Oil System (General)',            'Общесудовая система хранения и передачи масла',                          'Ship-wide lubricating oil storage and transfer system',          (SELECT id FROM public.sfi_codes WHERE code='5'), 2, 9)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en,
  description_ru=EXCLUDED.description_ru, description_en=EXCLUDED.description_en,
  parent_id=EXCLUDED.parent_id, level=EXCLUDED.level, order_index=EXCLUDED.order_index;

-- ============================================================
-- LEVEL 2 — Sub-Groups of Group 6 (Ship Control Systems)
-- ============================================================

INSERT INTO public.sfi_codes (code, name, name_ru, name_en, description_ru, description_en, parent_id, level, order_index)
VALUES
  ('60', 'Navigation Equipment',               'Навигационное оборудование',                    'Navigation Equipment',                        'Навигационные приборы и оборудование',                                   'Navigation instruments and equipment',                           (SELECT id FROM public.sfi_codes WHERE code='6'), 2, 0),
  ('61', 'Steering Gear System',               'Рулевая машина и система',                      'Steering Gear System',                        'Рулевая машина и система управления рулём',                              'Steering gear and rudder control system',                        (SELECT id FROM public.sfi_codes WHERE code='6'), 2, 1),
  ('62', 'Autopilot and Course Control',       'Авторулевой и управление курсом',               'Autopilot and Course Control',                'Система авторулевого и контроля курса',                                  'Autopilot and course keeping system',                            (SELECT id FROM public.sfi_codes WHERE code='6'), 2, 2),
  ('63', 'Dynamic Positioning',                'Динамическое позиционирование',                 'Dynamic Positioning',                         'Система динамического позиционирования (DP)',                             'Dynamic Positioning (DP) system',                                (SELECT id FROM public.sfi_codes WHERE code='6'), 2, 3),
  ('64', 'Bridge Equipment',                   'Оборудование мостика',                          'Bridge Equipment',                            'Комплекс оборудования ходового мостика',                                 'Integrated bridge system equipment',                             (SELECT id FROM public.sfi_codes WHERE code='6'), 2, 4),
  ('65', 'Communication Systems',              'Системы связи',                                 'Communication Systems',                       'Системы радиосвязи и внутрисудовой связи',                               'Radio and internal communication systems',                       (SELECT id FROM public.sfi_codes WHERE code='6'), 2, 5),
  ('66', 'ECDIS and Chart Systems',            'ЭКНИС и картографические системы',              'ECDIS and Chart Systems',                     'Электронная картографическая навигационно-информационная система',       'Electronic Chart Display and Information System',                (SELECT id FROM public.sfi_codes WHERE code='6'), 2, 6),
  ('67', 'Radar Systems',                      'Радарные системы',                              'Radar Systems',                               'Навигационные и поисковые радарные системы',                             'Navigation and search radar systems',                            (SELECT id FROM public.sfi_codes WHERE code='6'), 2, 7),
  ('68', 'GPS and Positioning Systems',        'GPS и системы позиционирования',                'GPS and Positioning Systems',                 'Спутниковые системы позиционирования',                                   'Satellite positioning systems',                                  (SELECT id FROM public.sfi_codes WHERE code='6'), 2, 8)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en,
  description_ru=EXCLUDED.description_ru, description_en=EXCLUDED.description_en,
  parent_id=EXCLUDED.parent_id, level=EXCLUDED.level, order_index=EXCLUDED.order_index;

-- ============================================================
-- LEVEL 2 — Sub-Groups of Group 7 (Safety Systems)
-- ============================================================

INSERT INTO public.sfi_codes (code, name, name_ru, name_en, description_ru, description_en, parent_id, level, order_index)
VALUES
  ('70', 'Lifesaving Appliances',              'Спасательные средства',                         'Lifesaving Appliances',                       'Спасательные шлюпки, плоты и жилеты',                                   'Lifeboats, life rafts and lifejackets',                          (SELECT id FROM public.sfi_codes WHERE code='7'), 2, 0),
  ('71', 'Fire Detection and Alarm',           'Обнаружение пожара и сигнализация',             'Fire Detection and Alarm',                    'Системы обнаружения пожара и пожарной сигнализации',                     'Fire detection and alarm systems',                               (SELECT id FROM public.sfi_codes WHERE code='7'), 2, 1),
  ('72', 'Gas Detection Systems',              'Системы обнаружения газа',                      'Gas Detection Systems',                       'Системы обнаружения токсичных и взрывоопасных газов',                    'Toxic and flammable gas detection systems',                      (SELECT id FROM public.sfi_codes WHERE code='7'), 2, 2),
  ('73', 'Flooding Detection',                 'Обнаружение затопления',                        'Flooding Detection',                          'Системы обнаружения поступления воды',                                   'Water ingress detection systems',                                (SELECT id FROM public.sfi_codes WHERE code='7'), 2, 3),
  ('74', 'Emergency Lighting',                 'Аварийное освещение',                           'Emergency Lighting',                          'Аварийное и навигационное освещение',                                    'Emergency and navigation lighting',                              (SELECT id FROM public.sfi_codes WHERE code='7'), 2, 4),
  ('75', 'Emergency Generator',                'Аварийный генератор',                           'Emergency Generator',                         'Аварийный источник электроэнергии',                                      'Emergency source of electrical power',                           (SELECT id FROM public.sfi_codes WHERE code='7'), 2, 5),
  ('76', 'Damage Control Equipment',           'Оборудование для борьбы за живучесть',          'Damage Control Equipment',                    'Оборудование для борьбы за живучесть судна',                             'Equipment for ship damage control',                              (SELECT id FROM public.sfi_codes WHERE code='7'), 2, 6),
  ('77', 'Personal Protective Equipment',      'Средства индивидуальной защиты',                'Personal Protective Equipment',               'Средства индивидуальной защиты экипажа',                                 'Crew personal protective equipment',                             (SELECT id FROM public.sfi_codes WHERE code='7'), 2, 7),
  ('78', 'Oil Spill Prevention',               'Предотвращение разлива нефти',                  'Oil Spill Prevention',                        'Оборудование для предотвращения разлива нефти (МАРПОЛ)',                  'Oil pollution prevention equipment (MARPOL)',                    (SELECT id FROM public.sfi_codes WHERE code='7'), 2, 8)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en,
  description_ru=EXCLUDED.description_ru, description_en=EXCLUDED.description_en,
  parent_id=EXCLUDED.parent_id, level=EXCLUDED.level, order_index=EXCLUDED.order_index;

-- ============================================================
-- LEVEL 2 — Sub-Groups of Group 8 (Electrical Systems)
-- ============================================================

INSERT INTO public.sfi_codes (code, name, name_ru, name_en, description_ru, description_en, parent_id, level, order_index)
VALUES
  ('80', 'Main Switchboard',                   'Главный распределительный щит',                 'Main Switchboard',                            'Главный распределительный щит (ГРЩ)',                                    'Main switchboard (MSB)',                                         (SELECT id FROM public.sfi_codes WHERE code='8'), 2, 0),
  ('81', 'Power Distribution',                 'Распределение электроэнергии',                  'Power Distribution',                          'Система распределения электроэнергии по судну',                          'Ship-wide power distribution system',                            (SELECT id FROM public.sfi_codes WHERE code='8'), 2, 1),
  ('82', 'Shore Connection',                   'Береговое питание',                             'Shore Connection',                            'Системы подключения берегового питания',                                 'Shore power connection systems',                                 (SELECT id FROM public.sfi_codes WHERE code='8'), 2, 2),
  ('83', 'Battery Systems',                    'Аккумуляторные системы',                        'Battery Systems',                             'Аккумуляторные батареи и зарядные устройства',                           'Storage batteries and charging equipment',                       (SELECT id FROM public.sfi_codes WHERE code='8'), 2, 3),
  ('84', 'Lighting Systems',                   'Системы освещения',                             'Lighting Systems',                            'Системы рабочего и декоративного освещения',                             'General and decorative lighting systems',                        (SELECT id FROM public.sfi_codes WHERE code='8'), 2, 4),
  ('85', 'Cable Systems',                      'Кабельные системы',                             'Cable Systems',                               'Судовые кабельные трассы и кабельные системы',                           'Ship cable routes and cable systems',                            (SELECT id FROM public.sfi_codes WHERE code='8'), 2, 5),
  ('86', 'Motors and Drives',                  'Электродвигатели и приводы',                    'Motors and Drives',                           'Электродвигатели и частотно-регулируемые приводы',                       'Electric motors and variable speed drives',                      (SELECT id FROM public.sfi_codes WHERE code='8'), 2, 6),
  ('87', 'Earthing and Cathodic Protection',   'Заземление и катодная защита',                  'Earthing and Cathodic Protection',            'Система заземления и электрохимической защиты корпуса',                  'Earthing system and hull cathodic protection',                   (SELECT id FROM public.sfi_codes WHERE code='8'), 2, 7),
  ('88', 'Power Management System',            'Система управления электроэнергией',            'Power Management System',                     'Система управления распределением электроэнергии (PMS)',                  'Power Management System (PMS)',                                  (SELECT id FROM public.sfi_codes WHERE code='8'), 2, 8)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en,
  description_ru=EXCLUDED.description_ru, description_en=EXCLUDED.description_en,
  parent_id=EXCLUDED.parent_id, level=EXCLUDED.level, order_index=EXCLUDED.order_index;

-- ============================================================
-- LEVEL 2 — Sub-Groups of Group 9 (Instrumentation and Automation)
-- ============================================================

INSERT INTO public.sfi_codes (code, name, name_ru, name_en, description_ru, description_en, parent_id, level, order_index)
VALUES
  ('90', 'Alarm and Monitoring',               'Сигнализация и мониторинг',                     'Alarm and Monitoring',                        'Системы сигнализации и централизованного мониторинга',                   'Alarm and centralised monitoring systems',                       (SELECT id FROM public.sfi_codes WHERE code='9'), 2, 0),
  ('91', 'Control Systems',                    'Системы управления',                            'Control Systems',                             'Автоматизированные системы управления механизмами',                      'Automated machinery control systems',                            (SELECT id FROM public.sfi_codes WHERE code='9'), 2, 1),
  ('92', 'Sensors and Transducers',            'Датчики и преобразователи',                     'Sensors and Transducers',                     'Датчики, преобразователи и измерительные приборы',                       'Sensors, transducers and measurement instruments',               (SELECT id FROM public.sfi_codes WHERE code='9'), 2, 2),
  ('93', 'Integrated Automation System',       'Интегрированная система автоматизации',         'Integrated Automation System',                'Интегрированная система автоматизации судна (IAS)',                       'Integrated Automation System (IAS)',                             (SELECT id FROM public.sfi_codes WHERE code='9'), 2, 3),
  ('94', 'IT and Network Systems',             'ИТ-системы и сети',                             'IT and Network Systems',                      'Компьютерные сети и информационные системы судна',                       'Ship computer networks and information systems',                 (SELECT id FROM public.sfi_codes WHERE code='9'), 2, 4),
  ('95', 'Voyage Data Recorder',               'Регистратор данных рейса',                      'Voyage Data Recorder',                        'Регистратор данных рейса и внутренней переговорной связи (VDR)',          'VDR - Voyage Data Recorder and internal audio',                  (SELECT id FROM public.sfi_codes WHERE code='9'), 2, 5),
  ('96', 'Tank Level Gauging',                 'Измерение уровня в танках',                     'Tank Level Gauging',                          'Системы измерения уровня в цистернах и танках',                          'Tank level gauging and measurement systems',                     (SELECT id FROM public.sfi_codes WHERE code='9'), 2, 6),
  ('97', 'SCADA Systems',                      'Системы SCADA',                                 'SCADA Systems',                               'Системы диспетчерского управления и сбора данных',                       'Supervisory Control and Data Acquisition systems',               (SELECT id FROM public.sfi_codes WHERE code='9'), 2, 7)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en,
  description_ru=EXCLUDED.description_ru, description_en=EXCLUDED.description_en,
  parent_id=EXCLUDED.parent_id, level=EXCLUDED.level, order_index=EXCLUDED.order_index;

-- ============================================================
-- LEVEL 3 — Detail sub-groups (most important / commonly used)
-- ============================================================

-- Group 10x — Bilge and Ballast detail
INSERT INTO public.sfi_codes (code, name, name_ru, name_en, description_ru, description_en, parent_id, level, order_index)
VALUES
  ('100', 'Bilge System',                      'Осушительная система',                          'Bilge System',                                'Система осушения трюмов, льял и помещений',                               'Bilge drainage system for holds and spaces',                     (SELECT id FROM public.sfi_codes WHERE code='10'), 3, 0),
  ('101', 'Ballast System',                    'Балластная система',                            'Ballast System',                              'Система приёма, откачки и перекачки балласта',                           'Ballast water intake, discharge and transfer system',            (SELECT id FROM public.sfi_codes WHERE code='10'), 3, 1),
  ('102', 'Bilge/Ballast Pumps',               'Осушительные/балластные насосы',                'Bilge/Ballast Pumps',                         'Осушительные и балластные насосы',                                       'Bilge and ballast pumps',                                        (SELECT id FROM public.sfi_codes WHERE code='10'), 3, 2),
  ('103', 'Oily Water Separator',              'Сепаратор льяльных вод',                        'Oily Water Separator',                        'Сепаратор льяльных вод (15 ppm)',                                         'Oily water separator (15 ppm unit)',                             (SELECT id FROM public.sfi_codes WHERE code='10'), 3, 3)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en,
  description_ru=EXCLUDED.description_ru, description_en=EXCLUDED.description_en,
  parent_id=EXCLUDED.parent_id, level=EXCLUDED.level, order_index=EXCLUDED.order_index;

-- Group 11x — Fire extinguishing detail
INSERT INTO public.sfi_codes (code, name, name_ru, name_en, description_ru, description_en, parent_id, level, order_index)
VALUES
  ('110', 'Fire Main',                         'Пожарная магистраль',                           'Fire Main',                                   'Пожарная магистраль и пожарные гидранты',                                'Fire main piping and fire hydrants',                             (SELECT id FROM public.sfi_codes WHERE code='11'), 3, 0),
  ('111', 'CO2 System',                        'Система CO2',                                   'CO2 System',                                  'Стационарная система пожаротушения двуокисью углерода',                  'Fixed CO2 fire extinguishing system',                            (SELECT id FROM public.sfi_codes WHERE code='11'), 3, 1),
  ('112', 'Foam System',                       'Система пенотушения',                           'Foam System',                                 'Стационарная система пенотушения (AFFF)',                                 'Fixed foam fire extinguishing system (AFFF)',                    (SELECT id FROM public.sfi_codes WHERE code='11'), 3, 2),
  ('113', 'Water Mist System',                 'Система тонкораспылённой воды',                 'Water Mist System',                           'Система пожаротушения тонкораспылённой водой',                           'Water mist fire extinguishing system',                           (SELECT id FROM public.sfi_codes WHERE code='11'), 3, 3),
  ('114', 'Sprinkler System',                  'Спринклерная система',                          'Sprinkler System',                            'Автоматическая спринклерная система пожаротушения',                      'Automatic sprinkler fire extinguishing system',                  (SELECT id FROM public.sfi_codes WHERE code='11'), 3, 4),
  ('115', 'Portable Extinguishers',            'Переносные огнетушители',                       'Portable Extinguishers',                      'Переносные и передвижные огнетушители',                                  'Portable and wheeled fire extinguishers',                        (SELECT id FROM public.sfi_codes WHERE code='11'), 3, 5)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en,
  description_ru=EXCLUDED.description_ru, description_en=EXCLUDED.description_en,
  parent_id=EXCLUDED.parent_id, level=EXCLUDED.level, order_index=EXCLUDED.order_index;

-- Group 40x — Main Engine detail
INSERT INTO public.sfi_codes (code, name, name_ru, name_en, description_ru, description_en, parent_id, level, order_index)
VALUES
  ('400', 'Diesel Main Engine',                'Дизельный главный двигатель',                   'Diesel Main Engine',                          'Главный дизельный двигатель внутреннего сгорания',                       'Main diesel internal combustion engine',                         (SELECT id FROM public.sfi_codes WHERE code='40'), 3, 0),
  ('401', 'Gas Turbine',                       'Газовая турбина',                               'Gas Turbine',                                 'Газотурбинный главный двигатель',                                         'Gas turbine main engine',                                        (SELECT id FROM public.sfi_codes WHERE code='40'), 3, 1),
  ('402', 'Steam Turbine',                     'Паровая турбина',                               'Steam Turbine',                               'Паротурбинная установка',                                                 'Steam turbine propulsion plant',                                 (SELECT id FROM public.sfi_codes WHERE code='40'), 3, 2),
  ('403', 'Dual Fuel Engine',                  'Двухтопливный двигатель',                       'Dual Fuel Engine',                            'Двигатель, работающий на СПГ/дизельном топливе',                         'Engine operating on LNG/diesel fuel',                            (SELECT id FROM public.sfi_codes WHERE code='40'), 3, 3),
  ('404', 'Engine Foundation',                 'Фундамент главного двигателя',                  'Engine Foundation',                           'Фундамент и крепление главного двигателя',                               'Main engine bedplate and mounting',                              (SELECT id FROM public.sfi_codes WHERE code='40'), 3, 4),
  ('405', 'Turbocharger',                      'Турбонагнетатель',                              'Turbocharger',                                'Турбонагнетатель и система наддува главного двигателя',                  'Turbocharger and scavenging system for main engine',             (SELECT id FROM public.sfi_codes WHERE code='40'), 3, 5),
  ('406', 'Exhaust System',                    'Выхлопная система',                             'Exhaust System',                              'Выхлопная система и глушитель главного двигателя',                       'Exhaust system and silencer for main engine',                    (SELECT id FROM public.sfi_codes WHERE code='40'), 3, 6)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en,
  description_ru=EXCLUDED.description_ru, description_en=EXCLUDED.description_en,
  parent_id=EXCLUDED.parent_id, level=EXCLUDED.level, order_index=EXCLUDED.order_index;

-- Group 50x — Auxiliary engines detail
INSERT INTO public.sfi_codes (code, name, name_ru, name_en, description_ru, description_en, parent_id, level, order_index)
VALUES
  ('500', 'Auxiliary Diesel Generator',        'Вспомогательный дизель-генератор',              'Auxiliary Diesel Generator',                  'Вспомогательный дизель-генераторный агрегат',                            'Auxiliary diesel generating set',                                (SELECT id FROM public.sfi_codes WHERE code='50'), 3, 0),
  ('501', 'Shaft Generator',                   'Валогенератор',                                 'Shaft Generator',                             'Валовой генератор (PTI/PTO)',                                             'Shaft driven generator (PTI/PTO)',                               (SELECT id FROM public.sfi_codes WHERE code='50'), 3, 1),
  ('502', 'Emergency Diesel Generator',        'Аварийный дизель-генератор',                    'Emergency Diesel Generator',                  'Аварийный дизель-генераторный агрегат',                                   'Emergency diesel generating set',                                (SELECT id FROM public.sfi_codes WHERE code='50'), 3, 2),
  ('503', 'Harbor Generator',                  'Стояночный генератор',                          'Harbor Generator',                            'Стояночный генератор малой мощности',                                    'Small capacity harbour/harbour generator',                       (SELECT id FROM public.sfi_codes WHERE code='50'), 3, 3)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en,
  description_ru=EXCLUDED.description_ru, description_en=EXCLUDED.description_en,
  parent_id=EXCLUDED.parent_id, level=EXCLUDED.level, order_index=EXCLUDED.order_index;

-- Group 60x — Navigation equipment detail
INSERT INTO public.sfi_codes (code, name, name_ru, name_en, description_ru, description_en, parent_id, level, order_index)
VALUES
  ('600', 'Magnetic Compass',                  'Магнитный компас',                              'Magnetic Compass',                            'Главный и путевой магнитные компасы',                                    'Standard and steering magnetic compasses',                       (SELECT id FROM public.sfi_codes WHERE code='60'), 3, 0),
  ('601', 'Gyrocompass',                       'Гирокомпас',                                    'Gyrocompass',                                 'Гирокомпас и репитеры',                                                   'Gyrocompass and repeaters',                                      (SELECT id FROM public.sfi_codes WHERE code='60'), 3, 1),
  ('602', 'Echo Sounder',                      'Эхолот',                                        'Echo Sounder',                                'Навигационный эхолот',                                                    'Navigation echo sounder',                                        (SELECT id FROM public.sfi_codes WHERE code='60'), 3, 2),
  ('603', 'Speed Log',                         'Лаг',                                           'Speed Log',                                   'Доплеровский или электромагнитный лаг',                                   'Doppler or electromagnetic speed log',                           (SELECT id FROM public.sfi_codes WHERE code='60'), 3, 3),
  ('604', 'AIS',                               'АИС',                                           'AIS',                                         'Автоматическая идентификационная система',                                'Automatic Identification System',                                (SELECT id FROM public.sfi_codes WHERE code='60'), 3, 4),
  ('605', 'GMDSS Equipment',                   'Оборудование ГМССБ',                            'GMDSS Equipment',                             'Оборудование глобальной морской системы связи при бедствии и безопасности', 'Global Maritime Distress and Safety System equipment',         (SELECT id FROM public.sfi_codes WHERE code='60'), 3, 5)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en,
  description_ru=EXCLUDED.description_ru, description_en=EXCLUDED.description_en,
  parent_id=EXCLUDED.parent_id, level=EXCLUDED.level, order_index=EXCLUDED.order_index;

-- Group 70x — Lifesaving detail
INSERT INTO public.sfi_codes (code, name, name_ru, name_en, description_ru, description_en, parent_id, level, order_index)
VALUES
  ('700', 'Lifeboats',                         'Спасательные шлюпки',                           'Lifeboats',                                   'Спасательные шлюпки и шлюпочное устройство',                             'Lifeboats and lifeboat launching appliance',                     (SELECT id FROM public.sfi_codes WHERE code='70'), 3, 0),
  ('701', 'Rescue Boat',                       'Дежурная шлюпка',                               'Rescue Boat',                                 'Дежурная шлюпка и устройство её спуска',                                  'Rescue boat and launching appliance',                            (SELECT id FROM public.sfi_codes WHERE code='70'), 3, 1),
  ('702', 'Life Rafts',                        'Спасательные плоты',                            'Life Rafts',                                  'Надувные спасательные плоты',                                             'Inflatable life rafts',                                          (SELECT id FROM public.sfi_codes WHERE code='70'), 3, 2),
  ('703', 'Immersion Suits',                   'Гидротермокостюмы',                             'Immersion Suits',                             'Гидротермокостюмы (костюмы выживания)',                                   'Immersion suits (survival suits)',                               (SELECT id FROM public.sfi_codes WHERE code='70'), 3, 3),
  ('704', 'Lifebuoys',                         'Спасательные круги',                            'Lifebuoys',                                   'Спасательные круги с линёметами',                                         'Lifebuoys with line-throwing appliances',                        (SELECT id FROM public.sfi_codes WHERE code='70'), 3, 4),
  ('705', 'Distress Signals',                  'Сигналы бедствия',                              'Distress Signals',                            'Пиротехнические сигналы бедствия и SART',                                'Pyrotechnic distress signals and SART',                          (SELECT id FROM public.sfi_codes WHERE code='70'), 3, 5),
  ('706', 'EPIRB',                             'АРБ',                                           'EPIRB',                                       'Аварийный радиобуй-указатель местоположения',                            'Emergency Position Indicating Radio Beacon',                     (SELECT id FROM public.sfi_codes WHERE code='70'), 3, 6)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en,
  description_ru=EXCLUDED.description_ru, description_en=EXCLUDED.description_en,
  parent_id=EXCLUDED.parent_id, level=EXCLUDED.level, order_index=EXCLUDED.order_index;

-- Group 80x — Main Switchboard detail
INSERT INTO public.sfi_codes (code, name, name_ru, name_en, description_ru, description_en, parent_id, level, order_index)
VALUES
  ('800', 'Main Switchboard (MSB)',            'ГРЩ',                                           'Main Switchboard (MSB)',                      'Главный распределительный щит',                                          'Main switchboard',                                               (SELECT id FROM public.sfi_codes WHERE code='80'), 3, 0),
  ('801', 'Emergency Switchboard',             'Аварийный распределительный щит',               'Emergency Switchboard',                       'Аварийный распределительный щит (АРЩ)',                                   'Emergency switchboard (ESB)',                                    (SELECT id FROM public.sfi_codes WHERE code='80'), 3, 1),
  ('802', 'Section Switchboards',              'Секционные щиты',                               'Section Switchboards',                        'Секционные распределительные щиты',                                      'Section distribution switchboards',                              (SELECT id FROM public.sfi_codes WHERE code='80'), 3, 2),
  ('803', 'Distribution Panels',               'Распределительные панели',                      'Distribution Panels',                         'Групповые распределительные панели',                                     'Group distribution panels',                                      (SELECT id FROM public.sfi_codes WHERE code='80'), 3, 3)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en,
  description_ru=EXCLUDED.description_ru, description_en=EXCLUDED.description_en,
  parent_id=EXCLUDED.parent_id, level=EXCLUDED.level, order_index=EXCLUDED.order_index;

-- Group 90x — Alarm and Monitoring detail
INSERT INTO public.sfi_codes (code, name, name_ru, name_en, description_ru, description_en, parent_id, level, order_index)
VALUES
  ('900', 'Central Alarm System',             'Центральная система сигнализации',              'Central Alarm System',                        'Центральная система аварийно-предупредительной сигнализации',             'Central alarm and warning system',                               (SELECT id FROM public.sfi_codes WHERE code='90'), 3, 0),
  ('901', 'Engine Room Monitoring',            'Мониторинг МО',                                 'Engine Room Monitoring',                      'Система мониторинга машинного отделения',                                 'Engine room monitoring system',                                  (SELECT id FROM public.sfi_codes WHERE code='90'), 3, 1),
  ('902', 'Bridge Alarm System',               'Система сигнализации мостика',                  'Bridge Alert Management',                     'Система управления сигналами на мостике (BAM)',                           'Bridge Alert Management system (BAM)',                           (SELECT id FROM public.sfi_codes WHERE code='90'), 3, 2),
  ('903', 'Watchkeeping Alarm',                'Сигнализация вахтенного',                       'Watchkeeping Alarm',                          'Система контроля вахтенного помощника (ECDIS/Radar мостик)',              'Officer of the Watch alarm system',                              (SELECT id FROM public.sfi_codes WHERE code='90'), 3, 3)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en,
  description_ru=EXCLUDED.description_ru, description_en=EXCLUDED.description_en,
  parent_id=EXCLUDED.parent_id, level=EXCLUDED.level, order_index=EXCLUDED.order_index;

-- 3. Update the default 'name' column to use English name for backward compatibility
UPDATE public.sfi_codes SET name = name_en WHERE name_en IS NOT NULL AND name != name_en;

-- 4. Update updated_at
UPDATE public.sfi_codes SET updated_at = CURRENT_TIMESTAMP WHERE name_ru IS NOT NULL;

COMMIT;
