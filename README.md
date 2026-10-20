# Automated Voice Bot Challenge

This repository contains a LiveKit-based automated voice bot designed to simulate patient scenarios and test a medical receptionist AI agent. It initiates outbound calls to a specific test phone number, interacts with the receptionist AI, and automatically records and transcribes the interactions.

## Prerequisites

- Python 3.10+
- A LiveKit project with SIP configured
- Deepgram API Key (for STT)
- OpenAI API Key (for LLM)
- Cartesia API Key (for TTS)

## Setup

1. Clone this repository.
2. Install the required Python dependencies:

```bash
pip install -r requirements.txt
```

3. Copy the `.env.example` file to `.env` and fill in your API keys and configuration details:

```bash
cp .env.example .env
```

Ensure your `.env` contains the following:
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `OPENAI_API_KEY`
- `DEEPGRAM_API_KEY`
- `CARTESIA_API_KEY`
- `SIP_TRUNK_ID` (Your configured SIP Outbound Trunk ID in LiveKit)
- `TARGET_PHONE_NUMBER` (Defaults to "+18054398008")

## Running the Agent

To run the full simulation (which starts the agent worker and triggers the outbound calls), you can use the provided script or run the components separately.

1. **Start the agent worker:**

Start the LiveKit agent worker which will handle incoming jobs (in a separate terminal):

```bash
python bot.py start
```

2. **Trigger the outbound test calls:**

Run the runner script to trigger the 10 automated test scenarios:

```bash
python runner.py
```

## Directory Structure

- `bot.py`: The LiveKit agent pipeline implementation.
- `runner.py`: Script to orchestrate the 10 outbound test scenarios.
- `transcripts/`: Directory containing the recorded text transcripts of the calls.
- `recordings/`: Directory containing the audio recordings of the calls.
- `ARCHITECTURE.md`: Architecture details and tradeoff decisions.
- `BUGS.md`: Documented bugs found during the testing.
