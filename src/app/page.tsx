import Image from "next/image";
import { redirect } from "next/navigation";

import { auth, signIn } from "~/server/auth";
import { TypewriterText } from "./_components/TypewriterText";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black text-white">
      {/* Ram logo — large background watermark */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <Image
          src="/roborregos.png"
          alt=""
          width={640}
          height={640}
          className="object-contain opacity-[0.08]"
          priority
        />
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Content */}
      <div
        className="relative flex flex-col items-center gap-6 px-6 text-center"
        style={{ fontFamily: "var(--font-titillium), sans-serif" }}
      >
        <h1
          className="text-5xl leading-tight sm:text-7xl"
          style={{
            fontFamily: "var(--font-press-start), monospace",
            color: "#3d55ff",
            textShadow: "0 0 40px rgba(61,85,255,0.5)",
          }}
        >
          RoBorregos
        </h1>

        <TypewriterText />

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="mt-4 rounded px-10 py-3 text-sm font-bold uppercase tracking-widest transition-all duration-200 hover:scale-[1.04] hover:brightness-110"
            style={{
              background: "#3d55ff",
              color: "#ffffff",
              letterSpacing: "0.15em",
            }}
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </main>
  );
}
