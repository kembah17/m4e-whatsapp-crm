/**
 * Nigerian locale utilities for Customer Reactivation Manager.
 * Provides currency formatting, date formatting, and timezone defaults.
 */

export const M4E_LOCALE = "en-NG";
export const M4E_TIMEZONE = "Africa/Lagos";
export const M4E_CURRENCY = "NGN";

/**
 * Format amount as Nigerian Naira.
 * @example formatNaira(2500000) → "₦2,500,000.00"
 */
export function formatNaira(amount: number, decimals = 2): string {
  return new Intl.NumberFormat(M4E_LOCALE, {
    style: "currency",
    currency: M4E_CURRENCY,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Format date in Nigerian style (DD/MM/YYYY).
 */
export function formatDateNG(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(M4E_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: M4E_TIMEZONE,
  }).format(d);
}

/**
 * Format datetime in Nigerian style.
 */
export function formatDateTimeNG(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(M4E_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: M4E_TIMEZONE,
  }).format(d);
}

/**
 * Format phone number for Nigerian display.
 * @example formatPhoneNG("+2348157167093") → "0815 716 7093"
 */
export function formatPhoneNG(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("234") && cleaned.length === 13) {
    const local = "0" + cleaned.slice(3);
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  }
  return phone;
}
