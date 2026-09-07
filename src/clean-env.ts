if (typeof global !== "undefined") {
  delete (global as any).__dirname;
  delete (global as any).__filename;
}
if (typeof globalThis !== "undefined") {
  delete (globalThis as any).__dirname;
  delete (globalThis as any).__filename;
}
