import { Field } from './ui';
import type { Person } from '../types';

export function PersonField({label,value,onChange,people,hint,disabled=false}:{label:string;value:string;onChange:(id:string)=>void;people:Person[];hint?:string;disabled?:boolean}) {
  return <Field label={label} hint={hint}><select disabled={disabled} aria-label={label} value={value} onChange={e=>onChange(e.target.value)}><option value="">Select a person…</option>{people.map(p=><option key={p.id} value={p.id} disabled={p.status==='Inactive'}>{p.name}{p.status!=='Active'?` · ${p.status==='Unverified'?'Unable to verify':p.status}`:''}</option>)}</select></Field>;
}

export function EvidenceFields({reference,date,onReference,onDate,disabled=false}:{reference:string;date:string;onReference:(v:string)=>void;onDate:(v:string)=>void;disabled?:boolean}) {
  return <><Field label="Evidence reference *" hint="Use the source record, extract, or verification reference."><input disabled={disabled} value={reference} onChange={e=>onReference(e.target.value)}/></Field><Field label="Evidence date *"><input disabled={disabled} type="date" value={date} onChange={e=>onDate(e.target.value)}/></Field></>;
}
