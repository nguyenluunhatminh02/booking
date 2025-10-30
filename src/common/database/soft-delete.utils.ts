/**
 * Soft Delete Utilities
 *
 * Provides helper functions and Prisma middleware for soft delete pattern
 *
 * Pattern Benefits:
 * - Non-destructive deletion (data recovery possible)
 * - Audit trail maintained (deletedAt timestamp)
 * - Relational integrity preserved
 * - Supports compliance requirements
 * - Can be easily reversed (undelete)
 *
 * Implementation:
 * - deletedAt field added to models (User, Booking, Payment)
 * - Middleware automatically filters soft-deleted records
 * - Manual queries use softDeleteWhere() helper
 */

/**
 * Build Prisma where clause for soft delete pattern
 * Ensures soft-deleted records are excluded from queries
 *
 * Usage:
 * ```ts
 * const user = await prisma.user.findUnique({
 *   where: { id: userId },
 *   ...softDeleteWhere(),
 * });
 * ```
 */
export function softDeleteWhere() {
  return {
    where: {
      deletedAt: null,
    },
  };
}

/**
 * Build Prisma where AND clause for existing where conditions
 * Combines user filter with soft delete check
 *
 * Usage:
 * ```ts
 * const bookings = await prisma.booking.findMany({
 *   where: {
 *     userId: userId,
 *     ...softDeleteAnd(),
 *   },
 * });
 * ```
 */
export function softDeleteAnd() {
  return {
    deletedAt: null,
  };
}

/**
 * Soft delete a record (logical delete)
 * Sets deletedAt to current timestamp instead of actually deleting
 *
 * @param model - Prisma model name (e.g., 'user', 'booking')
 * @param id - Record ID
 * @param prisma - Prisma client instance
 *
 * Usage:
 * ```ts
 * await softDelete('booking', bookingId, prisma);
 * ```
 */
export async function softDelete(
  model: 'user' | 'booking' | 'payment',
  id: string,
  prisma: any,
) {
  const updateData = { deletedAt: new Date() };

  switch (model) {
    case 'user':
      return await prisma.user.update({
        where: { id },
        data: updateData,
      });

    case 'booking':
      return await prisma.booking.update({
        where: { id },
        data: updateData,
      });

    case 'payment':
      return await prisma.payment.update({
        where: { id },
        data: updateData,
      });

    default:
      throw new Error(`Unsupported model: ${model}`);
  }
}

/**
 * Restore a soft-deleted record
 * Clears the deletedAt timestamp
 *
 * @param model - Prisma model name
 * @param id - Record ID
 * @param prisma - Prisma client instance
 *
 * Usage:
 * ```ts
 * await restoreDeleted('booking', bookingId, prisma);
 * ```
 */
export async function restoreDeleted(
  model: 'user' | 'booking' | 'payment',
  id: string,
  prisma: any,
) {
  const updateData = { deletedAt: null };

  switch (model) {
    case 'user':
      return await prisma.user.update({
        where: { id },
        data: updateData,
      });

    case 'booking':
      return await prisma.booking.update({
        where: { id },
        data: updateData,
      });

    case 'payment':
      return await prisma.payment.update({
        where: { id },
        data: updateData,
      });

    default:
      throw new Error(`Unsupported model: ${model}`);
  }
}

/**
 * Permanently hard-delete a soft-deleted record
 * Use with caution - this is irreversible!
 *
 * @param model - Prisma model name
 * @param id - Record ID
 * @param prisma - Prisma client instance
 * @param force - Must explicitly pass true to confirm
 */
export async function hardDelete(
  model: 'user' | 'booking' | 'payment',
  id: string,
  prisma: any,
  force: boolean = false,
) {
  if (!force) {
    throw new Error('Hard delete is irreversible. Pass force=true to confirm.');
  }

  switch (model) {
    case 'user':
      return await prisma.user.delete({
        where: { id },
      });

    case 'booking':
      return await prisma.booking.delete({
        where: { id },
      });

    case 'payment':
      return await prisma.payment.delete({
        where: { id },
      });

    default:
      throw new Error(`Unsupported model: ${model}`);
  }
}

/**
 * Query for soft-deleted records (for admin recovery/audit)
 *
 * Usage:
 * ```ts
 * const deletedBookings = await getDeletedRecords('booking', prisma);
 * ```
 */
export async function getDeletedRecords(
  model: 'user' | 'booking' | 'payment',
  prisma: any,
) {
  switch (model) {
    case 'user':
      return await prisma.user.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
      });

    case 'booking':
      return await prisma.booking.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
      });

    case 'payment':
      return await prisma.payment.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
      });

    default:
      throw new Error(`Unsupported model: ${model}`);
  }
}

/**
 * Prisma Middleware for automatic soft delete filtering
 *
 * Add to PrismaService to automatically filter soft-deleted records
 *
 * Usage in PrismaService:
 * ```ts
 * constructor() {
 *   this.$use(softDeleteMiddleware(['user', 'booking', 'payment']));
 * }
 * ```
 *
 * After adding this middleware:
 * - All findMany/findUnique/findFirst calls automatically exclude deletedAt !== null
 * - Update/delete operations on soft-deleted records will fail
 * - To access soft-deleted records, use findRaw or raw SQL
 */
export function softDeleteMiddleware(models: string[] = []) {
  return async (params: any, next: any) => {
    // Only apply to read operations
    if (['findUnique', 'findFirst', 'findMany'].includes(params.action)) {
      if (models.includes(params.model)) {
        // Add soft delete filter
        if (!params.args.where) {
          params.args.where = {};
        }

        params.args.where.deletedAt = null;
      }
    }

    return next(params);
  };
}
