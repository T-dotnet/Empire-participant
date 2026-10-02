export type EligibilityStatus = 'NOT_ASSESSED' | 'IN_PROGRESS' | 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'EXPIRED' | 'NOT_COMPLETED' | 'COMPLETED';
export type ConsentStatus = 'PENDING_CONSENT' | 'SIG_REQUESTED' | 'SIG_PENDING' | 'CONSENTED' | 'DECLINED' | 'WITHDRAWN' | 'NOT_APPLICABLE' | 'AWAITING_CONSENT' | 'OBTAINED';
export type RandomisationStatus = 'READY' | 'RANDOMISED' | 'NOT_READY' | 'RANDOMISATION_REQUESTED' | 'WITHDRAWN' | 'PENDING_REVEAL';

export const STATE_DOMAIN_MAPPING: Record<string, string[]> = {
  'Negative': ['antibiotics'],
  'Positive': ['anticoagulation', 'respiratory'],
  'Unknown': ['statins', 'vasopressors']
};

export interface Site {
  id: string;
  name: string;
  uidPrefix: string;
}

export interface EligibilityHistoryItem {
  timestamp: string;
  status: EligibilityStatus;
  stateDetails?: string;
  strataDetails?: string;
  associatedDomains?: { name: string; status: EligibilityStatus }[];
}

export interface EligibilityDomain {
  id: string;
  name: string;
  status: EligibilityStatus;
  expanded?: boolean;
  consentStatus?: ConsentStatus;
  withdrawalLevel?: string;
  randomisationStatus?: RandomisationStatus;
  assignedArm?: string;
  randomisedDate?: string;
  createdOn?: string;
  subtitle?: string; // For "B2. Intervention #2" etc
  stateDetails?: string;
  strataDetails?: string;
  history?: EligibilityHistoryItem[];
  consentVersion?: string;
}

export interface FormSection {
  id: string;
  title: string;
  description: string;
}

export interface FormField {
  id: string;
  label: string;
  placeholder: string;
  type: 'select' | 'text' | 'date' | 'number';
}

export interface FormValues {
  [key: string]: string | number;
}

export interface ValidationErrors {
  [key: string]: string;
}

export interface EligibilityRecord {
  id: string;
  timestamp: string;
  status: EligibilityStatus;
  stateDetails?: string;
  strataDetails?: string;
  domainIds: string[];
  domainStatuses: Record<string, EligibilityStatus>;
  note?: string;
  isActive?: boolean;
  isClosed?: boolean;
  formValues?: FormValues;
}

export interface DomainState {
  id: string;
  eligibility: EligibilityStatus;
  consent: ConsentStatus;
  randomisation: RandomisationStatus;
  assignedArm?: string;
  withdrawalLevel?: string;
  stateDetails?: string;
  strataDetails?: string;
  randomisedDate?: string;
  history?: EligibilityHistoryItem[];
  consentVersion?: string;
  eligibilityVersion?: string;
  createdOn?: string;
}

export type AlertLevel = 'critical' | 'warning' | 'info';

export interface ParticipantAlert {
  level: AlertLevel;
  title: string;
  description: string;
  domainId?: string; // Optional: Link alert to a specific domain step
}

export interface ConsentRecord {
  id: string;
  version: string;
  recipient: string;
  isAnalogue: boolean;
  domainIds: string[];
  domainStatuses?: Record<string, ConsentStatus>;
  status: ConsentStatus;
  date: string;
  situation?: string;
  isActive?: boolean;
  rcName?: string;
  extraName?: {role: string, name: string}[];
  analogueSignatureStatus?: {
    participant: boolean;
    participantDateTime: string;
    investigator: boolean;
    investigatorDateTime: string;
    extra: boolean;
    extraDateTime: string;
  };
  processNote?: string;
  processDateTime?: string;
  outcomeDate?: string;
  siteSideSelections?: string[];
  otherTextEntries?: {role: string, name: string}[];
  note?: string;
}

export interface Note {
  id: string;
  content: string;
  timestamp: string;
  author: string;
}

export interface Participant {
  id: string;
  uid: string;
  randomisedId?: string;
  siteId: string;
  lastUpdated: string;
  status: string;
  alertType?: 'warning' | 'error';
  eligibilityCloseToExpire?: boolean;
  domains: Record<string, DomainState>;
  activeAlerts: ParticipantAlert[];
  assessmentPushed?: boolean;
  consentRecipient?: string;
  consentRecords?: ConsentRecord[];
  eligibilityRecords?: EligibilityRecord[];
  customEpisodeNames?: Record<string, { name: string; description?: string }>;
  customRandomisationEpisodeNames?: Record<string, { name: string; description?: string }>;
  notes?: Note[];
  randomisationUnlocked?: boolean;
}

export type NotificationType = 'success' | 'warning' | 'info' | 'error' | 'revoked';

export interface Notification {
  id: string;
  siteUid: string;
  participantId: string;
  type: NotificationType;
  title: string;
  createdAt: string;
}