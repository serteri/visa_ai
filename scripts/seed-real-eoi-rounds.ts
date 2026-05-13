import { prisma } from "@/lib/prisma";

type RealEoiRoundSeed = {
  date: string;
  visaSubclass: "189" | "491";
  visaName: string;
  invitations: number;
  lowestPoints: number | null;
  isEstimated: boolean;
  source: string;
  notes?: string;
};

const rounds: RealEoiRoundSeed[] = [
  {
    date: "2025-11-13",
    visaSubclass: "189",
    visaName: "Skilled Independent",
    invitations: 10000,
    lowestPoints: null,
    isEstimated: false,
    source: "DoHA Official",
    notes: "Tie break: 11/2025",
  },
  {
    date: "2025-11-13",
    visaSubclass: "491",
    visaName: "Skilled Work Regional (Family Sponsored)",
    invitations: 300,
    lowestPoints: null,
    isEstimated: false,
    source: "DoHA Official",
    notes: "Tie break: 10/2025",
  },
  {
    date: "2025-08-01",
    visaSubclass: "189",
    visaName: "Skilled Independent",
    invitations: 6887,
    lowestPoints: null,
    isEstimated: false,
    source: "DoHA Official",
  },
  {
    date: "2025-08-01",
    visaSubclass: "491",
    visaName: "Skilled Work Regional (Family Sponsored)",
    invitations: 150,
    lowestPoints: null,
    isEstimated: false,
    source: "DoHA Official",
  },
];

async function main() {
  let inserted = 0;
  let updated = 0;

  for (const round of rounds) {
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
      await prisma.eoiRound.update({
        where: { id: existing.id },
        data: {
          visaName: round.visaName,
          invitations: round.invitations,
          lowestPoints: round.lowestPoints,
          isEstimated: round.isEstimated,
          source: round.source,
          notes: round.notes ?? null,
          poolSize: null,
        },
      });
      updated += 1;
      continue;
    }

    await prisma.eoiRound.create({
      data: {
        roundDate,
        visaSubclass: round.visaSubclass,
        visaName: round.visaName,
        invitations: round.invitations,
        lowestPoints: round.lowestPoints,
        poolSize: null,
        isEstimated: round.isEstimated,
        source: round.source,
        notes: round.notes ?? null,
      },
    });

    inserted += 1;
  }

  console.log(`Real EOI seed complete: inserted=${inserted}, updated=${updated}`);
}

main()
  .catch((error) => {
    console.error("Real EOI seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
