# Santi AI Frontend

AI-augmented project management chatbot built on LINE for Thai high school student teams.
Mobile phone web only (LIFF inside LINE app).

## Stack
Next.js 15 + React 19 + TypeScript + Tailwind CSS v4

## Key Tech
- **LINE LIFF**: `@line/liff` — auth via `NEXT_PUBLIC_LIFF_ID`
- **Font**: Lexend (`next/font/google`, var `--font-lexend`)
- **Styling**: Tailwind v4 — `@theme` blocks in `globals.css` (no `tailwind.config.ts`)

## Design Tokens (globals.css)
- `--color-santi-primary: #FFC300` → `bg-santi-primary`, `text-santi-primary`, `border-santi-primary`
- `--color-santi-secondary: #FFE999` → `bg-santi-secondary`
- `--color-santi-muted: #B7B7B7` → `bg-santi-muted`, `border-santi-muted`
- `--radius-santi: 12px` → `rounded-santi`
- Custom classes: `.member-card`, `.btn-elevation`

## CSS Utility Classes (globals.css)
- `.santi-label` — `text-sm font-semibold text-black`
- `.santi-input` — full-width h-14 input, santi-muted border, santi-primary focus ring
- `.santi-textarea` — same but no resize
- Icon-prefixed inputs: `pl-12` on `.santi-input`, `absolute left-4` icon wrapper

## Shared Components
- `components/onboarding/OnboardingHeader.tsx` — props: `step`, `totalSteps`, `onBack?`
- `components/onboarding/OnboardingFooter.tsx` — props: `onContinue`, `disabled?`, `label?`
- `app/onboarding/layout.tsx` — `max-w-md mx-auto` container

## Routes
- `/onboarding` — Step 1: Member selection
- `/onboarding/project-detail` — Step 2: Project details
- `/onboarding/member-preferences` — Step 3: Member descriptions
- `/onboarding/plan-proposal` — Plan overview: calendar + timeline
- `/approval/[project_id]` — Project approval flow
- `/info-edit/project/[id]` — Project edit view
- `/info-edit/meeting/[id]` — Meeting edit view

## Patterns
- LIFF init in `useEffect`, login redirect if not authenticated
- Mock data in `utils/mock/` with adapter functions in `utils/`
- 10-color task palette: `TASK_COLORS` array, index % 10
- Calendar is Monday-first: `offset = (sundayFirstDay + 6) % 7`

## Conventions
- Use env vars for backend URLs (no hardcoded URLs)
- Thai-localized, simple/friendly tone
- AI assists but never overrides user control
