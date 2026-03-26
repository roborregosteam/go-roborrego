"use client";

const GREETINGS = {
  morning: [
    "Good morning",
    "Morning",
    "Great to see you this morning",
    "Hope you slept well",
  ],
  afternoon: [
    "Good afternoon",
    "Hope your day is going well",
    "Afternoon",
    "Good to see you",
    "Having a productive day?",
  ],
  evening: [
    "Good evening",
    "Hope you had a great day",
    "Evening",
    "Wrapping up the day?",
    "Remember to sleep well",
    "Great to have you back tonight",
  ],
};

/** Simple deterministic hash: maps a string to a non-negative integer. */
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return Math.abs(h >>> 0);
}

export function DashboardGreeting({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  const hour = new Date().getHours();
  const slot: keyof typeof GREETINGS =
    hour >= 5 && hour < 12
      ? "morning"
      : hour >= 12 && hour < 18
        ? "afternoon"
        : "evening";

  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const messages = GREETINGS[slot];
  const greeting =
    messages[hash(`${userId}:${today}:${slot}`) % messages.length];

  return (
    <>
      {greeting}, {name}
    </>
  );
}
