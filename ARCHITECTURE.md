# Architecture and Tradeoffs

## Intended pipeline

The prototype uses a LiveKit Agents pipeline with separate components:

1. Telephony/session: LiveKit SIP creates an outbound participant in a LiveKit room.
2. Speech recognition: Deepgram STT converts the remote participant's speech to text.
3. Language model: OpenAI GPT-4o-mini generates the patient-bot response.
4. Speech synthesis: Cartesia TTS renders the response as audio.
5. Voice activity detection: Silero VAD supports turn handling through the LiveKit pipeline.
6. Observability: transcript event hooks write committed utterances, and an audio-track consumer attempts to save the subscribed remote track.

This is a pipeline architecture, not an end-to-end speech-to-speech realtime model. Separation makes providers independently replaceable and can simplify component-level debugging, but introduces stage-to-stage latency and more integration points.

## Design choices and tradeoffs

- Pipeline over realtime speech-to-speech: required by the challenge and useful for isolating STT, reasoning, and TTS behavior. It can increase total response latency.
- Deepgram STT: allows recognized text to be inspected and compared with what was spoken.
- GPT-4o-mini: a cost-conscious LLM choice for scenario-driven conversations. Suitability and response quality have not been benchmarked here.
- Cartesia TTS: keeps speech synthesis independent from the LLM. No latency claim is made without measurements from actual calls.
- Silero VAD / LiveKit pipeline: intended to support turn detection and interruption handling. Barge-in behavior must be measured in real calls.
- LiveKit SIP: provides the telephony path. A valid outbound trunk, provider permissions, and credentials are required.

## Known implementation limits

- The current audio recorder consumes the subscribed remote participant's audio track only. It does not demonstrate synchronized two-sided recording.
- Transcript event hooks are present but have not been validated against real calls for completeness, ordering, speaker attribution, or final flush behavior.
- Scenario text is passed through participant metadata; the runtime behavior of that path has not been confirmed end-to-end.
- The runner initiates scenarios with a delay between attempts, but does not receive or validate an explicit call-finished signal before continuing.
- No measured latency, interruption, transcription-accuracy, or call-success results are available in this repository.

## Next engineering steps

1. Add per-call lifecycle state and wait for call completion or a bounded timeout before starting another scenario.
2. Record both local generated audio and remote received audio, or use a supported server-side composite recording mechanism; verify synchronization and playback.
3. Persist per-call metadata (scenario, room ID, timestamps, result, failure reason) alongside artifacts.
4. Test one call manually before enabling a batch.
5. Capture ten real calls, listen to the recordings, and validate each transcript against its audio.
6. Record measured results and distinguish observed defects from hypotheses in BUGS.md.

## Evidence standard

Architecture choices describe intended design. They are not proof that a provider integration, call, recording, transcript, or latency target has succeeded. Those claims require reproducible runtime evidence.
