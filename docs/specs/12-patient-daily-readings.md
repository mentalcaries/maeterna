# Patient Daily Readings

Patients record glucose and blood-pressure readings in a daily worksheet rather
than a one-reading form. The worksheet starts on today, allows only today and
past dates, and lets patients move one day at a time or jump to a date with the
existing calendar popover.

Glucose has fasted, post-breakfast, post-lunch, and post-dinner slots. Blood
pressure has morning and evening slots. Completed fields save automatically on
blur and provide saving, saved, and retry states. Clearing a saved slot asks for
confirmation before deleting it.

Readings gain nullable `readingDate` and `slot` metadata. Structured metadata
is authoritative for the worksheet. Existing readings use the existing
timestamp-based slot inference as a fallback. A three-reading post-meal batch
that collides in one inferred slot is assigned breakfast, lunch, and dinner in
creation order; ambiguous one- and two-reading collisions stay legacy data.
