# Patient Dashboard Trends

## Goal

Give patients a calm, mobile-first seven-day view of their glucose and blood
pressure readings from the dashboard without recreating the detailed doctor
charts.

## Scope

- Rename the dashboard action to `Log readings`.
- Add a tabbed `Your trends` card below that action.
- Load up to 200 readings for the selected type from the past seven calendar
  days.
- Link to the existing reading-history page for detailed review.

## Display

The card shows the most recent individual reading and an individual-reading
in-range count. The chart itself uses daily summaries to stay readable:

- Glucose has a fasting line and an after-meals line, where after-meals is the
  average of all post-meal readings on that date.
- Blood pressure has daily average systolic and diastolic lines.
- Lines are gently smoothed, thin, and do not show normal data points by
  default.
- A red marker on a glucose summary line indicates that an individual reading
  for that line's context was high on that date.
- Tapping or hovering a day opens a tooltip containing that date's individual
  readings; summaries never replace the underlying values.

The patient API returns computed severity but not resolved custom thresholds,
so this card does not render normal-range bands or threshold lines.

## Empty And Loading States

The card keeps its compact footprint while loading. If the selected type has
no data, it invites the patient to log readings rather than showing a chart.

## Verification

- Unit-test daily grouping, glucose and BP averages, high-day detection,
  chronological latest-reading selection, and glucose conversion.
- Check the dashboard at narrow mobile and desktop widths.
