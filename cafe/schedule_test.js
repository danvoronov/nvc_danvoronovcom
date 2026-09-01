import './schedule.js';

const { formatCountdown, getCalendarRange, getKyivParts, getNextEventDate, kyivDateTimeToDate } = globalThis.CafeSchedule;

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

Deno.test('formats countdown with days, hours, and minutes', () => {
    assertEquals(formatCountdown(2 * 86400000 + 3 * 3600000 + 15 * 60000), '2д 3г 15хв', 'days hours mins');
});

Deno.test('formats countdown with hours and minutes', () => {
    assertEquals(formatCountdown(4 * 3600000 + 20 * 60000), '4г 20хв', 'hours mins');
});

Deno.test('formats countdown with minutes only', () => {
    assertEquals(formatCountdown(45 * 60000), '45хв', 'mins only');
    assertEquals(formatCountdown(60000), '1хв', '1 min');
});

Deno.test('formats countdown with seconds for the final minute', () => {
    assertEquals(formatCountdown(59000), '59с', '59 secs');
    assertEquals(formatCountdown(1000), '1с', '1 sec');
    assertEquals(formatCountdown(500), '1с', 'sub-second fallback to 1s');
});

Deno.test('formats countdown as empty string when 0 or negative', () => {
    assertEquals(formatCountdown(0), '', 'zero ms');
    assertEquals(formatCountdown(-1000), '', 'negative ms');
});

Deno.test('returns null when configured dates array is empty', () => {
    const event = getNextEventDate(new Date('2026-08-13T15:00:00Z'), []);
    assertEquals(event, null, 'empty configured dates');
});

Deno.test('returns null when all configured dates have passed', () => {
    const event = getNextEventDate(new Date('2026-09-01T12:00:00Z'), ['2026-08-06', '2026-08-13', '2026-08-20', '2026-08-27']);
    assertEquals(event, null, 'all past dates');
});

Deno.test('returns null when configured dates is null or not an array', () => {
    assertEquals(getNextEventDate(new Date('2026-08-13T15:00:00Z'), null), null, 'null configured dates');
    assertEquals(getNextEventDate(new Date('2026-08-13T15:00:00Z'), undefined), null, 'undefined configured dates');
});

Deno.test('selects earliest upcoming date when array is not sorted', () => {
    const event = getNextEventDate(new Date('2026-08-10T12:00:00Z'), ['2026-08-27', '2026-08-13', '2026-08-20']);
    assertEquals(event.toISOString(), '2026-08-13T16:20:00.000Z', 'earliest upcoming date');
});

Deno.test('getCalendarRange and formatKyivDate handle null safely', () => {
    const { formatKyivDate } = globalThis.CafeSchedule;
    assertEquals(getCalendarRange(null), '', 'calendar range null');
    assertEquals(formatKyivDate(null), '', 'formatKyivDate null');
});
