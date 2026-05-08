import type {
  AvailabilitySlotDto,
  DealCreateInput,
  DealDto,
  DealMoveStageInput,
  DealUpdateInput,
  EventCreateInput,
  EventDto,
  NoteCreateInput,
  NoteDto,
  NoteUpdateInput,
  StageDto,
  TaskCreateInput,
  TaskDto,
  TaskUpdateInput,
} from "@cairnly/core";

export type MutationResult = { ok: true } | { ok: false; message: string };

export type AppData = {
  deals?: DealDto[];
  events?: EventDto[];
  notes?: NoteDto[];
  scheduling?: {
    slots: AvailabilitySlotDto[];
  };
  stages?: StageDto[];
  tasks?: TaskDto[];
};

export type AppActions = {
  createDeal?: (input: DealCreateInput) => Promise<MutationResult>;
  updateDeal?: (input: DealUpdateInput) => Promise<MutationResult>;
  moveDealStage?: (input: DealMoveStageInput) => Promise<MutationResult>;
  createTask?: (input: TaskCreateInput) => Promise<MutationResult>;
  updateTask?: (input: TaskUpdateInput) => Promise<MutationResult>;
  createNote?: (input: NoteCreateInput) => Promise<MutationResult>;
  updateNote?: (input: NoteUpdateInput) => Promise<MutationResult>;
  createEvent?: (input: EventCreateInput) => Promise<MutationResult>;
};
