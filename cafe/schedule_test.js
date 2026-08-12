import './schedule.js';

const { getCalendarRange, getKyivParts, getNextEventDate, kyivDateTimeToDate } = globalThis.CafeSchedule;

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, received ${actual}`);
    }
}

Deno.test('converts summer Kyiv wall time to the correct instant', () => {
    const event = kyivDateTimeToDate({ year: 2026, month: 8, day: 13, hour: 19, minute: 20 });
    assertEquals(event.toISOString(), '2026-08-13T16:20:00.000Z', 'summer event instant');
});

Deno.test('converts winter Kyiv wall time to the correct instant', () => {
    const event = kyivDateTimeToDate({ year: 2026, month: 1, day: 8, hour: 19, minute: 20 });
    assertEquals(event.toISOString(), '2026-01-08T17:20:00.000Z', 'winter event instant');
});

Deno.test('configured dates remain Kyiv dates regardless of the visitor timezone', () => {
    const event = getNextEventDate(new Date('2026-08-13T15:00:00Z'), ['2026-08-13']);
    const parts = getKyivParts(event);
    assertEquals(`${parts.year}-${parts.month}-${parts.dayOfMonth} ${parts.hour}:${parts.minute}`, '2026-8-13 19:20', 'Kyiv wall time');
});

Deno.test('keeps the current event active until 21:30 Kyiv', () => {
    const event = getNextEventDate(new Date('2026-01-08T18:30:00Z'), ['2026-01-08']);
    assertEquals(event.toISOString(), '2026-01-08T17:20:00.000Z', 'active winter event');
});

Deno.test('calendar range uses Kyiv wall time', () => {
    const event = new Date('2026-08-13T16:20:00Z');
    assertEquals(getCalendarRange(event), '20260813T192000/20260813T213000', 'calendar range');
});
