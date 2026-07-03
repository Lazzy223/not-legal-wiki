export const MOSCOW_TIME_ZONE = "Europe/Moscow";

const NAIVE_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

type DateInput = string | number | Date | null | undefined;

function normalizeDateInput(value: DateInput) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (typeof value === "number") {
    return new Date(value);
  }

  const text = String(value || "").trim();

  if (!text) {
    return null;
  }

  if (DATE_ONLY.test(text)) {
    return new Date(`${text}T00:00:00+03:00`);
  }

  if (NAIVE_DATE_TIME.test(text)) {
    const normalized = text.length === 16 ? `${text}:00` : text;
    return new Date(`${normalized}+03:00`);
  }

  return new Date(text);
}

export function parseMoscowDate(value: DateInput) {
  const date = normalizeDateInput(value);

  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function formatMoscowDate(
  value: DateInput,
  options: Intl.DateTimeFormatOptions,
  fallback = "Без даты"
) {
  const date = parseMoscowDate(value);

  if (!date) {
    return fallback;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    ...options,
    timeZone: MOSCOW_TIME_ZONE,
  }).format(date);
}

export function formatMoscowTime(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  },
  fallback = ""
) {
  return formatMoscowDate(value, options, fallback);
}

function getMoscowParts(value: DateInput) {
  const date = parseMoscowDate(value);

  if (!date) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MOSCOW_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const map = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: map.get("year") || "",
    month: map.get("month") || "",
    day: map.get("day") || "",
    hour: map.get("hour") || "",
    minute: map.get("minute") || "",
  };
}

export function toMoscowDateTimeLocalValue(value: DateInput = new Date()) {
  const parts = getMoscowParts(value);

  if (!parts) {
    return "";
  }

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
