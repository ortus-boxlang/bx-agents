# Schedules Cron Out-Of-Range Fixture

Used to test that a syntactically valid (per the 5-field regex) but
semantically out-of-range day-of-week value (9 - valid values are 0-7)
errors clearly at generation time, rather than being silently passed through
to `everyWeekOn()`.
