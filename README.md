# Automated Voice Bot Challenge

A Python/LiveKit prototype for outbound test calls to a medical receptionist agent, using separate speech-to-text, language-model, and text-to-speech stages.

## Current status

This is a **prototype, not a verified completed test run**. No claim is made that the ten required live calls, two-sided audio capture, validated transcripts, or Loom recordings are complete. The original audio and transcript files were placeholders, not evidence; see SUBMISSION_STATUS.md.

The code has not been verified end-to-end against a configured LiveKit SIP trunk. Treat runtime behavior as unverified until the checklist below is completed.

## Architecture

- Telephony and rooms: LiveKit SIP
- Speech-to-text: Deepgram
- LLM: OpenAI GPT-4o-mini
- Text-to-speech: Cartesia
- Voice activity detection: Silero
- Orchestration: LiveKit Agents pipeline (VoicePipelineAgent)

This intentionally uses separate STT, LLM, and TTS components rather than a speech-to-speech realtime model.

## Requirements

- Python 3.10+
- A LiveKit project with outbound SIP configured
- API credentials for LiveKit, Deepgram, OpenAI, and Cartesia
- Outbound calling permission and sufficient provider credits

## Setup

1. Create and activate a virtual environment.
2. Install dependencies:

   ```bash
   python -m venv .venv
   # macOS/Linux
   source .venv/bin/activate
   # Windows PowerShell: .venv\Scripts\Activate.ps1
   python -m pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. Copy .env.example to .env and fill in the required credentials. Never commit .env.

Required variables:
- LIVEKIT_URL
- LIVEKIT_API_KEY
- LIVEKIT_API_SECRET
- SIP_TRUNK_ID
- OPENAI_API_KEY
- DEEPGRAM_API_KEY
- CARTESIA_API_KEY

The runner is disabled by default. To authorize outbound calls, set RUN_LIVE_CALLS=true. The destination is fixed in code to the challenge's designated test number, +18054398008. Calls can incur telephony and model costs; confirm permission before enabling them.

## Run

Terminal 1 — start the LiveKit agent worker:

```bash
python bot.py start
```

Terminal 2 — explicitly enable the test runner:

```bash
RUN_LIVE_CALLS=true python runner.py
```

The runner spaces attempts out to reduce overlap, but it does not yet verify that each remote call has fully ended before starting the next. Monitor the run and confirm each call's completion in LiveKit.

## Repository map

- bot.py — pipeline agent, transcript hooks, and remote-track recording prototype
- runner.py — outbound scenario runner, disabled unless explicitly enabled
- ARCHITECTURE.md — design and known implementation limits
- BUGS.md — confirmed versus unverified findings
- SUBMISSION_STATUS.md — checklist of remaining evidence
- recordings/ — destination for real recordings created during a run
- transcripts/ — destination for transcripts created during a run

## Important recording limitation

The current recording implementation subscribes to the remote participant's audio track. It does not yet establish a verified two-sided recording containing both the remote receptionist and the bot's generated speech. Transcript hooks capture committed speech text, but completeness and labeling have not been validated in a live call. Do not present these as completed requirements without testing and correcting this limitation.

## Verification checklist

- [ ] Install dependencies in a clean virtual environment.
- [ ] Confirm the LiveKit worker starts and registers successfully.
- [ ] Confirm one permitted test call connects to the designated number.
- [ ] Verify the agent follows the supplied scenario metadata.
- [ ] Capture both sides of a call and listen to the resulting audio.
- [ ] Compare transcripts against the audio.
- [ ] Verify interruption/barge-in behavior.
- [ ] Complete and review ten distinct 1–3 minute calls.
- [ ] Retain only real test artifacts; never substitute placeholders for evidence.
- [ ] Complete the required Loom videos using the applicant's own voice and webcam.
