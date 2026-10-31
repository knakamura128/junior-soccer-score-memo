export const OWN_GOAL_NAME = "OG";

export function isOwnGoalName(value: string | null | undefined) {
  return /^(?:(?:[0-9０-９]+|-)\s+)?(?:OG|ＯＧ|オウンゴール)(?:\s*[（(](?:キッズ|[1-6１-６]年|低学年|中学年|高学年)[）)])?$/i.test(
    (value || "").trim()
  );
}

export function normalizeOwnGoalName(value: string) {
  return isOwnGoalName(value) ? OWN_GOAL_NAME : value;
}
