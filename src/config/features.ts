// Feature flags. Generated for phase 10: a flag turns on when its phase is installed.
// Sidebar links, gallery "Add to calendar", AI buttons and PWA registration all read this file.
export const features = {
  staff: true,
  places: true,
  upload: true,
  storage: true,
  gallery: true,
  calendar: true,
  cleanup: true,
  ai: true,
  stories: true,
  activity: true,
  pwa: true,
} as const;

export type FeatureKey = keyof typeof features;
export const isEnabled = (key: FeatureKey) => features[key];
