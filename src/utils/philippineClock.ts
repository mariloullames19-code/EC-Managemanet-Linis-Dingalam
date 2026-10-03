/**
 * Philippine Standard Time (PST / PHT - UTC+8) Authoritative Clock Engine
 * Specifically synchronized for Dingalan, Aurora LGU operations.
 */

let serverTimeOffsetMs = 0;
let isSynchronized = false;

/**
 * Synchronize with the authoritative server time in Dingalan, Aurora
 */
export async function syncDingalanTime(): Promise<number> {
  const t0 = Date.now();
  try {
    const res = await fetch('/api/time', { cache: 'no-store' });
    const t1 = Date.now();
    if (res.ok) {
      const data = await res.json();
      const roundTrip = t1 - t0;
      const estimatedServerNow = data.epochMs + roundTrip / 2;
      serverTimeOffsetMs = estimatedServerNow - t1;
      isSynchronized = true;
      return serverTimeOffsetMs;
    }
  } catch (err) {
    // If backend endpoint is unavailable, fallback to public NTP or local clock
    console.warn('[Dingalan Clock] Server sync fallback:', err);
  }
  return serverTimeOffsetMs;
}

// Initial sync attempt when module loads in browser
if (typeof window !== 'undefined') {
  syncDingalanTime();
  // Periodic resync every 60 seconds to prevent clock drift
  setInterval(syncDingalanTime, 60000);
}

/**
 * Returns the authoritative current Date in Dingalan, Aurora
 */
export function getDingalanNow(): Date {
  return new Date(Date.now() + serverTimeOffsetMs);
}

/**
 * Format time in Dingalan, Aurora (Asia/Manila, UTC+8)
 * Example: "05:25:30 PM PST"
 */
export function formatDingalanTime(date?: Date): string {
  const d = date || getDingalanNow();
  try {
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(d);
    return `${formatted} PST`;
  } catch {
    // Fallback if Intl timeZone fails
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const phDate = new Date(utc + 8 * 3600000);
    let hours = phDate.getHours();
    const minutes = String(phDate.getMinutes()).padStart(2, '0');
    const seconds = String(phDate.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');
    return `${strHours}:${minutes}:${seconds} ${ampm} PST`;
  }
}

/**
 * Format full date and time for Dingalan, Aurora
 * Example: "Oct 03, 2026, 05:25:30 PM PST"
 */
export function formatDingalanFull(date?: Date): string {
  const d = date || getDingalanNow();
  try {
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(d) + ' PST';
  } catch {
    return formatDingalanTime(d);
  }
}

import { useState, useEffect } from 'react';

/**
 * React hook to get real-time updating Dingalan, Aurora time
 */
export function useDingalanClock() {
  const [dingalanTime, setDingalanTime] = useState<string>(() => formatDingalanTime());

  useEffect(() => {
    // Immediate sync
    syncDingalanTime().then(() => {
      setDingalanTime(formatDingalanTime());
    });

    const timer = setInterval(() => {
      setDingalanTime(formatDingalanTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return {
    time: dingalanTime,
    isSynchronized,
  };
}
