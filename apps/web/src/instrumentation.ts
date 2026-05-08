export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  const { startPgBossWorkers } = await import("@cairnly/jobs");
  await startPgBossWorkers();
}
