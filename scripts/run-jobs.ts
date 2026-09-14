import "dotenv/config";
import { processDueJobs } from "../src/lib/jobs";
import { prisma } from "../src/lib/db";

async function main() {
  const result = await processDueJobs();
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
