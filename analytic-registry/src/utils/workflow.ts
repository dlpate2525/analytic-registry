import { todayLocal, isDateOnly } from './dates';
import type { RegistryData, AdministrativeReview } from '../types';
import { validateClosure } from './approvals';
export { requestStage, requestTechnicalStage, needsRegistryLink, hasOpenTechnicalWork, correctedRequest, recordRequestExecution } from '../domain/requestPolicy';
export type { RequestStage, TechnicalStage } from '../domain/requestPolicy';

export const reviewActions=[
  {label:'Start investigation',status:'Investigating'},
  {label:'Request business response',status:'Pending Business Response'},
  {label:'Queue administrator action',status:'Pending Admin Action'},
  {label:'Mark evidence unavailable',status:'Unable to Verify'},
  {label:'Close verified review',status:'Closed'},
];
export function transitionReview(r:AdministrativeReview,d:RegistryData,status:string,admin:boolean) {
  if(!admin){
    if(!['Pending Business Response','Action Required'].includes(r.status)||status!=='Investigating'||r.ownerId!=='P1')throw new Error('Only the accountable business owner can submit this response.');
    if(!r.notes.trim())throw new Error('Enter a business response before returning the review.');
    return {...r,status};
  }
  if(['Closed','Resolved'].includes(r.status))throw new Error('This review is complete.');
  if(!reviewActions.some(a=>a.status===status))throw new Error('Select a supported review action.');
  if(r.status==='New'&&status==='Closed')throw new Error('Start the investigation before closing this review.');
  const next={...r,status};const issue=validateClosure(next,d);if(issue)throw new Error(issue);
  if(status==='Pending Business Response'&&(!r.ownerId||!r.dueDate))throw new Error('A business owner and response due date are required.');
  return next;
}

export function saveReview(original:AdministrativeReview,edited:AdministrativeReview,d:RegistryData,action:string,admin:boolean){
  if(['Closed','Resolved'].includes(original.status))throw Error('Completed reviews are read-only. Start a linked follow-up for new evidence.');
  if(!admin){
    if(original.ownerId!=='P1'||!['Pending Business Response','Action Required'].includes(original.status))throw Error('Only the accountable business owner can respond to this review.');
    const {notes:_old,...oldFields}=original;const {notes:_new,...newFields}=edited;
    if(JSON.stringify(oldFields)!==JSON.stringify(newFields))throw Error('Business users can update their response only. Administrator evidence is read-only.');
  }
  if(edited.dueDate&&!isDateOnly(edited.dueDate))throw Error('Enter a valid due date.');
  if(edited.reviewerId&&!d.people.some(p=>p.id===edited.reviewerId&&p.status==='Active'))throw Error('Assign an active, verified reviewer.');
  return action?transitionReview(edited,d,action,admin):edited;
}
