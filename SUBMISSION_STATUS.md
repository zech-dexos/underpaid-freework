# Submission Status

Last reviewed: 2026-10-20

## Honest status

This repository contains a prototype implementation and documentation. It is not a completed, end-to-end-verified submission.

### Implemented in code (not yet verified live)

- LiveKit Agents pipeline configured with Deepgram STT, OpenAI GPT-4o-mini, Cartesia TTS, and Silero VAD.
- Outbound SIP call runner with ten scenario prompts.
- Transcript event hooks.
- An audio-track recording attempt for the remote participant.
- Setup, architecture, and risk documentation.

### Not yet demonstrated

- A clean installation and successful worker startup.
- A successful live call to the authorized test number.
- Reliable scenario delivery and scenario-specific behavior.
- Two-sided recordings containing both receptionist and bot speech.
- Ten distinct real calls lasting 1–3 minutes each.
- Transcripts validated against the corresponding audio.
- Confirmed, reproducible bugs in the target receptionist.
- The required project walkthrough and AI-debugging Loom recordings.

The files that previously occupied recordings/ and transcripts/ were placeholder data, not call evidence. They have been removed rather than presented as real artifacts.

## Known technical risks

1. The recording implementation currently subscribes to the remote audio track only.
2. The runner uses a fixed spacing delay and does not confirm that a call has ended before initiating the next.
3. Transcript completeness and speaker attribution have not been validated.
4. Scenario metadata propagation has not been verified against a live deployed setup.
5. Dependencies have not been tested in a clean environment; requirements now explicitly include av and numpy for the recording code.

## Recommended verification order

1. Install dependencies in a clean virtual environment.
2. Start the worker and confirm it registers.
3. Make one permitted test call only after checking provider costs and configuration.
4. Inspect room events, scenario delivery, transcript, and audio.
5. Correct the recording path so both sides are captured and verify playback.
6. Fix call lifecycle management before running a batch.
7. Complete ten real scenarios, each with reviewed artifacts.
8. Update BUGS.md only with observations supported by real artifacts.
9. Complete the requested Loom videos.

No live calls were initiated as part of this repository review.
