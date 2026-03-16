declare module "@capacitor/geolocation" {
  export const Geolocation: {
    checkPermissions?: () => Promise<{ location: string }>;
    requestPermissions?: () => Promise<{ location: string }>;
  getCurrentPosition?: (...args: unknown[]) => Promise<unknown>;
  };
  const _default: typeof Geolocation;
  export default _default;
}
