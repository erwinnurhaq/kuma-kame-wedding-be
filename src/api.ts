import { Elysia, status, t, ValidationError } from 'elysia';
import { PAGINATION_CONFIG, SECURITY_CONFIG } from './config';
import { generateUUID, isValidUUID } from './utils';
import { logger } from './logger';
import { attendanceDb, db } from './database';
import { ipGetter } from './middleware';
import { attendanceDTO, attendancePaginationParams, attendanceSortOrderParams, type Attendance } from './types';

export const api = new Elysia({
  name: 'main-app',
  prefix: '/api',
})
  // Derive IP and start time for logging
  .use(ipGetter)

  // GET: Paginated attendance
  .get(
    '/attendance',
    ({ query, ip, set }) => {
      try {
        const page = query.page ?? PAGINATION_CONFIG.DEFAULT_PAGE;
        const limit = query.limit ?? PAGINATION_CONFIG.DEFAULT_LIMIT;
        const sortBy = query.sortBy ?? 'createdAt';
        const order = query.order ?? 'desc';
        const offset = (page - 1) * limit;

        // Get total count
        const countResult = attendanceDb.count();
        const total = countResult?.total ?? 0;

        // Calculate total pages before query
        const totalPages = Math.ceil(total / limit);

        // Validate page is within bounds
        if (page > totalPages && totalPages > 0) {
          set.status = 400;
          return {
            error: 'Invalid page',
            message: `Page ${page} does not exist. Total pages: ${totalPages}`,
          };
        }

        // Get paginated data
        const data = attendanceDb.get({ sortBy, order, limit, offset });
        logger.debug('Paginated attendance fetched', {
          ip,
          page,
          limit,
          total,
          resultCount: data.length,
        });

        return {
          data,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        };
      } catch (error) {
        logger.error('Pagination error', error, { ip });
        set.status = 500;
        return {
          error: 'Server error',
          message: 'Failed to fetch attendance',
        };
      }
    },
    {
      query: attendancePaginationParams,
    }
  )

  // GET: All attendance
  .get(
    '/attendance/all',
    ({ query, ip, set }) => {
      try {
        const sortBy = query.sortBy ?? 'createdAt';
        const order = query.order ?? 'desc';

        const data = attendanceDb.getAll({ sortBy, order });
        logger.debug('All attendance fetched', { ip, count: data.length });

        return {
          data,
          total: data.length,
        };
      } catch (error) {
        logger.error('Get all error', error, { ip });
        set.status = 500;
        return {
          error: 'Server error',
          message: 'Failed to fetch attendance',
        };
      }
    },
    {
      query: attendanceSortOrderParams,
    }
  )

  // POST: Create attendance
  .post(
    '/attendance',
    ({ body, ip, set }) => {
      try {
        const uuid = generateUUID();

        // Insert with validated data
        attendanceDb.insert({
          uuid,
          name: body.name,
          attendance: body.attendance,
          totalGuests: body.totalGuests,
          message: body.message,
        });

        // Fetch created record to ensure it was inserted
        const created = attendanceDb.getByUuid(uuid);

        if (!created) {
          set.status = 500;
          logger.error('Failed to fetch created record', undefined, {
            ip,
            uuid,
          });
          return {
            error: 'Server error',
            message: 'Failed to create attendance',
          };
        }

        logger.info('Attendance created', {
          ip,
          uuid,
          name: created.name,
          attendance: created.attendance,
        });

        set.status = 201; // Created
        return {
          uuid: created.uuid,
          name: created.name,
          attendance: created.attendance,
          totalGuests: created.totalGuests,
          message: created.message,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        };
      } catch (error) {
        logger.error('Create error', error, { ip });
        set.status = 400;
        return {
          error: 'Server error',
          message: 'Failed to create attendance',
        };
      }
    },
    {
      body: attendanceDTO,
    }
  )

  // PATCH: Update attendance
  .patch(
    '/attendance/:uuid',
    ({ params, body, ip, set }) => {
      try {
        // Validate UUID format
        if (!isValidUUID(params.uuid)) {
          set.status = 400;
          logger.warn('Invalid UUID format', { ip, uuid: params.uuid });
          return {
            error: 'Invalid UUID',
            message: 'The provided UUID format is invalid',
          };
        }

        // Check if body empty
        if (!body || Object.keys(body).length === 0) {
          set.status = 400;
          logger.warn('Attendance body is empty for update', {
            ip,
            uuid: params.uuid,
          });
          return {
            error: 'Validation error',
            message: 'Invalid request data',
          };
        }

        // Check if exists
        const existing = attendanceDb.getByUuid(params.uuid) as Attendance | undefined;
        if (!existing) {
          set.status = 404;
          logger.warn('Attendance not found for update', {
            ip,
            uuid: params.uuid,
          });
          return {
            error: 'Not found',
            message: 'Attendance record not found',
          };
        }

        // Update with validated data
        const data = { ...existing, ...body };
        const result = attendanceDb.update({
          uuid: data.uuid,
          name: data.name,
          attendance: data.attendance,
          totalGuests: data.totalGuests,
          message: data.message ?? undefined,
        });

        if (result.changes === 0) {
          set.status = 500;
          logger.error('Update failed (no changes)', undefined, {
            ip,
            uuid: params.uuid,
          });
          return {
            error: 'Server error',
            message: 'Failed to update attendance',
          };
        }

        // Fetch updated record
        const updated = attendanceDb.getByUuid(params.uuid) as Attendance | undefined;

        if (!updated) {
          set.status = 500;
          logger.error('Failed to fetch updated record', undefined, {
            ip,
            uuid: params.uuid,
          });
          return {
            error: 'Server error',
            message: 'Failed to fetch updated attendance',
          };
        }

        logger.info('Attendance updated', {
          ip,
          uuid: params.uuid,
          name: updated.name,
          attendance: updated.attendance,
        });

        return {
          uuid: updated.uuid,
          name: updated.name,
          attendance: updated.attendance,
          totalGuests: updated.totalGuests,
          message: updated.message,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        };
      } catch (error) {
        logger.error('Update error', error, { ip, uuid: params.uuid });
        set.status = 400;
        return {
          error: 'Server error',
          message: 'Failed to update attendance',
        };
      }
    },
    {
      params: t.Object({
        uuid: t.String(),
      }),
      body: t.Partial(attendanceDTO),
    }
  )

  // DELETE: Delete attendance
  .delete(
    '/attendance/:uuid',
    ({ params, ip, set }) => {
      try {
        // Validate UUID format
        if (!isValidUUID(params.uuid)) {
          set.status = 400;
          logger.warn('Invalid UUID format', { ip, uuid: params.uuid });
          return {
            error: 'Invalid UUID',
            message: 'The provided UUID format is invalid',
          };
        }

        const result = attendanceDb.delete(params.uuid);

        if (result.changes === 0) {
          set.status = 404;
          logger.warn('Attendance not found for deletion', {
            ip,
            uuid: params.uuid,
          });
          return {
            error: 'Not found',
            message: 'Attendance record not found',
          };
        }

        logger.info('Attendance deleted', { ip, uuid: params.uuid });

        return {
          message: 'Attendance deleted successfully',
          uuid: params.uuid,
        };
      } catch (error) {
        logger.error('Delete error', error, { ip, uuid: params.uuid });
        set.status = 500;
        return {
          error: 'Server error',
          message: 'Failed to delete attendance',
        };
      }
    },
    {
      params: t.Object({
        uuid: t.String(),
      }),
    }
  );
