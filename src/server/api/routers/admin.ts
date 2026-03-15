import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";

export const adminRouter = createTRPCRouter({
  getOverview: adminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const ago30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      memberCounts,
      newMembers,
      neverLoggedIn,
      pendingCompletions,
      activeProjects,
      upcomingMeetings,
      recentPendingCompletions,
    ] = await Promise.all([
      // Members by status
      ctx.db.user.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),

      // New members in the last 30 days
      ctx.db.user.count({
        where: { joinDate: { gte: ago30Days } },
      }),

      // Active members who have never logged in
      ctx.db.user.count({
        where: { status: "ACTIVE", lastLoginAt: null },
      }),

      // Pending work plan completions count
      ctx.db.workPlanCompletion.count({
        where: { status: "PENDING" },
      }),

      // Active projects count
      ctx.db.project.count({
        where: { status: "ACTIVE" },
      }),

      // Upcoming meetings (next 7 days)
      ctx.db.meeting.findMany({
        where: { startTime: { gte: now, lte: in7Days } },
        orderBy: { startTime: "asc" },
        select: {
          id: true,
          title: true,
          startTime: true,
          duration: true,
          _count: { select: { attendances: true } },
        },
      }),

      // Most recent pending completions (for quick-review)
      ctx.db.workPlanCompletion.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        take: 5,
        include: {
          user: { select: { id: true, name: true, image: true } },
          activity: { select: { id: true, name: true, points: true } },
        },
      }),
    ]);

    const byStatus = Object.fromEntries(
      memberCounts.map((r) => [r.status, r._count._all]),
    ) as Record<string, number>;

    return {
      members: {
        active: byStatus.ACTIVE ?? 0,
        inactive: byStatus.INACTIVE ?? 0,
        alumni: byStatus.ALUMNI ?? 0,
        newThisMonth: newMembers,
        neverLoggedIn,
      },
      pendingCompletions,
      activeProjects,
      upcomingMeetings,
      recentPendingCompletions,
    };
  }),

  // ─── Profile edit approvals ─────────────────────────────────────────────────

  getPendingProfileEdits: adminProcedure.query(({ ctx }) => {
    return ctx.db.profileEdit.findMany({
      where: { status: "PENDING" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            phone: true,
            bio: true,
            githubUsername: true,
            linkedinUrl: true,
            subTeam: true,
            graduationDate: true,
          },
        },
      },
      orderBy: { submittedAt: "asc" },
    });
  }),

  reviewProfileEdit: adminProcedure
    .input(
      z.object({
        editId: z.string(),
        decision: z.enum(["APPROVED", "REJECTED"]),
        reviewNote: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const edit = await ctx.db.profileEdit.findUnique({
        where: { id: input.editId },
      });
      if (!edit) throw new Error("Profile edit not found");
      if (edit.status !== "PENDING") throw new Error("Edit is no longer pending");

      await ctx.db.$transaction(async (tx) => {
        if (input.decision === "APPROVED") {
          // Copy proposed fields onto the User, skipping nulls (no change)
          await tx.user.update({
            where: { id: edit.userId },
            data: {
              ...(edit.name !== null && { name: edit.name }),
              ...(edit.phone !== null && { phone: edit.phone }),
              ...(edit.bio !== null && { bio: edit.bio }),
              ...(edit.githubUsername !== null && { githubUsername: edit.githubUsername }),
              ...(edit.linkedinUrl !== null && { linkedinUrl: edit.linkedinUrl }),
              ...(edit.subTeam !== null && { subTeam: edit.subTeam }),
              ...(edit.graduationDate !== null && { graduationDate: edit.graduationDate }),
            },
          });
        }

        await tx.profileEdit.update({
          where: { id: input.editId },
          data: {
            status: input.decision,
            reviewedAt: new Date(),
            reviewedBy: ctx.session.user.id,
            reviewNote: input.reviewNote ?? null,
          },
        });
      });
    }),
});
