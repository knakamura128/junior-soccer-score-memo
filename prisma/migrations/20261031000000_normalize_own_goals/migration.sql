-- Normalize legacy scorer labels without changing scores or goal counts.
UPDATE "Player"
SET "name" = 'OG'
WHERE btrim("name") ~* '^(?:([0-9０-９]+|-)\s+)?(OG|ＯＧ|オウンゴール)(\s*[（(](キッズ|[1-6１-６]年|低学年|中学年|高学年)[）)])?$';

UPDATE "GoalEvent"
SET "player" = 'OG'
WHERE btrim("player") ~* '^(?:([0-9０-９]+|-)\s+)?(OG|ＯＧ|オウンゴール)(\s*[（(](キッズ|[1-6１-６]年|低学年|中学年|高学年)[）)])?$'
   OR "player" IN (SELECT "id" FROM "Player" WHERE "name" = 'OG');
