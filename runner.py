import asyncio
import os
import uuid
import logging
from dotenv import load_dotenv

import livekit.api
from livekit.protocol.sip import CreateSIPParticipantRequest

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test-runner")

TARGET_PHONE_NUMBER = os.environ.get("TARGET_PHONE_NUMBER", "+18054398008")

# List of scenarios to pass down
SCENARIOS = [
    "Simple appointment scheduling (weekday vs. weekend edge cases).",
    "Rescheduling or canceling an existing appointment.",
    "Medication refill requests.",
    "Questions about office hours, locations, and insurance.",
    "Edge cases: intentional interruptions/barge-ins, unclear requests.",
    "Simple appointment scheduling, asking about weekend availability.",
    "Asking about accepted insurance plans and then scheduling an appointment.",
    "Urgent medication refill request, slightly panicked tone.",
    "Rapid multi-part questions about office hours, location, and parking.",
    "Unusual medical inquiry: asking if the doctor treats alien hand syndrome, then laughing it off and asking for a regular checkup."
]

async def trigger_call(api: livekit.api.LiveKitAPI, scenario_idx: int, scenario_desc: str):
    room_name = f"test-call-{scenario_idx:02d}-{uuid.uuid4().hex[:8]}"

    logger.info(f"Triggering call for scenario {scenario_idx+1}: {room_name}")

    # Create the SIP participant which makes the outbound call to the target number
    # When this participant connects, LiveKit will trigger an agent job for the room
    # We pass the scenario using participant metadata or attributes so the bot knows what to test

    # Check if we have an outbound trunk set up, or assume the LIVEKIT_URL/server is configured
    try:
        # Create SIP participant request
        req = CreateSIPParticipantRequest(
            sip_trunk_id=os.environ.get("SIP_TRUNK_ID", ""),
            sip_call_to=TARGET_PHONE_NUMBER,
            room_name=room_name,
            participant_identity=f"receptionist_{scenario_idx}",
            participant_name="Medical Receptionist",
            participant_metadata=scenario_desc, # Pass the scenario instructions here
        )

        participant = await api.sip.create_sip_participant(req)
        logger.info(f"Created SIP participant, call initiated for room {room_name}")
        return room_name

    except Exception as e:
        logger.error(f"Failed to trigger call: {e}")
        return None

async def main():
    if not os.environ.get("LIVEKIT_URL"):
        logger.error("LIVEKIT_URL must be set")
        return

    api = livekit.api.LiveKitAPI()

    for i, scenario in enumerate(SCENARIOS):
        room_name = await trigger_call(api, i, scenario)

        # Wait between calls to not overload the system
        logger.info("Waiting 10 seconds before next call...")
        await asyncio.sleep(10)

    await api.aclose()
    logger.info("All calls triggered.")

if __name__ == "__main__":
    asyncio.run(main())
