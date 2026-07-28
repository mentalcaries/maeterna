# Patient Profile Pictures

## Context

Doctors currently identify patients by name alone on the dashboard patient list
and the patient detail header. Faster visual recognition would reduce cognitive
load and misidentification risk during triage.

Profile pictures are entirely optional and patient-controlled. When absent, a
coloured initials avatar (patient-chosen colour) is used. Storage is in a
private R2 bucket and access is via short-lived signed URLs.

## Settled Behavior

1. Patients may upload, crop, replace, or remove their own profile picture at
   any time from `/patient/settings`.
2. Uploaded images are compressed client-side to 512×512 WebP, target ~200 KB;
   the API rejects objects larger than 500 KB.
3. Images live in a private R2 bucket. The API returns short-lived (1 h)
   presigned GET URLs on the `PatientSchema.avatarUrl` field.
4. When no image is set, the doctor and patient see a coloured circle
   containing the patient's initials (`firstName[0] + lastName[0]`, uppercase).
   If neither initial is present, a `?` is shown.
5. Patients pick their background colour from a fixed palette of seven swatches
   derived from the existing `--chart-*`, `--primary`, and `--secondary`
   variables. The chosen slug persists on `user.avatarBackgroundColor`.
6. Doctors can click a patient avatar (in the dashboard row or the detail
   header) to open a lightbox showing the full-resolution image.
7. Cropping uses `react-easy-crop` with a 1:1 aspect ratio and touch-friendly
   pinch/pan/zoom on mobile.

## Implementation

### Data

- `user.image` (existing, nullable text) is repurposed to store the R2 object
  key (e.g. `avatars/{userId}/{uuid}.webp`), not a full URL.
- New nullable column `user.avatarBackgroundColor` (text) holds one of the
  palette slugs.

### API

- `POST /me/avatar/upload-url` — returns a 5-minute presigned PUT with a
  content-length range of 0–500 KB and `image/webp` content type.
- `POST /me/avatar/confirm` — server verifies the uploaded object's size and
  content type via HEAD, then writes `user.image = objectKey`.
- `DELETE /me/avatar` — clears `user.image` and deletes the R2 object.
- `PATCH /me/avatar/background` — updates `user.avatarBackgroundColor`.
- `PatientSchema.avatarUrl` maps `user.image` → presigned GET (1 h TTL).
- `PatientSchema` also gains `avatarBackgroundColor` and computed `initials`.

Presigning is handled by `aws4fetch` against R2's S3 API; the R2 binding
itself is used only for HEAD and DELETE operations.

### Web

- `<Avatar>` — shared component; renders the image if present, else a coloured
  circle with initials.
- `<AvatarLightbox>` — wraps the existing `Dialog` primitive for the doctor's
  click-to-enlarge view.
- `<AvatarEditor>` — patient-only; file input (with mobile camera capture),
  crop, compress, upload, remove, background-colour picker.

### Integration Points

- `patient/settings.tsx` — new `<AvatarEditor />` section above the name
  fields.
- `doctor/dashboard.tsx` — small `<Avatar>` prepended to each patient row.
- `doctor/patients/$id.tsx` — larger `<Avatar>` in the detail header.

### Commit Sequence

1. Add R2 binding, presign helper, and this spec doc.
2. Add `avatarBackgroundColor` column and repurpose `user.image`; generate
   Drizzle migration.
3. Add avatar upload/confirm/delete/background endpoints and update
   `PatientSchema`.
4. Add shared `Avatar` and `AvatarLightbox` components.
5. Add `AvatarEditor` and wire into patient settings.
6. Show avatars in doctor dashboard and detail header.
