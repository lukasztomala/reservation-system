/**
 * Utility functions for date and time calculations
 */

/**
 * Calculates the end time for an appointment based on its type
 * @param startTime ISO8601 formatted start time
 * @param appointmentType Type of appointment (first_visit or follow_up)
 * @returns ISO8601 formatted end time
 */
export function calculateEndTime(startTime: string, appointmentType: "first_visit" | "follow_up"): string {
  const start = new Date(startTime);

  // Validate that startTime is a valid date
  if (isNaN(start.getTime())) {
    throw new Error("Invalid start time format");
  }

  // Determine duration based on appointment type
  const durationMinutes = appointmentType === "first_visit" ? 120 : 60;

  // Calculate end time
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  return end.toISOString();
}

/**
 * Validates that a given time is in the future
 * @param timeString ISO8601 formatted time string
 * @returns true if time is in the future
 */
export function isTimeInFuture(timeString: string): boolean {
  const time = new Date(timeString);
  const now = new Date();

  return time > now;
}

/**
 * Checks if two time ranges overlap
 * @param start1 Start time of first range (ISO8601)
 * @param end1 End time of first range (ISO8601)
 * @param start2 Start time of second range (ISO8601)
 * @param end2 End time of second range (ISO8601)
 * @returns true if ranges overlap
 */
export function timeRangesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = new Date(start1);
  const e1 = new Date(end1);
  const s2 = new Date(start2);
  const e2 = new Date(end2);

  // Two ranges overlap if one starts before the other ends and vice versa
  return s1 < e2 && s2 < e1;
}
