# Architecture & Tradeoffs

The system uses a LiveKit Agents pipeline architecture combining separate best-in-class models: Deepgram for Speech-to-Text (STT), OpenAI GPT-4o-mini for the Language Model (LLM), and Cartesia for Text-to-Speech (TTS). LiveKit's `VoicePipelineAgent` manages the turn-taking, barge-in detection (via Silero VAD), and orchestration between these components. Telephony is handled via LiveKit's SIP integration, allowing outbound calls directly to the PSTN without relying on external dialers.

**Tradeoffs & Choices:**
- **Pipeline vs Real-time:** We chose the pipeline architecture (STT -> LLM -> TTS) as required by the constraints over end-to-end models (like OpenAI Realtime). While pipeline mode incurs slightly higher latency due to sequential processing, it allows fine-grained control over individual components, logging, and state management.
- **TTS Provider:** Cartesia was chosen for TTS over ElevenLabs due to its exceptionally low latency (often sub-150ms time-to-first-byte), which is critical for realistic conversational flow and handling interruptions smoothly.
- **Turn Detection:** Silero VAD is used for accurate turn detection. It offers a good balance between speed and accuracy for barge-in detection, minimizing false positives from background noise compared to simple energy-based VAD.
- **LLM Choice:** GPT-4o-mini is used as it provides the optimal balance of speed, cost, and reasoning capability needed for realistic patient simulations.
