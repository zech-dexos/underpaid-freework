# K&L Lawncare Removal website

A responsive, static business website for K&L Lawncare Removal. This site lives in its own folder so it does not interfere with the repository's existing LiveKit voice-bot prototype.

## Preview locally

From the repository root:

```bash
python -m http.server 8000 --directory websites/kl-lawncare-removal
```

Open http://localhost:8000.

No build step or package installation is required.

## Included

- Responsive homepage and mobile navigation
- Lawn mowing and maintenance
- Yard cleanup and removal
- Landscape and garden care
- Brush clearing and defensible-space maintenance
- Three-step service overview
- Estimate request form that formats and copies a request locally

## Before publishing

Replace or confirm the following business information:

- Business phone number and email address
- Confirmed service area and travel radius
- Final service list, availability, and any relevant licensing/insurance statements
- Real project photos (current photography is illustrative stock imagery)

The estimate form is front-end only. It does not transmit customer information or send email. Connect a secure form endpoint or a provider such as Formspree before accepting live customer requests. Add the confirmed business phone/email and privacy notice before launch.

Defensible-space wording describes vegetation maintenance only. Do not advertise guaranteed wildfire protection or imply that all work qualifies as a constructed firebreak; scope must comply with applicable local requirements, permits, environmental restrictions, and property-owner authorization.
