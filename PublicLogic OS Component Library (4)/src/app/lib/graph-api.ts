import { graphGet } from "./graph-base";
import { toGraphDateTime } from "./time";

/**
 * Get current user profile
 */
export async function getMe(token: string) {
  return await graphGet(token, "/me?$select=displayName,mail,userPrincipalName");
}

/**
 * Get current user calendar view
 */
export async function getMyCalendarView(token: string, { start, end, top = 10 }: { start: Date, end: Date, top?: number }) {
  const startIso = toGraphDateTime(start);
  const endIso = toGraphDateTime(end);

  const path = `/me/calendarView?startDateTime=${encodeURIComponent(startIso)}&endDateTime=${encodeURIComponent(endIso)}&$top=${top}&$select=subject,organizer,start,end,location,isCancelled,isAllDay,onlineMeeting,webLink`;
  const res = await graphGet(token, path);
  return res?.value || [];
}

/**
 * Get specific user calendar view (requires delegated or application permissions)
 */
export async function getUserCalendarView(token: string, { userEmail, start, end, top = 10 }: { userEmail: string, start: Date, end: Date, top?: number }) {
  const startIso = toGraphDateTime(start);
  const endIso = toGraphDateTime(end);

  const safeUser = encodeURIComponent(userEmail);
  const path = `/users/${safeUser}/calendarView?startDateTime=${encodeURIComponent(startIso)}&endDateTime=${encodeURIComponent(endIso)}&$top=${top}&$select=subject,organizer,start,end,location,isCancelled,isAllDay,webLink`;
  const res = await graphGet(token, path);
  return res?.value || [];
}
