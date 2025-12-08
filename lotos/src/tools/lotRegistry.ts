export interface LotRecord {
  userId: string;
  lotId: string;
  title?: string;
  kind?: string;
  createdAt: string;
  updatedAt: string;
}

const registry = new Map<string, Map<string, LotRecord>>();

export function listLots(userId: string): LotRecord[] {
  return [...(registry.get(userId)?.values() ?? [])];
}

export function getLotRecord(userId: string, lotId: string): LotRecord | undefined {
  return registry.get(userId)?.get(lotId);
}

export function saveLotRecord(record: LotRecord): LotRecord {
  const userLots = registry.get(record.userId) ?? new Map<string, LotRecord>();
  userLots.set(record.lotId, record);
  registry.set(record.userId, userLots);
  return record;
}

export function deleteLotRecord(userId: string, lotId: string): boolean {
  const userLots = registry.get(userId);
  if (!userLots) {
    return false;
  }
  const deleted = userLots.delete(lotId);
  if (userLots.size === 0) {
    registry.delete(userId);
  }
  return deleted;
}
