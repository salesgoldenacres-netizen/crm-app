export const parseSafeDate = (val: unknown): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return val;
  let d = new Date(val as string | number);

  if (isNaN(d.getTime())) {
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      d = new Date(num);
    }
  }

  return isNaN(d.getTime()) ? null : d;
};

export const safeFormatDateTime = (val: unknown, returnTime = true): string => {
  const d = parseSafeDate(val);
  if (!d) return "—";

  return returnTime ? d.toLocaleString("en-IN") : d.toLocaleDateString("en-IN");
};

export const safeFormatTime = (val: unknown, options: Intl.DateTimeFormatOptions = {}): string => {
  const d = parseSafeDate(val);
  if (!d) return "—";
  return d.toLocaleTimeString("en-IN", options);
};

export const formatDuration = (totalSecs?: number | null): string => {
  if (totalSecs === undefined || totalSecs === null || isNaN(totalSecs))
    return "00:00";
  const secs = Math.floor(totalSecs);
  const hrs = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const remainingSecs = secs % 60;
  return [
    hrs > 0 ? String(hrs).padStart(2, "0") : null,
    String(mins).padStart(2, "0"),
    String(remainingSecs).padStart(2, "0"),
  ]
    .filter(Boolean)
    .join(":");
};
