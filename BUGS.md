# Bug Report and Verification Log

## Scope and evidence status

No end-to-end live call results have been verified in this repository. Earlier notes about a date-change loop and a three-second interruption delay were not backed by validated call artifacts and are not reported as confirmed bugs.

The following are implementation risks identified by code inspection. Runtime behavior still requires verification.

## B-001 — Recording captures only the remote participant track

- Severity: High for the challenge's evidence requirements
- Status: Confirmed by code inspection; runtime output not tested
- Evidence: bot.py subscribes to an audio track and writes that track to an OGG file. There is no corresponding capture path for the bot's generated/local audio.
- Impact: The resulting file cannot be assumed to contain both sides of the conversation.
- Next step: Implement and verify two-sided capture or supported composite recording; listen to the output and confirm both speakers are present.

## B-002 — Runner does not wait for call completion

- Severity: High for test reliability
- Status: Confirmed by code inspection; impact not runtime-tested
- Evidence: runner.py waits a fixed interval after initiating a call and then proceeds, without observing an explicit end-of-call state.
- Impact: Calls can overlap or scenarios can be associated with the wrong artifacts.
- Next step: Track each room/call lifecycle and wait for participant departure or a bounded timeout before continuing.

## B-003 — Transcript completeness and speaker labels are unverified

- Severity: High for evidence quality
- Status: Unverified
- Evidence: Transcript output is written from agent speech-committed events. No real-call transcript/audio pair is available to validate ordering, completeness, and labels.
- Impact: The transcript may not reliably reflect the full conversation.
- Next step: Compare each generated transcript with its actual audio and document omissions or misattributions.

## B-004 — Scenario metadata path is unverified

- Severity: Medium
- Status: Unverified
- Evidence: runner.py places scenario text in SIP participant metadata and bot.py reads participant metadata after waiting for a participant.
- Impact: If metadata is not exposed as expected in the deployed SDK/provider path, calls may use only the generic prompt.
- Next step: Log the received scenario identifier and verify behavior in a single controlled call.

## B-005 — Dependency and clean-install reproducibility

- Severity: Medium
- Status: Dependency gaps identified by inspection; clean install not run
- Evidence: bot.py imports PyAV (av) and NumPy (numpy) for recording, but these were not listed explicitly in the original requirements file.
- Impact: Recording setup may fail in a clean environment.
- Next step: Install from requirements.txt in a clean virtual environment and record the Python/platform versions and result.

## Live-call results

No confirmed live-call observations are recorded yet. Add each finding only after capturing:
- scenario and call/room identifier;
- date/time and relevant environment versions;
- expected behavior;
- actual behavior;
- transcript excerpt and timestamp;
- corresponding audio artifact;
- severity, reproducibility, and retest result.

Do not commit patient-identifiable information or secrets.
