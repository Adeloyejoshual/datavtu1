import { v4 as uuidv4 } from "uuid";

export function generateReference(prefix = "TXN") {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = uuidv4().split("-")[0].toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function generateIdempotencyKey(userId, type, details) {
  // Create a deterministic key based on user, type, and details
  const raw = `${userId}-${type}-${JSON.stringify(details)}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `IDEM-${Math.abs(hash).toString(36).toUpperCase()}-${Date.now().toString(36)}`;
}