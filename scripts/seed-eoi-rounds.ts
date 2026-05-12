import { prisma } from "@/lib/prisma";
import eoiRounds from "@/src/data/eoi-rounds.json";

async function main() {
  let inserted = 0;
  let skipped = 0;

  for (const round of eoiRounds.rounds) {
    const roundDate = new Date(`${round.date}T00:00:00.000Z`);

    const existing = await prisma.eoiRound.findUnique({
      where: {
        roundDate_visaSubclass: {
          roundDate,
          visaSubclass: round.visaSubclass,
        },
      },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.eoiRound.create({
      data: {
        roundDate,
        visaSubclass: round.visaSubclass,
        visaName: round.visaName,
        lowestPoints: round.lowestPoints,
        invitations: round.invitations,
        poolSize: round.poolSize,
        notes: round.notes || null,
        isEstimated: true,
        source: "seed",
      },
    });

    inserted += 1;
  }

  console.log(`EOI seed complete: inserted=${inserted}, skipped=${skipped}`);
}

main()
  .catch((error) => {
    console.error("EOI seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
