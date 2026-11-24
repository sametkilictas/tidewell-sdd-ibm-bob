---
name: carbon-ui
description: Build accessible, localisable screens with the IBM Carbon Design System React components, following the project's design-system spec (sdd/specs/05-design-system.md) and component map (sdd/design/component-map.md) - app shell, data tables, wizards with review and receipt, status tags, empty, loading and error states, right-to-left languages. Use for any work in the web app.
---

# Carbon UI skill

Carbon is the design system; the project's specs say which languages, themes, templates and domain
components it uses (for this repository's worked example: English and Arabic, right to left).

## Before you build a screen
1. Find the route in `sdd/design/screen-inventory.md` (template, title key, phase).
2. Read the wireframe in `sdd/design/wireframes.md` (if present) and the feature spec's UI section.
3. Pick the page template from SPEC-05 and components from `sdd/design/component-map.md`, which
   lists the project's shared components with their contracts.

## Non-negotiables
- `@carbon/react` components only; brand via theme tokens, never ad-hoc CSS.
- Every string through the i18n layer, with keys in **every** locale SPEC-05 lists.
- Logical CSS properties only; mirror directional icons in right-to-left languages.
- Isolate numbers, codes and identifiers left-to-right inside right-to-left text: `<bdi dir="ltr">`.
- Each data view: `Skeleton*` while loading → data | empty state | `InlineNotification kind="error"` with Retry.
- On route change focus the `<h1>`; a wizard step change focuses the step heading.
- Forms: validate on blur and on submit; an error summary at the top links to the fields;
  `aria-describedby` on invalid fields (Carbon `invalid` / `invalidText` does this).
- Buttons that submit a state-changing request show `InlineLoading` and stay disabled until the response.
- No toasts for errors that need action. Toasts are polite and auto-dismiss.
- Sensitive values use the project's hideable components from the component map, never raw text.

## Patterns
- **Wizard**: `ProgressIndicator` + step outlet + sticky footer, state in a reducer, unsaved-changes
  guard; the review step renders only server-confirmed values.
- **Receipt**: pictogram, reference + `CopyButton`, live status, next actions.
- **Tables**: Carbon `DataTable` with toolbar search, filters in a popover or modal, "Load more",
  numeric columns aligned to the end.
- **Status**: a `StatusTag` mapping status → type, icon and label, defined once (SPEC-05).
- **Domain values** (amounts, identifiers, codes): only through the components the component map names.

## Verify visually
Use the Playwright MCP to screenshot the screen in every locale and theme SPEC-05 lists, at desktop
and mobile widths, before ticking a UI task; check focus-ring visibility and right-to-left mirroring.
