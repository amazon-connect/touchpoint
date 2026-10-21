/**
 * Formats a message time using the browser locale: hour and minute only when
 * the message is from today, otherwise the date as well (with the year when it
 * is not the current one).
 */
export const formatTimestamp = (time: number, now = new Date()): string => {
  const date = new Date(time);
  const timePart = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (date.toDateString() === now.toDateString()) {
    return timePart;
  }
  const datePart = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
  return `${datePart}, ${timePart}`;
};
