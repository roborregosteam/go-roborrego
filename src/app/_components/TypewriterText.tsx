"use client";

import { useEffect, useState } from "react";

const WORDS = [" create", " build", " design", " code", " connect", " compete", " learn", " teach"];
const TYPE_SPEED = 80;
const DELETE_SPEED = 50;
const PAUSE_MS = 1400;

export function TypewriterText() {
  const [wordIndex, setWordIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Blinking cursor
  useEffect(() => {
    const id = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(id);
  }, []);

  // Typewriter
  useEffect(() => {
    const word = WORDS[wordIndex]!;

    if (!deleting && displayed === word) {
      const id = setTimeout(() => setDeleting(true), PAUSE_MS);
      return () => clearTimeout(id);
    }

    if (deleting && displayed === "") {
      setDeleting(false);
      setWordIndex((i) => (i + 1) % WORDS.length);
      return;
    }

    const id = setTimeout(
      () => {
        setDisplayed(deleting ? word.slice(0, displayed.length - 1) : word.slice(0, displayed.length + 1));
      },
      deleting ? DELETE_SPEED : TYPE_SPEED,
    );
    return () => clearTimeout(id);
  }, [displayed, deleting, wordIndex]);

  return (
    <p
      className="text-2xl font-bold sm:text-3xl"
      style={{ fontFamily: "var(--font-titillium), sans-serif" }}
    >
      We
      <span style={{ color: "#3d55ff" }}>{displayed}</span>
      <span
        className="ml-0.5 inline-block w-0.5 align-middle"
        style={{
          height: "1.1em",
          background: "#3d55ff",
          opacity: cursorVisible ? 1 : 0,
          transition: "opacity 0.1s",
        }}
      />
    </p>
  );
}
