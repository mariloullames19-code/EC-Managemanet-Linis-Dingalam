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

export interface PhilippineDateTimeInfo {
  dayOfWeekTagalog: string;
  weekdayEn: string;
  monthTagalog: string;
  dayNum: string;
  yearNum: string;
  dayAndDateTagalog: string;
  dayAndDateEnglish: string;
  exactTimeWithSeconds: string;
  fullCombinedTagalog: string;
}

/**
 * Authoritative Philippine Standard Time (PST - UTC+8) Formatter
 * Accurately extracts the Day of the Week (Araw), Full Date, and Exact Time with Seconds (Oras)
 * for Accomplishment Attendance Upload Proof.
 */
export function formatPhilippineDateTime(timestampOrStr?: string | Date, fallbackString?: string): PhilippineDateTimeInfo {
  let date: Date | null = null;

  if (timestampOrStr instanceof Date && !isNaN(timestampOrStr.getTime())) {
    date = timestampOrStr;
  } else if (typeof timestampOrStr === 'string' && timestampOrStr.trim()) {
    const raw = timestampOrStr.trim();
    // Try standard ISO Date parsing
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      date = d;
    } else {
      // Try stripping PST
      const clean = raw.replace(/PST/gi, '').trim();
      const d2 = new Date(clean);
      if (!isNaN(d2.getTime())) {
        date = d2;
      }
    }
  }

  if (!date && typeof fallbackString === 'string' && fallbackString.trim()) {
    const clean = fallbackString.replace(/PST/gi, '').trim();
    const d3 = new Date(clean);
    if (!isNaN(d3.getTime())) {
      date = d3;
    }
  }

  // Fallback regex parser for mm/dd/yyyy or yyyy-mm-dd patterns
  if (!date && typeof timestampOrStr === 'string') {
    const m = timestampOrStr.match(/(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})[,\s]+(\d{1,2}):(\d{2}):?(\d{2})?\s*(AM|PM)?/i);
    if (m) {
      let y = parseInt(m[1], 10);
      let mo = parseInt(m[2], 10);
      let day = parseInt(m[3], 10);
      if (y < 100) {
        // e.g. 10/6/2026 -> m[1]=10 (month), m[2]=6 (day), m[3]=2026 (year)
        mo = parseInt(m[1], 10);
        day = parseInt(m[2], 10);
        y = parseInt(m[3], 10);
      }
      let h = parseInt(m[4], 10);
      const min = parseInt(m[5], 10);
      const sec = m[6] ? parseInt(m[6], 10) : 0;
      const ampm = m[7] ? m[7].toUpperCase() : '';
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      // Dingalan time UTC+8
      const epochMs = Date.UTC(y, mo - 1, day, h - 8, min, sec);
      date = new Date(epochMs);
    }
  }

  if (!date || isNaN(date.getTime())) {
    date = getDingalanNow();
  }

  const dayNamesTagalog = ['Linggo', 'Lunes', 'Martes', 'Miyerkules', 'Huwebes', 'Biyernes', 'Sabado'];
  const dayNamesEnglish = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNamesTagalog = [
    'Enero', 'Pebrero', 'Marso', 'Abril', 'Mayo', 'Hunyo',
    'Hulyo', 'Agosto', 'Setyembre', 'Oktubre', 'Nobyembre', 'Disyembre'
  ];
  const monthNamesEnglish = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      weekday: 'long',
      year: 'numeric',
      month: 'numeric',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).formatToParts(date);

    const partMap: Record<string, string> = {};
    parts.forEach((p) => {
      partMap[p.type] = p.value;
    });

    const weekdayEn = partMap.weekday || 'Monday';
    const dayIdx = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(weekdayEn);
    const dayOfWeekTagalog = dayIdx >= 0 ? dayNamesTagalog[dayIdx] : weekdayEn;

    const mNum = parseInt(partMap.month, 10);
    const monthTagalog = mNum >= 1 && mNum <= 12 ? monthNamesTagalog[mNum - 1] : partMap.month;
    const monthEn = mNum >= 1 && mNum <= 12 ? monthNamesEnglish[mNum - 1] : partMap.month;
    const dayNum = partMap.day;
    const yearNum = partMap.year;

    const hour = partMap.hour;
    const minute = partMap.minute;
    const second = partMap.second;
    const dayPeriod = partMap.dayPeriod || (parseInt(hour, 10) >= 12 ? 'PM' : 'AM');

    const dayAndDateTagalog = `${dayOfWeekTagalog}, ${monthTagalog} ${dayNum}, ${yearNum}`;
    const dayAndDateEnglish = `${weekdayEn}, ${monthEn} ${dayNum}, ${yearNum}`;
    const exactTimeWithSeconds = `${hour}:${minute}:${second} ${dayPeriod}`;

    return {
      dayOfWeekTagalog,
      weekdayEn,
      monthTagalog,
      dayNum,
      yearNum,
      dayAndDateTagalog,
      dayAndDateEnglish,
      exactTimeWithSeconds,
      fullCombinedTagalog: `${dayAndDateTagalog} • ${exactTimeWithSeconds} PST`,
    };
  } catch {
    // Math fallback
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    const pstDate = new Date(utc + 8 * 3600000);
    const dayOfWeekTagalog = dayNamesTagalog[pstDate.getDay()];
    const weekdayEn = dayNamesEnglish[pstDate.getDay()];
    const monthTagalog = monthNamesTagalog[pstDate.getMonth()];
    const monthEn = monthNamesEnglish[pstDate.getMonth()];
    const dayNum = String(pstDate.getDate()).padStart(2, '0');
    const yearNum = String(pstDate.getFullYear());

    let h = pstDate.getHours();
    const min = String(pstDate.getMinutes()).padStart(2, '0');
    const sec = String(pstDate.getSeconds()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const strH = String(h).padStart(2, '0');

    const dayAndDateTagalog = `${dayOfWeekTagalog}, ${monthTagalog} ${dayNum}, ${yearNum}`;
    const dayAndDateEnglish = `${weekdayEn}, ${monthEn} ${dayNum}, ${yearNum}`;
    const exactTimeWithSeconds = `${strH}:${min}:${sec} ${ampm}`;

    return {
      dayOfWeekTagalog,
      weekdayEn,
      monthTagalog,
      dayNum,
      yearNum,
      dayAndDateTagalog,
      dayAndDateEnglish,
      exactTimeWithSeconds,
      fullCombinedTagalog: `${dayAndDateTagalog} • ${exactTimeWithSeconds} PST`,
    };
  }
}

