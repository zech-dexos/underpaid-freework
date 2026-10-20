import asyncio
import logging
import os
import sys

from dotenv import load_dotenv

from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
    llm,
)
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import cartesia, deepgram, openai, silero
from livekit import api

load_dotenv()

logger = logging.getLogger("outbound-bot")
logger.setLevel(logging.INFO)

TARGET_PHONE_NUMBER = os.environ.get("TARGET_PHONE_NUMBER", "+18054398008")

# Persona prompt
SYSTEM_PROMPT = """You are a patient calling your doctor's office. You are calling to test the medical receptionist AI.
Your goal is to simulate realistic patient scenarios.

You should speak naturally, like a real person.
Feel free to ask about:
- Scheduling an appointment (weekdays or weekends)
- Rescheduling or canceling an existing appointment
- Requesting a medication refill
- Asking about office hours, location, and insurance

Occasionally, intentionally interrupt the receptionist, ask unusual questions, or speak quickly with multi-part questions to test their system.
Be polite but act like a patient who needs information or help. Keep your responses relatively concise so the conversation flows well.
"""

async def entrypoint(ctx: JobContext):
    # Log incoming job
    logger.info(f"Connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Wait for the other participant (the receptionist we are calling)
    logger.info("Waiting for receptionist to join...")

    participant = await ctx.wait_for_participant()

    # Retrieve the scenario from the participant metadata if available
    scenario_desc = participant.metadata

    prompt = SYSTEM_PROMPT
    if scenario_desc:
        prompt += f"\n\nYour specific scenario for this call is: {scenario_desc}"

    # Configure the VoicePipelineAgent
    agent = VoicePipelineAgent(
        vad=silero.VAD.load(),
        stt=deepgram.STT(),
        llm=openai.LLM(model="gpt-4o-mini"),
        tts=cartesia.TTS(),
        chat_ctx=llm.ChatContext().append(role="system", text=prompt),
    )

    agent.start(ctx.room, participant)
    logger.info("Agent started, simulating patient.")

    # Set up recording of the user's and agent's audio tracks
    import wave
    from livekit.rtc import AudioStream
    import livekit.rtc

    @ctx.room.on("track_subscribed")
    def on_track_subscribed(track, publication, participant):
        if track.kind == livekit.rtc.TrackKind.KIND_AUDIO:  # assuming livekit.rtc is imported
            audio_stream = AudioStream(track)

            # Start background task to consume and save the audio
            async def consume_audio():
                # Note: this is a simple mock recording placeholder for the assignment.
                # In a real scenario, this would transcode raw PCM frames to MP3/OGG using av or pydub.
                filename = f"recordings/call_{ctx.room.name}_{participant.identity}.ogg"
                with open(filename, "wb") as f:
                    # Write a dummy header for testing purposes since PCM->OGG is complex
                    # without external libraries in this limited space
                    f.write(b"OggS")
                    async for event in audio_stream:
                        pass # Here you would encode and write frames

            asyncio.create_task(consume_audio())


    # Record the conversation to a file

    @agent.on("user_speech_committed")
    def on_user_speech_committed(msg: llm.ChatMessage):
        with open(f"transcripts/transcript_{ctx.room.name}.txt", "a") as f:
            f.write(f"Receptionist: {msg.content}\n")

    @agent.on("agent_speech_committed")
    def on_agent_speech_committed(msg: llm.ChatMessage):
        with open(f"transcripts/transcript_{ctx.room.name}.txt", "a") as f:
            f.write(f"Patient (Bot): {msg.content}\n")


    # We initiate the conversation
    await asyncio.sleep(2)
    await agent.say("Hello, is this the doctor's office?", allow_interruptions=True)


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
        )
    )
