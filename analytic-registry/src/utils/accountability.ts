import type {RegistryData,Workspace} from '../types';
export function accountability(ids:string[],d:RegistryData){
 if(!ids.length)return 'Missing assignment';
 const people=ids.map(id=>d.people.find(p=>p.id===id));
 if(people.some(p=>p?.status==='Active'))return 'Verified eligible';
 if(people.every(p=>p?.status==='Inactive'))return 'Confirmed unavailable';
 return 'Unable to verify';
}
export const workspaceAccountability=(w:Workspace,d:RegistryData)=>({
 owner:accountability(w.ownerId?[w.ownerId]:[],d),
 champions:accountability(d.champions.filter(c=>c.configurationVersionId===w.requestedVersionId).map(c=>c.personId),d),
});
