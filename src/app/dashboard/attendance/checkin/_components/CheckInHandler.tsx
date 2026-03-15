"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api } from "~/trpc/react";

export function CheckInHandler({ token }: { token: string | null }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkIn = api.attendance.checkInByToken.useMutation({
    onSuccess: () => setDone(true),
    onError: (err) => setError(err.message),
  });

  useEffect(() => {
    if (token && !done && !error && !checkIn.isPending) {
      checkIn.mutate({ token });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return (
      <Card>
        <p className="text-red-600 font-medium">Invalid check-in link.</p>
        <p className="text-sm text-gray-500 mt-1">
          No token was provided. Make sure you scanned the correct QR code.
        </p>
        <BackLink />
      </Card>
    );
  }

  if (checkIn.isPending) {
    return (
      <Card>
        <p className="text-gray-600">Checking you in…</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <p className="text-red-600 font-medium">Check-in failed</p>
        <p className="text-sm text-gray-500 mt-1">{error}</p>
        <BackLink />
      </Card>
    );
  }

  if (done) {
    return (
      <Card>
        <div className="text-4xl mb-2">✓</div>
        <p className="text-green-700 font-semibold text-lg">Checked in!</p>
        <BackLink />
      </Card>
    );
  }

  return null;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col items-center text-center max-w-sm w-full">
      {children}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard/attendance"
      className="mt-4 text-sm text-blue-600 hover:underline"
    >
      Back to Attendance
    </Link>
  );
}
