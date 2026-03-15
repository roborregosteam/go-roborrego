import { redirect } from "next/navigation";

import { auth, signIn } from "~/server/auth";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-linear-to-b from-[#1a2744] to-[#0f1729] text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            RoBorregos
          </h1>
          <p className="mt-4 text-xl text-blue-200">Team Management Platform</p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="rounded-full bg-white px-10 py-3 font-semibold text-[#1a2744] transition hover:bg-blue-100"
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </main>
  );
}
