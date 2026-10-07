/**
 * Philippine Standard Time (PST / PHT - UTC+8) Authoritative Clock Engine
 * Specifically synchronized for Dingalan, Aurora LGU operations.
 */

let serverTimeOffsetMs = 0;
let manualTimeOverrideOffsetMs = 0;
let isSynchronized = false;

if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('dingalan_manual_time_offset');
  if (saved) {
    manualTimeOverrideOffsetMs = parseInt(saved, 10) || 0;
  }
}

export function setDingalanTimeOverride(targetDate: Date) {
  const naturalNow = Date.now() + serverTimeOffsetMs;
  manualTimeOverrideOffsetMs = targetDate.getTime() - naturalNow;
  if (typeof window !== 'undefined') {
    localStorage.setItem('dingalan_manual_time_offset', String(manualTimeOverrideOffsetMs));
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dingalan-time-updated'));
  }
}

export function resetDingalanTimeOverride() {
  manualTimeOverrideOffsetMs = 0;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('dingalan_manual_time_offset');
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dingalan-time-updated'));
  }
}

/**
 * Synchronize with the authoritative server time in Dingalan, Aurora
 */
export async function syncDingalanTime(): Promise<number> {
  const t0 = Date.now();
  try {
    const res = await fetch('/api/time', { cache: 'no-store' });
    const t1 = Date.now();
    if (res.ok) {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        const roundTrip = t1 - t0;
        const estimatedServerNow = data.epochMs + roundTrip / 2;
        serverTimeOffsetMs = estimatedServerNow - t1;
        isSynchronized = true;
        return serverTimeOffsetMs;
      }
    }
  } catch (err) {
    console.warn('[Dingalan Clock] Server sync fallback:', err);
  }

  // Fallback sync with WorldTimeAPI for Vercel / static deployment environments
  try {
    const t0Api = Date.now();
    const resApi = await fetch('https://worldtimeapi.org/api/timezone/Asia/Manila', { cache: 'no-store' });
    const t1Api = Date.now();
    if (resApi.ok) {
      const dataApi = await resApi.json();
      if (dataApi && dataApi.unixtime) {
        const serverEpochMs = dataApi.unixtime * 1000;
        const roundTrip = t1Api - t0Api;
        const estimatedServerNow = serverEpochMs + roundTrip / 2;
        serverTimeOffsetMs = estimatedServerNow - t1Api;
        isSynchronized = true;
        return serverTimeOffsetMs;
      }
    }
  } catch {}

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
  return new Date(Date.now() + serverTimeOffsetMs + manualTimeOverrideOffsetMs);
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
    // Fallback if Intl timeZone fails (Using UTC getters to prevent local browser timezone shift)
    const utcMs = d.getTime();
    const phDate = new Date(utcMs + 8 * 3600000);
    let hours = phDate.getUTCHours();
    const minutes = String(phDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(phDate.getUTCSeconds()).padStart(2, '0');
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
    // Math fallback (Using UTC getters to avoid local browser timezone conversion)
    const utc = date.getTime();
    const pstDate = new Date(utc + 8 * 3600000);
    const dayOfWeekTagalog = dayNamesTagalog[pstDate.getUTCDay()];
    const weekdayEn = dayNamesEnglish[pstDate.getUTCDay()];
    const monthTagalog = monthNamesTagalog[pstDate.getUTCMonth()];
    const monthEn = monthNamesEnglish[pstDate.getUTCMonth()];
    const dayNum = String(pstDate.getUTCDate()).padStart(2, '0');
    const yearNum = String(pstDate.getUTCFullYear());

    let h = pstDate.getUTCHours();
    const min = String(pstDate.getUTCMinutes()).padStart(2, '0');
    const sec = String(pstDate.getUTCSeconds()).padStart(2, '0');
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
 * Authoritative PST check whether an event broadcast or activity schedule is active and NOT EXPIRED.
 * Returns false as soon as the current PST time exceeds the event's estimatedEndTime or date.
 */
export function checkIsBroadcastActive(broadcast: any): boolean {
  if (!broadcast) return false;
  try {
    const rawDate = broadcast.eventDate || broadcast.date;
    const nowUtcMs = getDingalanNow().getTime();

    // 1. Determine Date (YYYY-MM-DD or MM/DD/YYYY)
    let year = 0, month = 0, day = 0;
    if (rawDate && typeof rawDate === 'string') {
      const parts = rawDate.split(/[\/\-]/).map(Number);
      if (parts.length === 3) {
        if (parts[0] > 1000) {
          year = parts[0];
          month = parts[1];
          day = parts[2];
        } else if (parts[2] > 1000) {
          month = parts[0];
          day = parts[1];
          year = parts[2];
        }
      }
    }

    if (!year || !month || !day) {
      const todayPst = getDingalanNow();
      year = todayPst.getFullYear();
      month = todayPst.getMonth() + 1;
      day = todayPst.getDate();
    }

    // 2. Parse End Time
    let rawTimeStr = broadcast.estimatedEndTime || broadcast.endTime || broadcast.callTime || '11:59 PM';
    rawTimeStr = String(rawTimeStr).trim();

    // Handle range strings like "6:00 am - 3;55 Pm (4 na Oras)" -> extract the second part "3;55 Pm (4 na Oras)"
    if (rawTimeStr.includes('-')) {
      const subParts = rawTimeStr.split('-');
      rawTimeStr = subParts[subParts.length - 1].trim();
    }

    // Remove text inside parentheses like "(4 na Oras)"
    rawTimeStr = rawTimeStr.replace(/\(.*?\)/g, '').trim();

    // Match hh:mm or hh;mm with optional AM/PM
    const timeMatch = rawTimeStr.match(/(\d+)[:;](\d+)\s*(AM|PM)?/i);

    let hours = 23;
    let minutes = 59;

    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3] ? timeMatch[3].toUpperCase() : '';

      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;

      // If no AM/PM specified but hours is 1-11, assume PM for afternoon/evening cleanup tasks
      if (!ampm && hours >= 1 && hours <= 11) {
        hours += 12;
      }
    }

    // Target end epoch milliseconds in Philippine Standard Time (PST UTC+8)
    const targetEndUtcMs = Date.UTC(year, month - 1, day, hours - 8, minutes, 59);

    // Active ONLY IF current PST time is strictly BEFORE the target end time
    return nowUtcMs < targetEndUtcMs;
  } catch {
    return true;
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
 * React hook to get real-time updating Dingalan, Aurora authoritative time (PST - UTC+8)
 * with full breakdown: segundo (seconds), minuto (minutes), oras (hours), date, month, and year.
 */
export function useDingalanClock() {
  const getClockState = () => {
    const now = getDingalanNow();
    const info = formatPhilippineDateTime(now);
    return {
      time: formatDingalanTime(now),
      full: info.fullCombinedTagalog,
      fullEn: `${info.dayAndDateEnglish} • ${info.exactTimeWithSeconds} PST`,
      dayOfWeek: info.dayOfWeekTagalog,
      weekdayEn: info.weekdayEn,
      month: info.monthTagalog,
      dayNum: info.dayNum,
      year: info.yearNum,
      dateFormatted: `${info.monthTagalog} ${info.dayNum}, ${info.yearNum}`,
      timeWithSeconds: info.exactTimeWithSeconds,
      info,
      now,
    };
  };

  const [clockState, setClockState] = useState(getClockState);

  useEffect(() => {
    syncDingalanTime().then(() => {
      setClockState(getClockState());
    });

    const timer = setInterval(() => {
      setClockState(getClockState());
    }, 1000);

    const handleManualUpdate = () => {
      setClockState(getClockState());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('dingalan-time-updated', handleManualUpdate);
    }

    return () => {
      clearInterval(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('dingalan-time-updated', handleManualUpdate);
      }
    };
  }, []);

  return {
    ...clockState,
    isSynchronized,
  };
}


