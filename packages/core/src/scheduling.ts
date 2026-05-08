import { z } from "zod";

export const schedulingLinkSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  ownerId: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  timezone: z.string().min(1),
  durationMinutes: z.number().int().min(5),
  bufferBeforeMinutes: z.number().int().min(0),
  bufferAfterMinutes: z.number().int().min(0),
  active: z.boolean(),
});

export const availabilitySlotSchema = z.object({
  startsAt: z.date(),
  endsAt: z.date(),
});

export const bookingSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  schedulingLinkId: z.string().min(1),
  contactId: z.string().nullable(),
  ownerId: z.string().min(1),
  startsAt: z.date(),
  endsAt: z.date(),
  inviteeName: z.string().min(1),
  inviteeEmail: z.string().email(),
  note: z.string().nullable(),
  status: z.enum(["confirmed", "cancelled", "completed"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const availabilityInputSchema = z.object({
  slug: z.string().min(1),
  from: z.date(),
  to: z.date(),
});

export const bookingCreateInputSchema = z.object({
  slug: z.string().min(1),
  startsAt: z.date(),
  inviteeName: z.string().trim().min(1),
  inviteeEmail: z.string().trim().email(),
  note: z.string().trim().optional(),
});

export const schedulingLinkOutputSchema = z.object({
  link: schedulingLinkSchema,
});

export const availabilityOutputSchema = z.object({
  link: schedulingLinkSchema,
  slots: z.array(availabilitySlotSchema),
});

export const bookingOutputSchema = z.object({
  booking: bookingSchema,
});

export type SchedulingLinkDto = z.infer<typeof schedulingLinkSchema>;
export type AvailabilitySlotDto = z.infer<typeof availabilitySlotSchema>;
export type BookingDto = z.infer<typeof bookingSchema>;
export type AvailabilityInput = z.infer<typeof availabilityInputSchema>;
export type BookingCreateInput = z.infer<typeof bookingCreateInputSchema>;
