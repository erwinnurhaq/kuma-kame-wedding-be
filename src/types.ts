import { t } from 'elysia';
import { PAGINATION_CONFIG, SECURITY_CONFIG } from './config';

const defaultPageLimitObject = {
  page: t.Optional(t.Number({ minimum: PAGINATION_CONFIG.DEFAULT_PAGE })),
  limit: t.Optional(t.Number({ minimum: PAGINATION_CONFIG.MIN_LIMIT, maximum: PAGINATION_CONFIG.MAX_LIMIT })),
};

const attendanceSortOrderObject = {
  sortBy: t.Optional(t.Union([t.Literal('name'), t.Literal('attendance'), t.Literal('totalGuests'), t.Literal('createdAt')])),
  order: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
};

export const attendanceSortOrderParams = t.Object(attendanceSortOrderObject);
export type AttendanceSortOrderParams = typeof attendanceSortOrderParams.static;

export const attendancePaginationParams = t.Object({
  ...defaultPageLimitObject,
  ...attendanceSortOrderObject,
});
export type AttendancePaginationParams = typeof attendancePaginationParams.static;

export const attendanceDTO = t.Object({
  name: t.String({
    minLength: 1,
    maxLength: SECURITY_CONFIG.MAX_NAME_LENGTH,
  }),
  attendance: t.Union([t.Literal('yes'), t.Literal('no'), t.Literal('maybe')]),
  totalGuests: t.Number({
    minimum: 0,
    maximum: SECURITY_CONFIG.MAX_TOTAL_GUESTS,
  }),
  message: t.Optional(t.String({ maxLength: SECURITY_CONFIG.MAX_MESSAGE_LENGTH })),
});
export type AttendanceDTO = typeof attendanceDTO.static;

export type Attendance = {
  id: number;
  uuid: string;
  name: string;
  attendance: 'yes' | 'no' | 'maybe';
  totalGuests: number;
  message: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaginationResult<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};
