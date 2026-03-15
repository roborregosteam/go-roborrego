import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  memberProcedure,
  protectedProcedure,
} from "~/server/api/trpc";

// 15-minute grace period before a check-in is considered late
const LATE_GRACE_MS = 15 * 60 * 1000;

export const attendanceRouter = createTRPCRouter({
  // ─── Meetings ───────────────────────────────────────────────────────────────

  getMeetings: protectedProcedure.query(async ({ ctx }) => {
    const meetings = await ctx.db.meeting.findMany({
      orderBy: { startTime: "desc" },
      include: {
        _count: { select: { attendances: true } },
        project: { select: { id: true, name: true } },
        attendances: {
          where: { userId: ctx.session.user.id },
          select: { isLate: true, checkInTime: true },
        },
        feedbacks: {
          where: { userId: ctx.session.user.id },
          select: { rating: true, comment: true, isAnonymous: true },
        },
      },
    });
    return meetings.map(({ attendances, feedbacks, ...m }) => ({
      ...m,
      myAttendance: attendances[0] ?? null,
      myFeedback: feedbacks[0] ?? null,
    }));
  }),

  getMeetingDetail: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [meeting, activeMembers] = await Promise.all([
        ctx.db.meeting.findUnique({
          where: { id: input.id },
          include: {
            attendances: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, image: true },
                },
              },
              orderBy: { checkInTime: "asc" },
            },
            feedbacks: {
              include: {
                user: { select: { id: true, name: true, image: true } },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        }),
        ctx.db.user.findMany({
          where: { status: "ACTIVE" },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            subTeam: true,
          },
          orderBy: { name: "asc" },
        }),
      ]);
      if (!meeting) throw new TRPCError({ code: "NOT_FOUND" });
      const checkedInIds = new Set(meeting.attendances.map((a) => a.userId));
      return {
        ...meeting,
        // Mask user identity for anonymous feedback
        feedbacks: meeting.feedbacks.map(({ user, ...f }) => ({
          ...f,
          user: f.isAnonymous ? null : user,
        })),
        members: activeMembers.map((m) => ({
          ...m,
          attendance:
            meeting.attendances.find((a) => a.userId === m.id) ?? null,
          isCheckedIn: checkedInIds.has(m.id),
        })),
      };
    }),

  createMeeting: adminProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        startTime: z.date(),
        duration: z.number().int().positive().default(60),
        projectId: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.db.meeting.create({
        data: { ...input, createdBy: ctx.session.user.id },
      });
    }),

  updateMeeting: adminProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        startTime: z.date().optional(),
        duration: z.number().int().positive().optional(),
        projectId: z.string().nullable().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.meeting.update({ where: { id }, data });
    }),

  deleteMeeting: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.meeting.delete({ where: { id: input.id } });
    }),

  // ─── Check-in ────────────────────────────────────────────────────────────────

  checkInByToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const meeting = await ctx.db.meeting.findUnique({
        where: { checkInToken: input.token },
      });
      if (!meeting)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid check-in link.",
        });

      const now = new Date();
      const isLate = now > new Date(meeting.startTime.getTime() + LATE_GRACE_MS);

      try {
        return await ctx.db.attendance.create({
          data: {
            userId: ctx.session.user.id,
            meetingId: meeting.id,
            checkInTime: now,
            method: "QR_CODE",
            isLate,
          },
          include: { meeting: { select: { title: true, startTime: true } } },
        });
      } catch {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You have already checked in to this meeting.",
        });
      }
    }),

  selfCheckIn: memberProcedure
    .input(z.object({ meetingId: z.string(), note: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const meeting = await ctx.db.meeting.findUnique({
        where: { id: input.meetingId },
      });
      if (!meeting) throw new TRPCError({ code: "NOT_FOUND" });

      const now = new Date();
      const isLate = now > new Date(meeting.startTime.getTime() + LATE_GRACE_MS);

      try {
        return await ctx.db.attendance.create({
          data: {
            userId: ctx.session.user.id,
            meetingId: input.meetingId,
            checkInTime: now,
            method: "SELF",
            isLate,
            note: input.note,
          },
        });
      } catch {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You have already checked in to this meeting.",
        });
      }
    }),

  adminCheckIn: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        meetingId: z.string(),
        isLate: z.boolean().default(false),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.attendance.create({
          data: {
            userId: input.userId,
            meetingId: input.meetingId,
            checkInTime: new Date(),
            method: "MANUAL",
            isLate: input.isLate,
            note: input.note,
          },
        });
      } catch {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This member is already checked in.",
        });
      }
    }),

  removeAttendance: adminProcedure
    .input(z.object({ userId: z.string(), meetingId: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.attendance.delete({
        where: {
          userId_meetingId: {
            userId: input.userId,
            meetingId: input.meetingId,
          },
        },
      });
    }),

  // ─── Member queries ──────────────────────────────────────────────────────────

  getMyAttendance: protectedProcedure.query(({ ctx }) => {
    return ctx.db.attendance.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        meeting: {
          select: { id: true, title: true, startTime: true, duration: true },
        },
      },
      orderBy: { checkInTime: "desc" },
    });
  }),

  // ─── Feedback ────────────────────────────────────────────────────────────────

  submitFeedback: protectedProcedure
    .input(
      z.object({
        meetingId: z.string(),
        rating: z.number().int().min(1).max(5).optional(),
        comment: z.string().max(1000).optional(),
        isAnonymous: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Upsert so members can update their feedback
      return ctx.db.meetingFeedback.upsert({
        where: {
          userId_meetingId: {
            userId: ctx.session.user.id,
            meetingId: input.meetingId,
          },
        },
        create: {
          userId: ctx.session.user.id,
          meetingId: input.meetingId,
          rating: input.rating,
          comment: input.comment,
          isAnonymous: input.isAnonymous,
        },
        update: {
          rating: input.rating,
          comment: input.comment,
          isAnonymous: input.isAnonymous,
        },
      });
    }),

  // ─── Admin report ────────────────────────────────────────────────────────────

  getReport: adminProcedure
    .input(
      z.object({
        from: z.date().optional(),
        to: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const dateFilter = {
        ...(input.from && { gte: input.from }),
        ...(input.to && { lte: input.to }),
      };
      const hasFilter = Object.keys(dateFilter).length > 0;

      const [meetings, attendances, members] = await Promise.all([
        ctx.db.meeting.findMany({
          where: hasFilter ? { startTime: dateFilter } : undefined,
          select: { id: true },
        }),
        ctx.db.attendance.findMany({
          where: hasFilter
            ? { meeting: { startTime: dateFilter } }
            : undefined,
          select: { userId: true, meetingId: true, isLate: true },
        }),
        ctx.db.user.findMany({
          where: { status: "ACTIVE", role: { not: "ADMIN" } },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            subTeam: true,
          },
          orderBy: { name: "asc" },
        }),
      ]);

      const totalMeetings = meetings.length;
      const meetingIdSet = new Set(meetings.map((m) => m.id));

      return members.map((member) => {
        const memberAtt = attendances.filter(
          (a) => a.userId === member.id && meetingIdSet.has(a.meetingId),
        );
        const attended = memberAtt.length;
        const late = memberAtt.filter((a) => a.isLate).length;
        const rate =
          totalMeetings > 0 ? Math.round((attended / totalMeetings) * 100) : 0;
        return { ...member, totalMeetings, attended, late, rate };
      });
    }),
});
