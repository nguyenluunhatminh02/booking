import { Prisma } from '@prisma/client';

// Slow query log (toàn cục)
export const slowQueryLog = (thresholdMs = 150) =>
  Prisma.defineExtension({
    name: 'slowQueryLog',
    query: {
      async $allOperations({ model, operation, args, query }) {
        const t0 = performance.now();
        const res = await query(args);
        const dt = performance.now() - t0;
        if (dt >= thresholdMs) {
          console.warn(
            `[SLOW ${dt.toFixed(1)}ms] ${model ?? 'raw'}.${operation}`,
          );
        }
        return res;
      },
    },
  });

// Tenant scope (nếu bạn có workspaceId trên các model)
export const tenantScope = (
  getWsId: () => string | undefined,
  models: string[],
) =>
  Prisma.defineExtension({
    name: 'tenantScope',
    query: {
      $allModels: {
        async $allOperations({ model, args, query }) {
          if (!models.includes(model)) return query(args);
          const workspaceId = getWsId();
          if (!workspaceId) return query(args);
          const where = (args as any).where ?? {};
          (args as any).where = { ...where, workspaceId };
          return query(args);
        },
      },
    },
  });
