import { CheckInHandler } from "./_components/CheckInHandler";

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <CheckInHandler token={token ?? null} />
    </div>
  );
}
