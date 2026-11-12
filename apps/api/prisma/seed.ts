import { prisma } from "../src/lib/prisma";
import { backfillSubscriptions, seedPlans } from "../src/modules/plans/plans.seed";

async function main() {
  await seedPlans();
  console.log("Seeded plans: free, pro, business");

  const fixed = await backfillSubscriptions();
  console.log(`Backfilled ${fixed} tenant(s) with a Free subscription`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());