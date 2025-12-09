-- Seed data for testing
-- Using fixed UUIDs for easy reference

-- Insert a demo user
INSERT INTO users (id, name, email, learning_style, difficulty_preference)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Demo Felhasználó',
  'demo@example.com',
  'verbal',
  'normal'
)
ON CONFLICT (id) DO NOTHING;

-- Insert sample lessons
INSERT INTO lessons (id, title, content, difficulty, topic) VALUES
(
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Az első világháború okai',
  'Az első világháború 1914-ben kezdődött és 1918-ig tartott. Ez volt az első globális háború, amely több mint 17 millió ember életébe került.

Fő okai:
1. Militarizmus: A nagyhatalmak folyamatosan fejlesztették hadseregeiket
2. Szövetségi rendszerek: A hatalmak szövetségeket kötöttek (pl. Hármas szövetség, Antant)
3. Imperializmus: Verseny a gyarmatokért és erőforrásokért
4. Nacionalizmus: Erős nemzeti érzelmek, különösen a Balkánon

A közvetlen kiváltó ok Ferenc Ferdinánd trónörökös meggyilkolása volt 1914. június 28-án Szarajevóban. Ez az esemény láncreakciót indított el, amely a háborúhoz vezetett.',
  'normal',
  'I. világháború'
),
(
  '22222222-2222-2222-2222-222222222222'::uuid,
  'A versailles-i békeszerződés',
  'A versailles-i békeszerződést 1919. június 28-án írták alá, ezzel hivatalosan véget ért az első világháború.

Fő rendelkezései:
- Németország felelősségre vonása a háborúért
- Területi veszteségek: Elzász-Lotaringia visszaadása Franciaországnak
- Katonai korlátozások: Német hadsereg méretének korlátozása
- Jóvátétel: Hatalmas jóvátételi kifizetések kényszerítése Németországra

Következményei:
A szerződés kemény feltételei hozzájárultak a német gazdasági válsághoz és a nácizmus felemelkedéséhez. Sok történész úgy véli, hogy a versailles-i béke közvetetten hozzájárult a második világháború kirobbanásához.',
  'normal',
  'I. világháború'
),
(
  '33333333-3333-3333-3333-333333333333'::uuid,
  'A hidegháború kezdete',
  'A hidegháború az 1940-es évek végétől az 1990-es évek elejéig tartó geopolitikai feszültség volt az Egyesült Államok és a Szovjetunió között.

Fő jellemzői:
- Ideológiai konfliktus: Kapitalizmus vs. Kommunizmus
- Nukleáris fegyverkezési verseny
- Proxy háborúk: Különböző országokban folytatott konfliktusok
- Kétpólusú világrend: NATO vs. Varsói Szerződés

Fontos események:
- 1947: Truman-doktrína
- 1948-1949: Berlini blokád
- 1961: Berlini fal építése
- 1962: Kubai rakétaválság

A hidegháború véget ért a Szovjetunió felbomlásával 1991-ben.',
  'normal',
  'Hidegháború'
)
ON CONFLICT (id) DO NOTHING;

-- Insert skills for BKT tracking
INSERT INTO skills (skill_key, skill_name, lesson_id) VALUES
('ww1_causes', 'I. világháború okai', '11111111-1111-1111-1111-111111111111'::uuid),
('ww1_alliances', 'Szövetségi rendszerek', '11111111-1111-1111-1111-111111111111'::uuid),
('versailles_terms', 'Versailles-i béke feltételei', '22222222-2222-2222-2222-222222222222'::uuid),
('versailles_consequences', 'Versailles-i béke következményei', '22222222-2222-2222-2222-222222222222'::uuid),
('cold_war_origins', 'Hidegháború kezdete', '33333333-3333-3333-3333-333333333333'::uuid),
('cold_war_events', 'Hidegháború fontos eseményei', '33333333-3333-3333-3333-333333333333'::uuid)
ON CONFLICT (skill_key) DO NOTHING;

