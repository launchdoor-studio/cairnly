import {
  type DealCreateInput,
  type DealDeleteInput,
  type DealDto,
  type DealListInput,
  type DealMoveStageInput,
  type DealUpdateInput,
  err,
  ok,
  type Result,
  type StageDto,
} from "@cairnly/core";
import { createId } from "@paralleldrive/cuid2";
import type { SessionUser } from "../context";
import type {
  DealRepository,
  DealRow,
  StageRow,
} from "../repositories/deal-repository";

type DealServiceError = "deal_not_found" | "stage_not_found" | "viewer_forbidden";

export type DealService = {
  list(
    input: DealListInput,
    user: SessionUser,
  ): Promise<Result<{ deals: DealDto[]; stages: StageDto[] }>>;
  create(
    input: DealCreateInput,
    user: SessionUser,
  ): Promise<Result<DealDto, DealServiceError>>;
  update(
    input: DealUpdateInput,
    user: SessionUser,
  ): Promise<Result<DealDto, DealServiceError>>;
  moveStage(
    input: DealMoveStageInput,
    user: SessionUser,
  ): Promise<Result<DealDto, DealServiceError>>;
  delete(
    input: DealDeleteInput,
    user: SessionUser,
  ): Promise<Result<DealDto, DealServiceError>>;
};

export function createDealService(repository: DealRepository): DealService {
  return {
    async list(input, user) {
      const [deals, stages] = await Promise.all([
        repository.list({ ...input, workspaceId: user.workspaceId }),
        repository.listStages({ workspaceId: user.workspaceId }),
      ]);

      return ok({
        deals: deals.map(toDealDto),
        stages: stages.map(toStageDto),
      });
    },

    async create(input, user) {
      if (user.role === "viewer") {
        return err("viewer_forbidden");
      }

      const defaultStage = input.stageId
        ? undefined
        : await repository.defaultStage({ workspaceId: user.workspaceId });
      const stageId = input.stageId ?? defaultStage?.id;
      const pipelineId = input.pipelineId ?? defaultStage?.pipelineId;

      if (!stageId || !pipelineId) {
        return err("stage_not_found");
      }

      const deal = await repository.create({
        id: createId(),
        workspaceId: user.workspaceId,
        title: input.title,
        contactId: input.contactId ?? null,
        pipelineId,
        stageId,
        amountCents: BigInt(input.amountCents),
        currency: input.currency,
        expectedCloseDate: input.expectedCloseDate ?? null,
        ownerId: input.ownerId ?? user.id,
        status: input.status,
        position: input.position,
        lostReason: input.lostReason?.trim() ? input.lostReason.trim() : null,
      });

      await repository.recordEvent({
        id: createId(),
        workspaceId: user.workspaceId,
        type: "deal_created",
        actorId: user.id,
        contactId: deal.contactId,
        dealId: deal.id,
        taskId: null,
        payload: { title: deal.title, stageId: deal.stageId },
      });

      return ok(toDealDto(deal));
    },

    async update(input, user) {
      if (user.role === "viewer") {
        return err("viewer_forbidden");
      }

      const { id, ...rawPatch } = input;
      const patch: Omit<DealUpdateInput, "id"> = { ...rawPatch };
      if (patch.lostReason === "") {
        patch.lostReason = null;
      }

      const deal = await repository.update({
        id,
        workspaceId: user.workspaceId,
        patch,
      });

      if (!deal) {
        return err("deal_not_found");
      }

      await repository.recordEvent({
        id: createId(),
        workspaceId: user.workspaceId,
        type: "deal_updated",
        actorId: user.id,
        contactId: deal.contactId,
        dealId: deal.id,
        taskId: null,
        payload: { fields: Object.keys(patch) },
      });

      return ok(toDealDto(deal));
    },

    async moveStage(input, user) {
      if (user.role === "viewer") {
        return err("viewer_forbidden");
      }

      const result = await repository.moveStage({
        ...input,
        workspaceId: user.workspaceId,
        actorId: user.id,
      });

      if (!result) {
        return err("deal_not_found");
      }

      return ok(toDealDto(result.deal));
    },

    async delete(input, user) {
      if (user.role === "viewer") {
        return err("viewer_forbidden");
      }

      const deletedAt = new Date();
      const deal = await repository.softDelete({
        id: input.id,
        workspaceId: user.workspaceId,
        deletedAt,
      });

      if (!deal) {
        return err("deal_not_found");
      }

      await repository.recordEvent({
        id: createId(),
        workspaceId: user.workspaceId,
        type: "deal_deleted",
        actorId: user.id,
        contactId: deal.contactId,
        dealId: deal.id,
        taskId: null,
        payload: { deletedAt: deletedAt.toISOString() },
      });

      return ok(toDealDto(deal));
    },
  };
}

function toDealDto(deal: DealRow): DealDto {
  return {
    id: deal.id,
    workspaceId: deal.workspaceId,
    title: deal.title,
    contactId: deal.contactId,
    pipelineId: deal.pipelineId,
    stageId: deal.stageId,
    amountCents: Number(deal.amountCents),
    currency: deal.currency,
    expectedCloseDate: deal.expectedCloseDate,
    ownerId: deal.ownerId,
    status: deal.status,
    position: deal.position,
    lostReason: deal.lostReason,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
  };
}

function toStageDto(stage: StageRow): StageDto {
  return {
    id: stage.id,
    pipelineId: stage.pipelineId,
    name: stage.name,
    position: stage.position,
    probability: stage.probability,
  };
}
