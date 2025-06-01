export interface WorkingHours {
  start: string; // HH:MM format
  end: string; // HH:MM format
}

export interface AppointmentDuration {
  first_visit: number; // minutes
  follow_up: number; // minutes
}

// Domyślne godziny pracy (9:00 - 17:00)
export const DEFAULT_WORKING_HOURS: WorkingHours = {
  start: "09:00",
  end: "17:00",
};

// Czas trwania różnych typów wizyt
export const APPOINTMENT_DURATIONS: AppointmentDuration = {
  first_visit: 120, // 2 godziny
  follow_up: 60, // 1 godzina
};

/**
 * Konwertuje czas w formacie HH:MM na minuty od północy
 * @param time - czas w formacie HH:MM (np. "09:30")
 * @returns liczba minut od północy
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Konwertuje minuty od północy na format HH:MM
 * @param minutes - liczba minut od północy
 * @returns czas w formacie HH:MM
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Waliduje czy czas jest w poprawnym formacie HH:MM
 * @param time - czas do walidacji
 * @returns true jeśli format jest poprawny
 */
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}
