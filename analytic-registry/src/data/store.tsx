import { useRef, useState, type ReactNode } from 'react';
import { initialData } from './mock';
import { migrateData } from './migrate';
import { RegistryContext } from './RegistryContext';
import { decodeRegistry, persistRegistry, storageKey } from './persistence';
import type { RegistryData, ActivityEvent } from '../types';
export { useRegistry } from './RegistryContext';

function readInitial(){
  let raw:string|null=null;
  try{raw=localStorage.getItem(storageKey);return {data:raw?decodeRegistry(raw):migrateData(structuredClone(initialData)),raw,issue:''};}
  catch{return {data:migrateData(structuredClone(initialData)),raw,issue:'Saved data could not be loaded. The original is preserved. Export it from Reference data before recovery; saving is blocked.'};}
}
function download(raw:string,name:string){const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
export function Provider({children}:{children:ReactNode}){
  const [initial]=useState(readInitial);const [data,setData]=useState(initial.data);const current=useRef(data);const raw=useRef(initial.raw);
  const [viewMode,setViewMode]=useState<'Business'|'Administrator'>('Business');const [notice,setNotice]=useState('');const [storageIssue,setStorageIssue]=useState(initial.issue);
  const update=(fn:(d:RegistryData)=>RegistryData)=>{
    if(initial.issue){setNotice(initial.issue);return false;}
    try{const next=fn(current.current);raw.current=persistRegistry(localStorage,raw.current,next);current.current=next;setData(next);setStorageIssue('');return true;}
    catch(e){const message=(e as Error).message||'Browser storage is unavailable.';setStorageIssue(message);setNotice('Changes were not saved. '+message);return false;}
  };
  const reset=()=>{try{const saved=localStorage.getItem(storageKey);if(saved)localStorage.setItem(storageKey+'-recovery',saved);localStorage.removeItem(storageKey);location.reload();}catch{setStorageIssue('Reset could not preserve a recovery copy. Existing data was not intentionally removed.');}};
  return <RegistryContext.Provider value={{data,update,notice,setNotice,storageIssue,viewMode,setViewMode,reset,exportData:()=>download(initial.issue&&initial.raw?initial.raw:JSON.stringify(current.current,null,2),'analytic-registry-backup.json')}}>{children}</RegistryContext.Provider>;
}
export const event=(description:string,category:ActivityEvent['category'],workspaceId:string|null=null,actor='Priya Shah'):ActivityEvent=>({id:crypto.randomUUID(),workspaceId,date:new Date().toISOString(),actor,category,description});
