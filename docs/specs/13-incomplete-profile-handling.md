# Incomplete Profile Handling

Authentication creates a user before onboarding collects a first name, last
name, and patient date of birth. Selecting a role must not make that account
appear as a completed patient profile.

The API accepts only trimmed, non-empty names at profile completion and profile
update boundaries. Patient routes redirect accounts missing either name to the
patient onboarding form. The admin user list displays `Profile incomplete`
instead of a blank name so administrators can distinguish unfinished signups
from data-rendering failures.

Existing incomplete accounts are retained. They complete onboarding on their
next sign-in; no production records are modified by this change.