/**
 * Calculates realtime remaining countdown against Dingalan server time (UTC+8)
 */
export function calculateDingalanRemainingTime(
  eventDateStr?: string,
  endTimeStr?: string
): {
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isPast24Hours: boolean;
} {
  if (!eventDateStr) {
    return { hours: 0, minutes: 0, seconds: 0, isExpired: true, isPast24Hours: false };
  }

  const nowPst = getDingalanNow();
  let [year, month, day] = (eventDateStr || '').split('-').map(Number);
  if (!year || !month || !day) {
    const todayPst = getDingalanNow();
    year = todayPst.getFullYear();
    month = todayPst.getMonth() + 1;
    day = todayPst.getDate();
  }

  let hours = 17;
  let minutes = 0;

  if (endTimeStr) {
    const cleanTime = endTimeStr.trim().toUpperCase();
    const timeMatch = cleanTime.match(/(\d+):(\d+)\s*(AM|PM)?/);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3];

      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;

      hours = h;
      minutes = m;
    }
  }

  // Create UTC epoch for Dingalan target date/time
  const targetEpochMs = Date.UTC(year, month - 1, day, hours - 8, minutes, 0);
  const diffMs = targetEpochMs - nowPst.getTime();

  if (diffMs <= 0) {
    const isPast24Hours = Math.abs(diffMs) > 24 * 60 * 60 * 1000;
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      isPast24Hours,
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return {
    hours: h,
    minutes: m,
    seconds: s,
    isExpired: false,
    isPast24Hours: false,
  };
}

import { useState, useEffect } from 'react';

/**
 * React hook to get real-time updating Dingalan, Aurora time
 */
export function useDingalanClock() {
  const [dingalanTime, setDingalanTime] = useState<string>(() => formatDingalanTime());

  useEffect(() => {
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


