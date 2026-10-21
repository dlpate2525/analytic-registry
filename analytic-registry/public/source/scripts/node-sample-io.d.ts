// Narrow declarations for standard Node modules used by the offline sample check.
// Runtime behavior comes from Node. This file supplies no replacement implementation.
declare module 'node:fs' {
  export function readFileSync(path:string,encoding:'utf8'):string;
  export function readFileSync(path:string):Uint8Array;
  export function readdirSync(path:string):string[];
}
declare module 'node:crypto' {
  interface SampleHash {
    update(data:string|Uint8Array):SampleHash;
    digest(encoding:'hex'):string;
  }
  export function createHash(algorithm:string):SampleHash;
}
declare module 'node:url' {
  export function fileURLToPath(url:URL|string):string;
}
declare module 'node:path' {
  export function resolve(...paths:string[]):string;
}
