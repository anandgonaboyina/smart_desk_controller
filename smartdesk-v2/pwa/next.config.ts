import type { NextConfig } from "next";

// Safe polyfill for null-prototype objects calling .hasOwnProperty in Next.js / Node.js
if (typeof Object.create === "function") {
  const origCreate = Object.create;
  Object.create = function (proto: any, props?: any) {
    const obj = origCreate(proto, props);
    if (proto === null) {
      Object.defineProperty(obj, "hasOwnProperty", {
        value: function (p: string | symbol) {
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

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
