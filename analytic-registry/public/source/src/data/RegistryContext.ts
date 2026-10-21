import { createContext, useContext } from 'react';
import type { RegistryData, WorkspaceRequest } from '../types';
import type { RequestCommand } from '../domain/requests';
export interface RegistryContextValue { data:RegistryData;update:(fn:(d:RegistryData)=>RegistryData)=>boolean;dispatchRequest:(command:RequestCommand)=>WorkspaceRequest|null;notice:string;setNotice:(s:string)=>void;storageIssue:string;viewMode:'Business'|'Administrator';setViewMode:(s:'Business'|'Administrator')=>void;reset:()=>void;exportData:()=>void }
export const RegistryContext=createContext<RegistryContextValue|null>(null);
export function useRegistry(){const value=useContext(RegistryContext);if(!value)throw Error('Registry provider is unavailable. Reload the preview.');return value;}
