// Simple app-wide feature flags — flip a value to re-enable, no need to hunt
// down every call site again.

// Client asked (Sep 2026) to hide the veg/non-veg indicator badges
// everywhere in the app for now. The underlying `isVeg`/`dietaryType` data
// is untouched — every render site just checks this flag before showing the
// badge. Flip to `true` to bring them all back.
export const SHOW_DIETARY_BADGES = false;
