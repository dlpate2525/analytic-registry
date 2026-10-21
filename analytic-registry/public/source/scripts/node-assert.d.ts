// Minimal declarations for the built-in assertions used by repository checks.
// The runtime implementation is Node's standard module, not a local substitute.
declare module 'node:assert/strict' {
  const assert: {
    equal(actual: unknown, expected: unknown, message?: string): void;
    notEqual(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    ok(value: unknown, message?: string): asserts value;
    throws(action: () => unknown, message?: string): void;
  };
  export default assert;
}
