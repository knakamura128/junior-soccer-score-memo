import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const GRADE_TAGS = ["1年", "2年", "3年", "4年", "5年", "6年"] as const;
const GROUP_TAGS = ["低学年", "中学年", "高学年"] as const;
const PLAYER_TAG_ORDER = ["低学年", "中学年", "高学年", "キッズ", "1年", "2年", "3年", "4年", "5年", "6年"] as const;

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
        const promotion = promotePlayerTags(player.tags);
        if (promotion.action === "keep") {
          continue;
        }
        if (promotion.action === "delete") {
          await tx.player.delete({ where: { id: player.id } });
          continue;
        }
        await tx.player.update({
          where: { id: player.id },
          data: { tags: promotion.tags }
        });
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

function promotePlayerTags(tags: string[]) {
  if (tags.includes("キッズ")) {
    return { action: "keep" } as const;
  }

  const gradeNumbers = GRADE_TAGS.map((tag, index) => (tags.includes(tag) ? index + 1 : null)).filter(
    (grade): grade is number => grade !== null
  );

  if (gradeNumbers.length === 0) {
    return { action: "keep" } as const;
  }

  if (gradeNumbers.some((grade) => grade >= 6)) {
    return { action: "delete" } as const;
  }

  const nextGradeNumbers = Array.from(new Set(gradeNumbers.map((grade) => grade + 1))).sort((a, b) => a - b);
  const preservedTags = tags.filter((tag) => !GRADE_TAGS.includes(tag as (typeof GRADE_TAGS)[number]) && !GROUP_TAGS.includes(tag as (typeof GROUP_TAGS)[number]));
  const nextTags = new Set<string>(preservedTags);

  for (const grade of nextGradeNumbers) {
    nextTags.add(`${grade}年`);
    if (grade <= 2) {
      nextTags.add("低学年");
    } else if (grade <= 4) {
      nextTags.add("中学年");
    } else {
      nextTags.add("高学年");
    }
  }

  return { action: "update", tags: sortPlayerTags([...nextTags]) } as const;
}

function sortPlayerTags(tags: string[]) {
  return [...tags].sort((left, right) => {
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
