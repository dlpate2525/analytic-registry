import { standardTemplate } from './standard';
import type { Platform } from '../types';

// Shared rules must not import mock records or workflow functions.
export const platforms:Platform[] = ['Power BI / Fabric','Tableau','Alteryx'];
export const customReasons=['Multiple user populations','Specialized entitlements','Cross-LOB access','Segregation of duties','Platform limitation','Alternate authentication','Complex security model','Other'];
export const rulesConfig={businessNameMax:100,purposeMax:500,customExplanationMax:1000,championMin:1,championMax:10,groupNamePattern:'^[A-Z][A-Z0-9_]{2,79}$',standardVersion:standardTemplate.version,asOf:'2026-10-06'};
