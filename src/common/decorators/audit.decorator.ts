import { SetMetadata } from '@nestjs/common';

export const AUDIT_META_KEY = 'audit';

export type AuditSpec = {
  action: string;
  entity: string;
  idSelector?: { in: 'params' | 'query' | 'body' | 'headers'; key: string };
  resolveId?: (req: any, res: any, result: any) => string | undefined;
};

/**
 * Decorator to enable audit logging for a controller method
 * @example
 * @Audit({ action: 'PROPERTY_UPDATE', entity: 'Property', idSelector: { in: 'params', key: 'id' } })
 */
export const Audit = (spec: AuditSpec) => SetMetadata(AUDIT_META_KEY, spec);
