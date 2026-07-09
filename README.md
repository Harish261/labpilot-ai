# LabPilot AI

A practitioner-facing patient management app built on FHIR R4, for the Medblocks FHIR App Challenge.

## Stack

- React 19 + TypeScript + Vite
- React Router
- Tailwind CSS v4
- lucide-react icons
- `@types/fhir` for FHIR resource typing (added in Phase 1)

## Status

- [x] Project scaffold
- [x] Login page (`/login`)
- [ ] Backend FHIR proxy
- [ ] Patient listing (`/patients`)
- [ ] Patient detail page
- [ ] Differentiation layer
- [ ] Docker + Cloud Run deploy

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Medblocks FHIR credentials
npm run dev
```

App runs at http://localhost:5173. Login redirects to `/patients` (placeholder for now).

## Project structure

```
src/
├── pages/          # route-level components (LoginPage, PatientsPage, ...)
├── components/      # shared UI components
├── lib/             # FHIR service layer, helpers
├── App.tsx          # routes
└── main.tsx          # entry point
```

## FHIR resources used

- `Patient` — demographics, listing, search
- `Observation` — vitals (Phase 3)
- `Condition` — active diagnoses (Phase 3)
- `MedicationRequest` / `Medication` — active meds (Phase 3)

## Next step

Wire up the backend FHIR proxy so the bearer token never reaches the browser, then build the patient listing page against it.
