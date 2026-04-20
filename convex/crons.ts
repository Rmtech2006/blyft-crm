import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron(
  "morning focus digest",
  "30 3 * * *",
  internal.automation.runMorningDigest,
  {}
);

crons.cron(
  "follow-up sweep",
  "30 8 * * *",
  internal.automation.runFollowUpSweep,
  {}
);

crons.cron(
  "evening operations summary",
  "30 13 * * *",
  internal.automation.runEveningSummary,
  {}
);

export default crons;
