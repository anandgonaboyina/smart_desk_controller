// Safe polyfill for null-prototype objects calling .hasOwnProperty in Next.js / Node.js
if (typeof Object.create === "function") {
  const origCreate = Object.create;
  Object.create = function (proto, props) {
    const obj = origCreate(proto, props);
    if (proto === null && obj && typeof obj === "object") {
      try {
        if (!Object.prototype.hasOwnProperty.call(obj, "hasOwnProperty")) {
          Object.defineProperty(obj, "hasOwnProperty", {
            value: function (p) {
              return Object.prototype.hasOwnProperty.call(this, p);
            },
            writable: true,
            configurable: true,
            enumerable: false,
          });
        }
      } catch (_) {}
    }
    return obj;
  };
}

try {
  if (!Array.prototype.hasOwnProperty) {
    Array.prototype.hasOwnProperty = Object.prototype.hasOwnProperty;
  }
} catch (_) {}

let withPWA = (cfg) => cfg;
try {
  const pwaModule = await import("@ducanh2912/next-pwa");
  const withPWAInit = pwaModule.default || pwaModule;
  withPWA = withPWAInit({
    dest: "public",
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
    customWorkerPrefix: "custom-sw",
    workboxOptions: {
      importScripts: ["custom-sw.js"],
    },
  });
} catch (e) {
  // Graceful fallback if @ducanh2912/next-pwa is not yet installed in local environment
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
};

export default withPWA(nextConfig);
