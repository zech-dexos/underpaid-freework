import asyncio
import logging
import os
import uuid

from dotenv import load_dotenv
import livekit.api
from livekit.protocol.sip import CreateSIPParticipantRequest

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test-runner")

# Intentionally fixed to the single number permitted by the challenge.
TARGET_PHONE_NUMBER = "+18054398008"
CALL_SPACING_SECONDS = 185

SCENARIOS = [
    "Simple appointment scheduling; ask about weekday versus weekend availability.",
    "Reschedule an existing appointment and clarify available dates.",
    "Ask about the process for requesting a medication refill; do not request medical advice.",
    "Ask about office hours, location, and insurance.",
    "Test an interruption: begin a question, interrupt politely, and clarify the request.",
    "Ask whether weekend appointments are available and what the next step is.",
    "Ask about accepted insurance plans, then ask how to schedule an appointment.",
    "Explain that a refill is time-sensitive and ask how the office handles the request.",
    "Ask a rapid but understandable sequence of questions about hours, location, and parking.",
    "Ask an unusual but harmless question, then return to requesting a routine checkup.",
]


def validate_configuration() -> None:
    required = [
        "LIVEKIT_URL",
        "LIVEKIT_API_KEY",
        "LIVEKIT_API_SECRET",
        "SIP_TRUNK_ID",
    ]
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        raise RuntimeError("Missing required environment variables: " + ", ".join(missing))

    if os.environ.get("RUN_LIVE_CALLS", "").strip().lower() != "true":
        raise RuntimeError(
            "Outbound calls are disabled. After reviewing the code and costs, "
            "set RUN_LIVE_CALLS=true to enable calls to the designated test number."
        )


async def trigger_call(api: livekit.api.LiveKitAPI, scenario_idx: int, scenario_desc: str):
    room_name = f"test-call-{scenario_idx + 1:02d}-{uuid.uuid4().hex[:8]}"
    logger.info("Starting scenario %d in room %s", scenario_idx + 1, room_name)

    request = CreateSIPParticipantRequest(
        sip_trunk_id=os.environ["SIP_TRUNK_ID"],
        sip_call_to=TARGET_PHONE_NUMBER,
        room_name=room_name,
        participant_identity=f"receptionist_{scenario_idx + 1:02d}",
        participant_name="Medical Receptionist",
        participant_metadata=scenario_desc,
    )

    try:
        participant = await api.sip.create_sip_participant(request)
        logger.info(
            "SIP participant created for scenario %d in room %s (identity=%s)",
            scenario_idx + 1,
            room_name,
            getattr(participant, "identity", "unknown"),
        )
        return room_name
    except Exception:
        logger.exception("Failed to initiate scenario %d", scenario_idx + 1)
        return None


async def main() -> None:
    validate_configuration()
    api = livekit.api.LiveKitAPI()
    try:
        for idx, scenario in enumerate(SCENARIOS):
            room_name = await trigger_call(api, idx, scenario)
            if room_name is None:
                logger.error("Stopping batch after initiation failure.")
                break

            if idx < len(SCENARIOS) - 1:
                logger.info(
                    "Waiting %d seconds before the next attempt. "
                    "This delay reduces overlap but does not prove the prior call ended.",
                    CALL_SPACING_SECONDS,
                )
                await asyncio.sleep(CALL_SPACING_SECONDS)

        logger.info("Runner finished initiating the scheduled scenarios.")
    finally:
        await api.aclose()


if __name__ == "__main__":
    asyncio.run(main())
