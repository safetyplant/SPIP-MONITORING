'use client';

import { useState } from 'react';

export default function CopyButton({ text, label = 'Salin link' }) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      window.prompt('Salin link ini:', text);
    }
  }

  return (
    <button type="button" className="btn sm" onClick={copy}>
      {done ? 'Tersalin' : label}
    </button>
  );
}
