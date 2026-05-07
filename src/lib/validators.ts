import { URL } from "node:url";

export function normalizeUrl(input: string): string | null {
  try {
    const parsed = new URL(input.trim());

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}
