import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const GRADE_TAGS = ["1年", "2年", "3年", "4年", "5年", "6年"] as const;
const GROUP_TAGS = ["低学年", "中学年", "高学年"] as const;
const PLAYER_TAG_ORDER = ["低学年", "中学年", "高学年", "キッズ", "1年", "2年", "3年", "4年", "5年", "6年"] as const;
const HIGHER_GRADE_EXCEPTIONS = new Set(["カンナ", "トア"]);

export async function ensureAnnualPlayerPromotion(now = new Date()) {
  const currentJstDate = getJstDateParts(now);
  if (currentJstDate.month < 4 || (currentJstDate.month === 4 && currentJstDate.day < 1)) {
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existingRun = await tx.playerPromotionRun.findUnique({
        where: { year: currentJstDate.year }
      });

      if (existingRun) {
        return;
      }

      const players = await tx.player.findMany();

      for (const player of players) {
        const normalizedTags = normalizePlayerTags(player.name, player.tags);
        const promotion = promoteNormalizedTags(normalizedTags);

        if (promotion.action === "delete") {
          await tx.player.delete({ where: { id: player.id } });
          continue;
        }

        if (promotion.action === "update" && !sameTags(player.tags, promotion.tags)) {
          await tx.player.update({
            where: { id: player.id },
            data: { tags: promotion.tags }
          });
        }
      }

      await tx.playerPromotionRun.create({
        data: { year: currentJstDate.year }
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return;
    }
    throw error;
  }
}

export async function normalizeExistingPlayers() {
  const players = await prisma.player.findMany();

  for (const player of players) {
    const normalizedTags = normalizePlayerTags(player.name, player.tags);
    if (!sameTags(player.tags, normalizedTags)) {
      await prisma.player.update({
        where: { id: player.id },
        data: { tags: normalizedTags }
      });
    }
  }
}

export function normalizePlayerTags(name: string, tags: string[]) {
  if (tags.includes("キッズ")) {
    const preserved = tags.filter((tag) => tag !== "キッズ" && !GRADE_TAGS.includes(tag as (typeof GRADE_TAGS)[number]) && !GROUP_TAGS.includes(tag as (typeof GROUP_TAGS)[number]));
    return sortPlayerTags(["キッズ", ...preserved]);
  }

  const gradeNumbers = getGradeNumbers(tags);
  if (gradeNumbers.length === 0) {
    return sortPlayerTags(tags);
  }

  const grade = selectCanonicalGrade(name, gradeNumbers);
  const preserved = tags.filter((tag) => !GRADE_TAGS.includes(tag as (typeof GRADE_TAGS)[number]) && !GROUP_TAGS.includes(tag as (typeof GROUP_TAGS)[number]));
  const nextTags = new Set<string>(preserved);
  nextTags.add(`${grade}年`);
  nextTags.add(groupForGrade(grade));
  return sortPlayerTags([...nextTags]);
}

function promoteNormalizedTags(tags: string[]) {
  if (tags.includes("キッズ")) {
    return { action: "keep", tags } as const;
  }

  const gradeNumbers = getGradeNumbers(tags);
  if (gradeNumbers.length === 0) {
    return { action: "keep", tags } as const;
  }

  const grade = gradeNumbers[0];
  if (grade >= 6) {
    return { action: "delete" } as const;
  }

  const preserved = tags.filter((tag) => !GRADE_TAGS.includes(tag as (typeof GRADE_TAGS)[number]) && !GROUP_TAGS.includes(tag as (typeof GROUP_TAGS)[number]));
  const nextGrade = grade + 1;
  const nextTags = sortPlayerTags([groupForGrade(nextGrade), `${nextGrade}年`, ...preserved]);
  return { action: "update", tags: nextTags } as const;
}

function getGradeNumbers(tags: string[]) {
  return GRADE_TAGS.map((tag, index) => (tags.includes(tag) ? index + 1 : null)).filter(
    (grade): grade is number => grade !== null
  );
}

function selectCanonicalGrade(name: string, gradeNumbers: number[]) {
  const sorted = [...new Set(gradeNumbers)].sort((left, right) => left - right);
  if (HIGHER_GRADE_EXCEPTIONS.has(name)) {
    return sorted[sorted.length - 1];
  }
  return sorted[0];
}

function groupForGrade(grade: number) {
  if (grade <= 2) {
    return "低学年";
  }
  if (grade <= 4) {
    return "中学年";
  }
  return "高学年";
}

function sortPlayerTags(tags: string[]) {
  return [...new Set(tags)].sort((left, right) => {
    const leftIndex = PLAYER_TAG_ORDER.indexOf(left as (typeof PLAYER_TAG_ORDER)[number]);
    const rightIndex = PLAYER_TAG_ORDER.indexOf(right as (typeof PLAYER_TAG_ORDER)[number]);

    if (leftIndex === -1 && rightIndex === -1) {
      return left.localeCompare(right, "ja");
    }
    if (leftIndex === -1) {
      return 1;
    }
    if (rightIndex === -1) {
      return -1;
    }
    return leftIndex - rightIndex;
  });
}

function sameTags(left: string[], right: string[]) {
  return left.length === right.length && left.every((tag, index) => tag === right[index]);
}

function getJstDateParts(now: Date) {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);

  const [year, month, day] = formatted.split("-").map(Number);
  return { year, month, day };
}
