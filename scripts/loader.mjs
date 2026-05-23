// Custom ESM loader: intercepts "server-only" imports so scripts can
// import from app/lib/ modules outside the Next.js runtime.
export function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { url: "data:text/javascript,export default {};", shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
