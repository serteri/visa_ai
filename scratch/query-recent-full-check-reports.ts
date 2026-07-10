import "dotenv/config";

import { prisma } from "@/lib/prisma";

async function main() {
  const rows = await prisma.userReport.findMany({
    where: { source: "full_check" },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      fullName: true,
      email: true,
      locale: true,
      createdAt: true,
    },
  });

  console.log(JSON.stringify(rows, null, 2));
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});