import withPWAInit from "@ducanh2912/next-pwa";

// Safe polyfill for null-prototype objects calling .hasOwnProperty in Next.js / Node.js
if (typeof Object.create === "function") {
  const origCreate = Object.create;
  Object.create = function (proto, props) {
    const obj = origCreate(proto, props);
    if (proto === null) {
      Object.defineProperty(obj, "hasOwnProperty", {
        value: function (p) {
          return Object.prototype.hasOwnProperty.call(this, p);
        },
        writable: true,
        configurable: true,
        enumerable: false,
      });
    }
    return obj;
  };
}

if (!Array.prototype.hasOwnProperty) {
  // @ts-ignore
  Array.prototype.hasOwnProperty = Object.prototype.hasOwnProperty;
}

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  customWorkerPrefix: "custom-sw",
  workboxOptions: {
    importScripts: ["custom-sw.js"],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
