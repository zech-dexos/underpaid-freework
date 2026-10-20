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


    # Set up recording of the audio tracks
    from livekit.rtc import AudioStream
    import livekit.rtc
    import av
    import os

    @ctx.room.on("track_subscribed")
    def on_track_subscribed(track, publication, participant):
        if track.kind == livekit.rtc.TrackKind.KIND_AUDIO:
            audio_stream = AudioStream(track)

            async def consume_audio():
                filename = f"recordings/call_{ctx.room.name}_{participant.identity}.ogg"
                os.makedirs("recordings", exist_ok=True)

                # Setup PyAV output container
                container = av.open(filename, mode='w')
                stream = container.add_stream('libvorbis', rate=48000)

                try:
                    async for audio_frame in audio_stream:
                        # Extract the underlying rtc.AudioFrame data
                        rtc_frame = audio_frame.frame

                        # Create an PyAV AudioFrame
                        # The rtc.AudioFrame has properties: sample_rate, num_channels, samples_per_channel, data
                        import numpy as np

                        # rtc.AudioFrame.data is typically int16
                        # Ensure to format it correctly for PyAV
                        data = np.frombuffer(rtc_frame.data, dtype=np.int16)

                        # If stereo, reshape
                        if rtc_frame.num_channels > 1:
                            data = data.reshape(-1, rtc_frame.num_channels).T
                        else:
                            data = data.reshape(1, -1)

                        av_frame = av.AudioFrame.from_ndarray(data, format='s16', layout='stereo' if rtc_frame.num_channels > 1 else 'mono')
                        av_frame.sample_rate = rtc_frame.sample_rate

                        # Encode and mux
                        for packet in stream.encode(av_frame):
                            container.mux(packet)
                except asyncio.CancelledError:
                    pass
                finally:
                    # Flush and close
                    for packet in stream.encode(None):
                        container.mux(packet)
                    container.close()

            # Run in background
            task = asyncio.create_task(consume_audio())

            # Save task to context to prevent garbage collection and allow cancellation if needed
            if not hasattr(ctx, "recording_tasks"):
                ctx.recording_tasks = []
            ctx.recording_tasks.append(task)



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
