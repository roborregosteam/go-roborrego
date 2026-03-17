import { auth } from "~/server/auth";
import { OnboardingBanner } from "./_components/OnboardingBanner";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div>
      <OnboardingBanner />
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Welcome back, {session?.user.name?.split(" ")[0]}
      </h1>
      <p className="text-gray-500 mb-8">
        Here&apos;s an overview of your RoBorregos activity.
      </p>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="Members"
          description="Browse and manage team members."
          href="/dashboard/members"
        />
        <DashboardCard
          title="Work Plan"
          description="Track activities and earn points this semester."
          href="/dashboard/workplan"
        />
        <DashboardCard
          title="Projects"
          description="View ongoing projects and task boards."
          href="/dashboard/projects"
        />
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{title}</h2>
      <p className="text-sm text-gray-500">{description}</p>
    </a>
  );
}
