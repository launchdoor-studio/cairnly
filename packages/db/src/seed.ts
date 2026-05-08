import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import {
  availabilityWindows,
  contacts,
  deals,
  events,
  forms,
  notes,
  pipelines,
  schedulingLinks,
  stages,
  tags,
  tasks,
  users,
  workspaces,
} from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed Cairnly.");
}

// Inserts a public `form` row for slug `intake` (used by `/f/intake`). From repo root: `pnpm db:seed`.

const client = postgres(connectionString, { max: 1, prepare: false });
const db = drizzle(client);

const workspaceId = process.env.CAIRNLY_DEV_WORKSPACE_ID ?? "dev_workspace";
const userId = process.env.CAIRNLY_DEV_USER_ID ?? "dev_user";
const now = new Date();

async function main() {
  await db
    .insert(workspaces)
    .values({
      id: workspaceId,
      name: "Launchdoor",
      settings: {
        domain: "localhost",
        timezone: "Asia/Karachi",
      },
      aiConfig: {
        mode: "off",
      },
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: workspaces.id,
      set: {
        name: "Launchdoor",
        updatedAt: now,
      },
    });

  await db
    .insert(users)
    .values({
      id: userId,
      workspaceId,
      email: "owner@launchdoor.test",
      emailVerified: true,
      image: null,
      name: "Aftaab",
      passwordHash: "seed-only-password-hash",
      role: "owner",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        name: "Aftaab",
        role: "owner",
        updatedAt: now,
      },
    });

  await db
    .insert(tags)
    .values([
      { id: "tag_hot", workspaceId, name: "Hot", color: "amber" },
      { id: "tag_imported", workspaceId, name: "Imported", color: "stone" },
    ])
    .onConflictDoNothing();

  await db
    .insert(pipelines)
    .values({
      id: "pipeline_default",
      workspaceId,
      name: "Default pipeline",
      archived: false,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: pipelines.id,
      set: {
        archived: false,
        updatedAt: now,
      },
    });

  await db
    .insert(stages)
    .values([
      {
        id: "stage_lead",
        pipelineId: "pipeline_default",
        name: "Lead",
        position: 1,
        probability: 20,
      },
      {
        id: "stage_qualified",
        pipelineId: "pipeline_default",
        name: "Qualified",
        position: 2,
        probability: 45,
      },
      {
        id: "stage_proposal",
        pipelineId: "pipeline_default",
        name: "Proposal",
        position: 3,
        probability: 70,
      },
      {
        id: "stage_won",
        pipelineId: "pipeline_default",
        name: "Won",
        position: 4,
        probability: 100,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(contacts)
    .values([
      {
        id: "contact_mira",
        workspaceId,
        type: "person",
        name: "Mira Patel",
        primaryEmail: "mira@northstar.design",
        primaryPhone: "+1 415 555 0184",
        companyId: null,
        ownerId: userId,
        score: "hot",
        customFields: {
          company: "Northstar Design",
          source: "Referral",
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "contact_jon",
        workspaceId,
        type: "person",
        name: "Jon Bell",
        primaryEmail: "jon@atlas.studio",
        primaryPhone: null,
        companyId: null,
        ownerId: userId,
        score: "warm",
        customFields: {
          company: "Atlas Studio",
          source: "Proposal open",
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "contact_rhea",
        workspaceId,
        type: "company",
        name: "Rhea Systems",
        primaryEmail: "hello@rhea.systems",
        primaryPhone: null,
        companyId: null,
        ownerId: userId,
        score: "cold",
        customFields: {
          source: "CSV import",
          people: 12,
        },
        createdAt: now,
        updatedAt: now,
      },
    ])
    .onConflictDoUpdate({
      target: contacts.id,
      set: {
        ownerId: userId,
        updatedAt: now,
      },
    });

  await db
    .insert(deals)
    .values([
      {
        id: "deal_northstar",
        workspaceId,
        title: "Northstar migration",
        contactId: "contact_mira",
        pipelineId: "pipeline_default",
        stageId: "stage_proposal",
        amountCents: BigInt(2480000),
        currency: "USD",
        expectedCloseDate: "2026-05-22",
        ownerId: userId,
        status: "open",
        position: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "deal_atlas",
        workspaceId,
        title: "Atlas Studio retainer",
        contactId: "contact_jon",
        pipelineId: "pipeline_default",
        stageId: "stage_qualified",
        amountCents: BigInt(840000),
        currency: "USD",
        expectedCloseDate: "2026-05-30",
        ownerId: userId,
        status: "open",
        position: 2,
        createdAt: now,
        updatedAt: now,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(tasks)
    .values([
      {
        id: "task_mira_followup",
        workspaceId,
        title: "Send migration plan",
        description: "Follow up with scope and timeline.",
        dueAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        doneAt: null,
        contactId: "contact_mira",
        dealId: "deal_northstar",
        ownerId: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "task_atlas_notes",
        workspaceId,
        title: "Review Atlas proposal notes",
        description: null,
        dueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        doneAt: null,
        contactId: "contact_jon",
        dealId: "deal_atlas",
        ownerId: userId,
        createdAt: now,
        updatedAt: now,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(notes)
    .values([
      {
        id: "note_mira_discovery",
        workspaceId,
        title: "Discovery summary",
        bodyMd: "Confirmed self-hosting is a hard requirement.",
        contactId: "contact_mira",
        dealId: "deal_northstar",
        authorId: userId,
        createdAt: now,
        updatedAt: now,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schedulingLinks)
    .values({
      id: "scheduling_aftaab",
      workspaceId,
      ownerId: userId,
      slug: "aftaab",
      title: "Discovery call",
      description: "A calm, focused meeting.",
      timezone: "Asia/Kolkata",
      durationMinutes: 30,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 10,
      active: true,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  await db
    .insert(forms)
    .values({
      id: "form_intake",
      workspaceId,
      name: "Launchdoor intake",
      slug: "intake",
      fieldsJson: [],
      redirectUrl: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  await db
    .insert(availabilityWindows)
    .values(
      [1, 2, 3, 4, 5].map((weekday) => ({
        id: `availability_${weekday}`,
        schedulingLinkId: "scheduling_aftaab",
        weekday,
        startMinutes: 10 * 60,
        endMinutes: 17 * 60,
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(events)
    .values([
      {
        id: "event_mira_created",
        workspaceId,
        type: "contact_created",
        actorId: userId,
        contactId: "contact_mira",
        dealId: null,
        taskId: null,
        payload: {
          name: "Mira Patel",
          source: "seed",
        },
        createdAt: now,
      },
      {
        id: "event_jon_created",
        workspaceId,
        type: "contact_created",
        actorId: userId,
        contactId: "contact_jon",
        dealId: null,
        taskId: null,
        payload: {
          name: "Jon Bell",
          source: "seed",
        },
        createdAt: now,
      },
    ])
    .onConflictDoNothing();
}

main()
  .then(async () => {
    await client.end();
    process.stdout.write("Seeded Cairnly development data.\n");
  })
  .catch(async (error: unknown) => {
    await client.end();
    process.stderr.write(`${String(error)}\n`);
    process.exit(1);
  });
