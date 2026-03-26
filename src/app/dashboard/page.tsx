import { auth } from "~/server/auth";
import { DashboardGreeting } from "./_components/DashboardGreeting";
import { OnboardingBanner } from "./_components/OnboardingBanner";
import { SayingCard } from "./_components/SayingCard";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div>
      <OnboardingBanner />
      <h1 className="mb-1 text-2xl font-bold text-gray-900">
        <DashboardGreeting
          userId={session?.user.id ?? ""}
          name={session?.user.name?.split(" ")[0] ?? "there"}
        />
      </h1>
      <p className="mb-6 text-gray-500">
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
      <div className="mt-8">
        <SayingCard
          isMember={
            session?.user.role === "MEMBER" || session?.user.role === "ADMIN"
          }
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
      className="block rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <h2 className="mb-1 text-lg font-semibold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500">{description}</p>
    </a>
  );
}
