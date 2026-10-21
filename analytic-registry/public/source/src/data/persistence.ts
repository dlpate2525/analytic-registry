import type { RegistryData } from '../types';
import { migrateData } from './migrate';
export const storageKey='analytic-registry-prototype-v1';
const arrays=['workspaces','people','configurations','champions','groups','principals','effectiveAccess','assets','assessments','connections','lineage','findings','reviews','attestations','requests','rules','coverage','events'];
export function decodeRegistry(raw:string):RegistryData {
  const value=JSON.parse(raw);
  if(!value||arrays.some(k=>!Array.isArray(value[k])))throw Error('Saved registry has an unsupported structure.');
  return migrateData(value);
}
export function persistRegistry(storage:Pick<Storage,'getItem'|'setItem'>,expected:string|null,next:RegistryData){
  if(storage.getItem(storageKey)!==expected)throw Error('Another tab changed the registry. Reload before saving to avoid overwriting its changes.');
  const raw=JSON.stringify(next);storage.setItem(storageKey,raw);return raw;
}
