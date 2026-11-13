/** GSM IMEI checksum (Refurbed uses the same rule). */
export function imeiHasValidChecksum(value: string): boolean {
  const imei = value.trim();
  if (!/^\d{15}$/.test(imei)) {
    return false;
  }
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let digit = Number(imei[i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

function appendImeiCheckDigit(imei14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = Number(imei14[i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
  }
  const check = (10 - (sum % 10)) % 10;
  return imei14 + String(check);
}

/** Normalize scanner output to a Refurbed-ready 15-digit IMEI when possible (no UI blocking). */
export function formatImeiForRefurbed(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  if (digits.length === 15 && imeiHasValidChecksum(digits)) {
    return digits;
  }

  if (digits.length === 14) {
    const candidate = appendImeiCheckDigit(digits);
    if (imeiHasValidChecksum(candidate)) {
      return candidate;
    }
  }

  if (digits.length === 15) {
    const fromBody = appendImeiCheckDigit(digits.slice(0, 14));
    if (imeiHasValidChecksum(fromBody)) {
      return fromBody;
    }
  }

  if (digits.length === 16) {
    const first = digits.slice(0, 15);
    const last = digits.slice(1, 16);
    if (imeiHasValidChecksum(first)) {
      return first;
    }
    if (imeiHasValidChecksum(last)) {
      return last;
    }
  }

  if (digits.length > 16) {
    for (let start = 0; start <= digits.length - 15; start++) {
      const candidate = digits.slice(start, start + 15);
      if (imeiHasValidChecksum(candidate)) {
        return candidate;
      }
    }
    for (let start = 0; start <= digits.length - 14; start++) {
      const chunk = digits.slice(start, start + 14);
      if (!/^\d{14}$/.test(chunk)) {
        continue;
      }
      const candidate = appendImeiCheckDigit(chunk);
      if (imeiHasValidChecksum(candidate)) {
        return candidate;
      }
    }
  }

  return digits.length >= 15 ? digits.slice(0, 15) : digits;
}
