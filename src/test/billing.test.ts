import { describe, expect, it } from "vitest";
import { getBillableOvertimeMinutes, getFinalAmount, getGraceMsLeft, getOvertimeCharge, getPerMinuteRate } from "@/lib/billing";
import type { Service, ServicePrice, Session } from "@/types";

const ps5: Service = { id: "ps5", name: "PS5", type: "console" };
const snooker: Service = { id: "snooker", name: "Snooker", type: "table" };
const tariff: ServicePrice = { id: "custom-hour", service_id: "custom", duration_minutes: 60, price: 180 };
const activeSession = (overrides: Partial<Session> = {}): Session => ({
  id: "session", customer_name: "Cust 1", phone: "", service_id: "ps5", start_time: 0,
  expected_end_time: 1_000_000, status: "active", base_charge: 150, controllers: 2, ...overrides,
});

describe("overtime billing", () => {
  it("keeps the first ten overtime minutes free and reports remaining grace", () => {
    const session = activeSession();
    expect(getGraceMsLeft(session, undefined, 1_300_000)).toBe(300_000);
    expect(getOvertimeCharge(session, ps5, [], undefined, 1_300_000)).toBe(0);
    expect(getBillableOvertimeMinutes(session, undefined, 1_300_000)).toBe(0);
  });

  it("charges PS5 at ₹2.5 per minute only after grace", () => {
    const session = activeSession();
    expect(getPerMinuteRate(ps5, session, [])).toBe(2.5);
    expect(getOvertimeCharge(session, ps5, [], undefined, 1_720_000)).toBe(5);
  });

  it("uses ₹250 per hour for snooker and PS5 with four controllers", () => {
    expect(getPerMinuteRate(snooker, activeSession(), [])).toBeCloseTo(250 / 60);
    expect(getPerMinuteRate(ps5, activeSession({ controllers: 4 }), [])).toBeCloseTo(250 / 60);
  });

  it("uses the custom service's sixty-minute tariff for its hourly rate", () => {
    const custom: Service = { id: "custom", name: "VR Booth", type: "vr" };
    expect(getPerMinuteRate(custom, activeSession({ service_id: "custom" }), [tariff])).toBe(3);
  });

  it("rounds fractional overtime only at the final amount", () => {
    expect(getFinalAmount(150, 50, 0, null, 5.4)).toBe(205);
    expect(getFinalAmount(150, 50, 0, 299.6, 20)).toBe(300);
  });
});