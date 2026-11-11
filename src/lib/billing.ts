import type { Service, ServicePrice, Session, Setting } from "@/types";

export const DEFAULT_GRACE_MINUTES = 10;

function setting(settings: Setting[] | Record<string, string> | undefined, key: string, fallback: number): number {
  const value = Array.isArray(settings) ? settings.find((item) => item.key === key)?.value : settings?.[key];
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getGracePeriodMinutes(settings?: Setting[] | Record<string, string>): number {
  return Math.max(0, setting(settings, "overtime_grace_minutes", DEFAULT_GRACE_MINUTES));
}

export function getPerMinuteRate(service: Service | undefined, session: Session, tariffs: ServicePrice[], settings?: Setting[] | Record<string, string>): number {
  const name = (service?.name ?? "").toLowerCase();
  if (name.includes("snooker")) return setting(settings, "overtime_rate_snooker", 250 / 60);
  if (name === "ps5" && session.controllers >= 3) return setting(settings, "overtime_rate_ps5_4c", 250 / 60);
  if (name === "ps5") return setting(settings, "overtime_rate_ps5", 150 / 60);
  const overrideKey = `overtime_rate_service_${service?.id ?? ""}`;
  const override = setting(settings, overrideKey, Number.NaN);
  if (Number.isFinite(override)) return override;
  const hourly = tariffs.find((tariff) => tariff.service_id === service?.id && tariff.duration_minutes === 60)
    ?? tariffs.filter((tariff) => tariff.service_id === service?.id).sort((a, b) => a.duration_minutes - b.duration_minutes)[0];
  return hourly ? hourly.price / hourly.duration_minutes : 0;
}

export function getOvertimeMs(session: Session, now = Date.now()): number {
  if (session.status !== "active" || session.overtime_waived) return 0;
  return Math.max(0, now - session.expected_end_time);
}

export function getGraceMsLeft(session: Session, settings?: Setting[] | Record<string, string>, now = Date.now()): number {
  const graceMs = getGracePeriodMinutes(settings) * 60_000;
  return Math.max(0, graceMs - getOvertimeMs(session, now));
}

export function getBillableOvertimeMinutes(session: Session, settings?: Setting[] | Record<string, string>, now = Date.now()): number {
  const billableMs = Math.max(0, getOvertimeMs(session, now) - getGracePeriodMinutes(settings) * 60_000);
  return billableMs / 60_000;
}

export function getOvertimeCharge(session: Session, service: Service | undefined, tariffs: ServicePrice[], settings?: Setting[] | Record<string, string>, now = Date.now()): number {
  return session.overtime_waived ? 0 : getBillableOvertimeMinutes(session, settings, now) * getPerMinuteRate(service, session, tariffs, settings);
}

export function getExtensionCharge(sessionId: string, extensions: { session_id: string; added_cost: number }[]): number {
  return extensions.filter((extension) => extension.session_id === sessionId).reduce((total, extension) => total + extension.added_cost, 0);
}

export function getAccruedCharge(session: Session, service: Service | undefined, tariffs: ServicePrice[], extensions: { session_id: string; added_cost: number }[], settings?: Setting[] | Record<string, string>, now = Date.now()): number {
  return session.base_charge + getExtensionCharge(session.id, extensions) + Math.round(getOvertimeCharge(session, service, tariffs, settings, now));
}

export function getFinalAmount(gaming: number, food: number, discount: number, manualOverride: number | null, overtime = 0): number {
  return Math.max(0, manualOverride === null ? Math.round(gaming + food + Math.round(overtime) - discount) : Math.round(manualOverride));
}

export function getSessionState(session: Session, now = Date.now(), settings?: Setting[] | Record<string, string>): "in-time" | "closing" | "overtime" {
  if (now >= session.expected_end_time) return "overtime";
  if (session.expected_end_time - now <= 10 * 60_000) return "closing";
  return "in-time";
}