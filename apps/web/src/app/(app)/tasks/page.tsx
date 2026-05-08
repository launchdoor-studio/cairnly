import { AppShell } from "@/components/app/AppShell";
import { getApiCaller } from "@/server/api";
import { hasDatabaseUrl } from "@/server/db";
import { createTaskAction, updateTaskAction } from "./actions";

export const dynamic = "force-dynamic";

async function getTasksData() {
  if (!hasDatabaseUrl()) {
    return {};
  }

  try {
    const api = await getApiCaller();
    return await api.tasks.list({ limit: 100 });
  } catch {
    return {};
  }
}

export default async function TasksPage() {
  const data = await getTasksData();

  return (
    <AppShell
      actions={{
        createTask: createTaskAction,
        updateTask: updateTaskAction,
      }}
      appData={data}
    />
  );
}
