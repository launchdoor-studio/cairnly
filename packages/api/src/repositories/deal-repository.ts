import type {
  DealCreateInput,
  DealListInput,
  DealMoveStageInput,
  DealUpdateInput,
} from "@cairnly/core";
import { type Db, deals, events, pipelines, stages } from "@cairnly/db";
import { createId } from "@paralleldrive/cuid2";
import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";

export type DealRow = typeof deals.$inferSelect;
export type StageRow = typeof stages.$inferSelect;

export type DealRepository = {
  list(input: DealListInput & { workspaceId: string }): Promise<DealRow[]>;
  listStages(input: { workspaceId: string }): Promise<StageRow[]>;
  defaultStage(input: { workspaceId: string }): Promise<StageRow | undefined>;
  create(input: typeof deals.$inferInsert): Promise<DealRow>;
  update(input: {
    id: string;
    workspaceId: string;
    patch: Omit<DealUpdateInput, "id">;
  }): Promise<DealRow | undefined>;
  moveStage(
    input: DealMoveStageInput & { workspaceId: string; actorId: string },
  ): Promise<{
    deal: DealRow;
    fromStageId: string;
  } | null>;
  softDelete(input: {
    id: string;
    workspaceId: string;
    deletedAt: Date;
  }): Promise<DealRow | undefined>;
  recordEvent(input: typeof events.$inferInsert): Promise<void>;
};

export function createDealRepository(db: Db): DealRepository {
  return {
    async list({ workspaceId, search, limit }) {
      const filters = [eq(deals.workspaceId, workspaceId), isNull(deals.deletedAt)];

      if (search) {
        const pattern = `%${search}%`;
        const searchFilter = or(ilike(deals.title, pattern));
        if (searchFilter) {
          filters.push(searchFilter);
        }
      }

      return db
        .select()
        .from(deals)
        .where(and(...filters))
        .orderBy(desc(deals.updatedAt))
        .limit(limit);
    },

    async listStages({ workspaceId }) {
      return db
        .select({
          id: stages.id,
          pipelineId: stages.pipelineId,
          name: stages.name,
          position: stages.position,
          probability: stages.probability,
        })
        .from(stages)
        .innerJoin(pipelines, eq(stages.pipelineId, pipelines.id))
        .where(
          and(eq(pipelines.workspaceId, workspaceId), eq(pipelines.archived, false)),
        )
        .orderBy(stages.position);
    },

    async defaultStage({ workspaceId }) {
      const [stage] = await db
        .select({
          id: stages.id,
          pipelineId: stages.pipelineId,
          name: stages.name,
          position: stages.position,
          probability: stages.probability,
        })
        .from(stages)
        .innerJoin(pipelines, eq(stages.pipelineId, pipelines.id))
        .where(
          and(eq(pipelines.workspaceId, workspaceId), eq(pipelines.archived, false)),
        )
        .orderBy(stages.position)
        .limit(1);

      return stage;
    },

    async create(input) {
      const [deal] = await db.insert(deals).values(input).returning();
      if (!deal) {
        throw new Error("Deal insert did not return a row");
      }

      return deal;
    },

    async update({ id, workspaceId, patch }) {
      const [deal] = await db
        .update(deals)
        .set({
          ...patch,
          amountCents:
            patch.amountCents === undefined ? undefined : BigInt(patch.amountCents),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(deals.id, id),
            eq(deals.workspaceId, workspaceId),
            isNull(deals.deletedAt),
          ),
        )
        .returning();

      return deal;
    },

    async moveStage({ actorId, id, position, stageId, workspaceId }) {
      return db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(deals)
          .where(
            and(
              eq(deals.id, id),
              eq(deals.workspaceId, workspaceId),
              isNull(deals.deletedAt),
            ),
          )
          .limit(1);

        if (!existing) {
          return null;
        }

        const [deal] = await tx
          .update(deals)
          .set({ stageId, position, updatedAt: new Date() })
          .where(eq(deals.id, id))
          .returning();

        if (!deal) {
          return null;
        }

        await tx.insert(events).values({
          id: createId(),
          workspaceId,
          type: "deal_stage_changed",
          actorId,
          contactId: deal.contactId,
          dealId: deal.id,
          taskId: null,
          payload: {
            fromStageId: existing.stageId,
            toStageId: stageId,
          },
        });

        return { deal, fromStageId: existing.stageId };
      });
    },

    async softDelete({ id, workspaceId, deletedAt }) {
      const [deal] = await db
        .update(deals)
        .set({ deletedAt, updatedAt: deletedAt })
        .where(
          and(
            eq(deals.id, id),
            eq(deals.workspaceId, workspaceId),
            isNull(deals.deletedAt),
          ),
        )
        .returning();

      return deal;
    },

    async recordEvent(input) {
      await db.insert(events).values(input);
    },
  };
}
