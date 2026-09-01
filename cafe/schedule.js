(function initializeCafeSchedule(global) {
    const KYIV_TIME_ZONE = 'Europe/Kyiv';
    const EVENT_HOUR = 19;
    const EVENT_MINUTE = 20;
    const EVENT_DURATION_MS = (2 * 60 + 10) * 60 * 1000;

    const partsFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: KYIV_TIME_ZONE,
        weekday: 'short',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    });

    function getKyivParts(date) {
        const values = {};
        for (const part of partsFormatter.formatToParts(date)) {
            if (part.type !== 'literal') values[part.type] = part.value;
        }

        return {
            day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(values.weekday),
            year: Number(values.year),
            month: Number(values.month),
            dayOfMonth: Number(values.day),
            hour: Number(values.hour),
            minute: Number(values.minute),
            second: Number(values.second)
        };
    }

    function kyivDateTimeToDate({ year, month, day, hour = 0, minute = 0, second = 0 }) {
        const desiredUtc = Date.UTC(year, month - 1, day, hour, minute, second);
        let instant = new Date(desiredUtc);

        // Recalculate twice so a DST boundary cannot leave us using the offset
        // from the initial UTC guess rather than the requested Kyiv wall time.
        for (let attempt = 0; attempt < 2; attempt += 1) {
            const actual = getKyivParts(instant);
            const actualAsUtc = Date.UTC(
                actual.year,
                actual.month - 1,
                actual.dayOfMonth,
                actual.hour,
                actual.minute,
                actual.second
            );
            instant = new Date(instant.getTime() + desiredUtc - actualAsUtc);
        }

        return instant;
    }

    function parseDateOnly(value) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        if (!match) return null;
        return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
    }

    function eventStartForDate(dateParts) {
        return kyivDateTimeToDate({
            ...dateParts,
            hour: EVENT_HOUR,
            minute: EVENT_MINUTE
        });
    }

    function getNextEventDate(now = new Date(), configuredDates = []) {
        if (!Array.isArray(configuredDates)) return null;

        const candidates = [];
        for (const value of configuredDates) {
            const dateParts = parseDateOnly(value);
            if (!dateParts) continue;

            const candidate = eventStartForDate(dateParts);
            if (now.getTime() < candidate.getTime() + EVENT_DURATION_MS) {
                candidates.push(candidate);
            }
        }

        if (candidates.length === 0) return null;

        candidates.sort((a, b) => a.getTime() - b.getTime());
        return candidates[0];
    }

    function formatKyivDate(date, locale = 'uk-UA') {
        if (!date) return '';
        return new Intl.DateTimeFormat(locale, {
            timeZone: KYIV_TIME_ZONE,
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        }).format(date);
    }

    function formatCountdown(diffMs) {
        if (typeof diffMs !== 'number' || diffMs <= 0 || isNaN(diffMs)) return '';

        const days = Math.floor(diffMs / 86400000);
        const hours = Math.floor((diffMs % 86400000) / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);

        if (days === 0 && hours === 0 && mins === 0) {
            const secs = Math.max(1, Math.floor((diffMs % 60000) / 1000));
            return `${secs}с`;
        }

        let countdown = '';
        if (days > 0) countdown += `${days}д `;
        if (hours > 0) countdown += `${hours}г `;
        countdown += `${mins}хв`;
        return countdown;
    }

    function formatCalendarDate(date) {
        const parts = getKyivParts(date);
        return `${parts.year}${String(parts.month).padStart(2, '0')}${String(parts.dayOfMonth).padStart(2, '0')}` +
            `T${String(parts.hour).padStart(2, '0')}${String(parts.minute).padStart(2, '0')}${String(parts.second).padStart(2, '0')}`;
    }

    function getCalendarRange(start) {
        if (!start) return '';
        const end = new Date(start.getTime() + EVENT_DURATION_MS);
        return `${formatCalendarDate(start)}/${formatCalendarDate(end)}`;
    }

    global.CafeSchedule = Object.freeze({
        EVENT_DURATION_MS,
        KYIV_TIME_ZONE,
        formatCountdown,
        formatKyivDate,
        getCalendarRange,
        getKyivParts,
        getNextEventDate,
        kyivDateTimeToDate
    });
})(globalThis);
