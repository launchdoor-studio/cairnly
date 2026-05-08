import { contactRouter } from "./routers/contact-router";
import { dealRouter } from "./routers/deal-router";
import { emailRouter } from "./routers/email-router";
import { eventRouter } from "./routers/event-router";
import { leadFormRouter } from "./routers/lead-form-router";
import { noteRouter } from "./routers/note-router";
import { reportRouter } from "./routers/report-router";
import { schedulingRouter } from "./routers/scheduling-router";
import { taskRouter } from "./routers/task-router";
import { router } from "./trpc";

export const appRouter = router({
  contacts: contactRouter,
  deals: dealRouter,
  email: emailRouter,
  events: eventRouter,
  leadForm: leadFormRouter,
  notes: noteRouter,
  reports: reportRouter,
  scheduling: schedulingRouter,
  tasks: taskRouter,
});

export type AppRouter = typeof appRouter;
