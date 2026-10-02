import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import ParticipantHeader from './ParticipantHeader';
import Tabs from './Tabs';
import EligibilitySummary from './EligibilitySummary';
import EligibilityHistory from './EligibilityHistory';
import EligibilityForm from './EligibilityForm';
import EligibilityView from './EligibilityView';
import EligibilityFormModal from './EligibilityFormModal';
import ConsentView from './ConsentView';
import RandomisationView from './RandomisationView';
import AssignmentView from './AssignmentView';
import RequestConsentModal from './RequestConsentModal';
import RevokeConsentModal from './RevokeConsentModal';
import ParticipantInfoModal from './ParticipantInfoModal';
import ConsentRecipientModal from './ConsentRecipientModal';
import NoteModal, { parseNoteContent } from './NoteModal';
import DeactivationAlertModal from './DeactivationAlertModal';
import { Icons } from './Icons';
import { EligibilityDomain, EligibilityStatus, Participant, DomainState, Site, ParticipantAlert, ConsentRecord, Note, ConsentStatus, RandomisationStatus, EligibilityRecord } from '../types';
import { SITES } from '../data';

// Updated domain configuration with sequential subtitles
const domainConfig: Record<string, { name: string; subtitle: string }> = {
  respiratory: { name: 'Respiratory', subtitle: 'Step 1. Lung Function' },
  antibiotics: { name: 'Antibiotics', subtitle: '' },
  anticoagulation: { name: 'Anticoagulation', subtitle: 'Step 3. Bleeding Risk' },
  statins: { name: 'Statins', subtitle: 'Step 4. Concomitant Meds' },
  vasopressors: { name: 'Vasopressors', subtitle: 'Step 5. Shock Status' }
};

const STATE_DOMAIN_MAPPING: Record<string, string[]> = {
  'Negative': ['antibiotics'],
  'Positive': ['anticoagulation', 'respiratory'],
  'Unknown': ['statins', 'vasopressors']
};

const getInitialDomains = (p: Participant | null, showNewDomain: boolean): EligibilityDomain[] => {
  if (!p) return [];
  
  const now = new Date();
  let createdDate = new Date();
  
  if (p.id === 'EXP1R' || p.id === 'CLS2E') {
    createdDate.setDate(now.getDate() - 36); // Expiry is 6 days ago
  } else if (p.eligibilityCloseToExpire) {
    createdDate.setDate(now.getDate() - 36); // Expiry is 6 days ago
  } else {
    createdDate.setDate(now.getDate() - 10); // Expiry is 20 days in the future
  }
  
  const createdOnStr = createdDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');

  return Object.keys(p.domains)
    .filter(key => key !== 'platform' && (showNewDomain || key !== 'respiratory'))
    .map((key) => {
      const state = p.domains[key];
      // Use stored randomisedDate if available, otherwise fallback to legacy default
      const randomisedDate = state.randomisedDate || (
          (state.randomisation === 'RANDOMISED' || state.randomisation === 'RANDOMISATION_REQUESTED') 
          ? '22.09.2025' 
          : undefined
      );

      return {
        id: state.id,
        name: domainConfig[key]?.name || key,
        subtitle: domainConfig[key]?.subtitle || 'Criteria',
        status: state.eligibility,
        consentStatus: state.consent,
        randomisationStatus: state.randomisation,
        expanded: false,
        createdOn: createdOnStr,
        randomisedDate: randomisedDate,
        assignedArm: state.assignedArm,
        withdrawalLevel: state.withdrawalLevel,
        stateDetails: state.stateDetails,
        strataDetails: state.strataDetails,
        history: state.history || [],
        consentVersion: state.consentVersion
      };
    });
};

const generateUniqueDocId = (participantId: string) => {
  const base = participantId.replace(/\D/g, '');
  const random = Math.floor(1000 + Math.random() * 9000); // 4 random digits
  return `DOC-${base}${random}`;
};

interface ParticipantDetailProps {
  participant: Participant | null;
  onBack: () => void;
  onUpdate: (participant: Participant) => void;
  showNewDomain: boolean;
  visibleDomains: string[];
}

const ParticipantDetail: React.FC<ParticipantDetailProps> = ({ onBack, participant, onUpdate, showNewDomain, visibleDomains }) => {
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentModalMode, setConsentModalMode] = useState<'request' | 'view'>('request');
  const [viewingConsentVersion, setViewingConsentVersion] = useState<string | undefined>(undefined);
  const [draftDocId, setDraftDocId] = useState<string>('');

  const [initialConsentDomainIds, setInitialConsentDomainIds] = useState<string[] | undefined>(undefined);
  const [initialShowSignature, setInitialShowSignature] = useState(false);
  const [initialIsAnalogue, setInitialIsAnalogue] = useState(true);
  const [initialSituation, setInitialSituation] = useState('Standard');

  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showRandomiseConfirmation, setShowRandomiseConfirmation] = useState(false);
  const [selectedDomainsForRandomisation, setSelectedDomainsForRandomisation] = useState<string[]>([]);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isEligibilityModalOpen, setIsEligibilityModalOpen] = useState(false);
  const [isViewingHistorical, setIsViewingHistorical] = useState(false);
  const [historicalDomainData, setHistoricalDomainData] = useState<Record<string, DomainState> | undefined>(undefined);
  const [historicalNote, setHistoricalNote] = useState('');
  const [historicalValues, setHistoricalValues] = useState<Record<string, any> | undefined>(undefined);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [activeNoteEpisode, setActiveNoteEpisode] = useState<any | null>(null);
  const [initialNoteTab, setInitialNoteTab] = useState<'view' | 'process' | 'outcome'>('view');
  const [randomisationUnlocked, setRandomisationUnlocked] = useState(participant?.randomisationUnlocked || false);
  const [showDeactivationAlert, setShowDeactivationAlert] = useState(false);
  const [pendingConsentParams, setPendingConsentParams] = useState<any>(null);

  // Initialize domains from participant prop
  const [domains, setDomains] = useState<EligibilityDomain[]>(() => getInitialDomains(participant, showNewDomain));
  
  // Initialize consent records from participant prop
  const [consentRecords, setConsentRecordsInternal] = useState<ConsentRecord[]>(() => {
    const initial = participant?.consentRecords || [];
    return initial;
  });

  const setConsentRecords = (updater: any) => {
    setConsentRecordsInternal(updater);
  };
  
  // Initialize notes from participant prop
  const [notes, setNotes] = useState<Note[]>(() => participant?.notes || []);

  // Initialize eligibility records from participant prop
  const [eligibilityRecords, setEligibilityRecords] = useState<EligibilityRecord[]>(() => participant?.eligibilityRecords || []);

  // Sync notes from participant prop
  useEffect(() => {
    if (participant?.notes) {
        setNotes(participant.notes);
    }
  }, [participant?.notes]);

  // Sync eligibility records from participant prop
  useEffect(() => {
    if (participant?.eligibilityRecords) {
        setEligibilityRecords(participant.eligibilityRecords);
    }
  }, [participant?.eligibilityRecords]);

  const handleAddNote = (content: string) => {
    if (!participant || !content) return;

    const newNote: Note = {
        id: `note-${Date.now()}`,
        content,
        timestamp: new Date().toISOString(),
        author: 'Dr. Smith' // Hardcoded for now
    };
    
    const updatedNotes = [...notes, newNote];
    setNotes(updatedNotes);
  };

  const handleUpdateEpisodeName = (episodeId: string, name: string, description: string) => {
    if (!participant) return;
    
    const updatedCustomNames = {
      ...(participant.customEpisodeNames || {}),
      [episodeId]: { name, description }
    };
    
    onUpdate({
      ...participant,
      customEpisodeNames: updatedCustomNames
    });
  };

  const handleUpdateRandomisationEpisodeName = (episodeId: string, name: string, description: string) => {
    if (!participant) return;
    
    const updatedCustomNames = {
      ...(participant.customRandomisationEpisodeNames || {}),
      [episodeId]: { name, description }
    };
    
    onUpdate({
      ...participant,
      customRandomisationEpisodeNames: updatedCustomNames
    });
  };
  
  // Platform status state - Initialized from participant to avoid state flicker
  const [platformStatus, setPlatformStatus] = useState<EligibilityStatus>(() => 
    participant?.domains['platform']?.eligibility || 'NOT_ASSESSED'
  );
  const [platformStateDetails, setPlatformStateDetails] = useState<string | undefined>(() => 
    participant?.domains['platform']?.stateDetails
  );
  const [platformStrataDetails, setPlatformStrataDetails] = useState<string | undefined>(() => 
    participant?.domains['platform']?.strataDetails
  );
  
  // Manage Platform Domain state independently to persist its history
  const [platformDomain, setPlatformDomain] = useState<DomainState>(() => {
      return participant?.domains['platform'] || {
          id: 'platform',
          eligibility: 'NOT_ASSESSED',
          consent: 'NOT_APPLICABLE',
          randomisation: 'NOT_READY',
          history: []
      };
  });

  // Ref to access current domains in callbacks without dependency cycles
  const domainsRef = useRef(domains);
  useEffect(() => {
    domainsRef.current = domains;
  }, [domains]);

  const [activeTab, setActiveTab] = useState(() => {
    if (!participant) return 'eligibility';
    if (participant.status === 'Randomised') return 'randomisation';
    if (['Eligible to randomise', 'Pending consent'].includes(participant.status)) return 'consent';
    return 'eligibility';
  });
  
  useEffect(() => {
    if (!participant) return;
    if (participant.status === 'Randomised') {
      setActiveTab('randomisation');
    } else if (['Eligible to randomise', 'Pending consent'].includes(participant.status)) {
      setActiveTab('consent');
    } else {
      setActiveTab('eligibility');
    }
  }, [participant?.id]);

  // Sync local domain state from prop updates (e.g. from server/parent)
  useEffect(() => {
    const newDomains = getInitialDomains(participant, showNewDomain);
    setDomains(prev => {
        // Create a comparison function that strips UI-only fields
        const stripUI = (d: EligibilityDomain) => {
            const { expanded, createdOn, ...rest } = d;
            return rest;
        };

        const prevStripped = prev.map(stripUI);
        const newStripped = newDomains.map(stripUI);
        
        if (JSON.stringify(prevStripped) === JSON.stringify(newStripped)) {
            return prev;
        }
        return newDomains;
    });
    
    // Sync Platform Domain too
    if (participant?.domains['platform']) {
        const plat = participant.domains['platform'];
        setPlatformDomain(prev => {
            // Deep comparison to prevent unnecessary updates and infinite loops
            if (JSON.stringify(prev) === JSON.stringify(plat)) return prev;
            return plat;
        });
        setPlatformStatus(plat.eligibility);
        setPlatformStateDetails(plat.stateDetails);
        setPlatformStrataDetails(plat.strataDetails);
    }
  }, [participant, showNewDomain]);

  // Assessment Invalidation: If assessment was pushed but domains are no longer ready, reset pushed state.
  useEffect(() => {
    if (!participant) return;
    
    // Only check invalidation if the current local state is fully initialized from the participant prop
    // to avoid false positives during initial render sync.
    // REQUIREMENT: Allow continuing with in-progress domains, so only invalidate if NO domains are eligible or in progress.
    const hasActive = domains.some(d => d.status === 'ELIGIBLE' || d.status === 'IN_PROGRESS');
    
    if (participant.assessmentPushed && !hasActive) {
      onUpdate({
        ...participant,
        assessmentPushed: false
      });
    }
  }, [domains, platformStatus, participant, onUpdate]);

  // Ref to access current participant and onUpdate in callbacks without dependency cycles
  const participantRef = useRef(participant);
  const onUpdateRef = useRef(onUpdate);
  
  useEffect(() => {
    participantRef.current = participant;
    onUpdateRef.current = onUpdate;
  }, [participant, onUpdate]);

  const updateGlobalState = useCallback((currentDomains: EligibilityDomain[], currentPlatform: DomainState, currentConsentRecords: ConsentRecord[], currentNotes: Note[], currentEligibilityRecords: EligibilityRecord[]) => {
    const currentParticipant = participantRef.current;
    if (!currentParticipant) return;

    const updatedDomainsRecord: Record<string, DomainState> = { ...currentParticipant.domains };
    
    // Merge standard domains
    currentDomains.forEach(d => {
       updatedDomainsRecord[d.id] = {
         id: d.id,
         eligibility: d.status,
         consent: d.consentStatus || 'NOT_APPLICABLE',
         randomisation: d.randomisationStatus || 'NOT_READY',
         assignedArm: d.assignedArm,
         withdrawalLevel: d.withdrawalLevel,
         stateDetails: d.stateDetails,
         strataDetails: d.strataDetails,
         randomisedDate: d.randomisedDate,
         history: d.history,
         consentVersion: d.consentVersion
       };
    });

    // Merge platform domain
    if (currentPlatform) {
        updatedDomainsRecord['platform'] = currentPlatform;
    }

    let newStatus = currentParticipant.status;
    const hasRandomised = currentDomains.some(d => 
        (d.randomisationStatus === 'RANDOMISED' || d.randomisationStatus === 'RANDOMISATION_REQUESTED') && 
        d.status === 'ELIGIBLE'
    );
    
    let updatedRandomisedId = currentParticipant.randomisedId;
    if (hasRandomised && !updatedRandomisedId) {
        updatedRandomisedId = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
    }

    // REQUIREMENT: Derive readiness ONLY from ELIGIBLE domains with OBTAINED consent or explicit READY state
    const hasEligibleToRandomise = currentDomains.some(d => 
        d.status === 'ELIGIBLE' && (
            d.randomisationStatus === 'READY' || 
            (d.consentStatus === 'OBTAINED' && d.randomisationStatus !== 'RANDOMISED')
        )
    );
    
    const hasPendingConsent = currentDomains.some(d => (d.status === 'ELIGIBLE' || d.status === 'IN_PROGRESS') && (d.consentStatus === 'PENDING_CONSENT' || d.consentStatus === 'SIG_REQUESTED' || d.consentStatus === 'SIG_PENDING'));
    const hasConsented = currentDomains.some(d => (d.status === 'ELIGIBLE' || d.status === 'IN_PROGRESS') && (d.consentStatus === 'OBTAINED'));
    const hasWithdrawn = currentDomains.some(d => d.consentStatus === 'WITHDRAWN');
    const hasDeclined = currentDomains.some(d => d.consentStatus === 'DECLINED');
    const hasExpired = currentDomains.some(d => d.status === 'EXPIRED');
    const hasEligible = currentDomains.some(d => d.status === 'ELIGIBLE') || currentPlatform?.eligibility === 'ELIGIBLE' || currentPlatform?.eligibility === 'COMPLETED';
    const allDomainsAssessed = currentDomains.every(d => d.status === 'ELIGIBLE' || d.status === 'NOT_ELIGIBLE' || d.status === 'EXPIRED') || currentPlatform?.eligibility === 'COMPLETED' || currentPlatform?.eligibility === 'NOT_ELIGIBLE';
    const hasAnyActivity = currentDomains.some(d => d.status !== 'NOT_ASSESSED') || (currentPlatform && currentPlatform.eligibility !== 'NOT_ASSESSED');

    if (hasRandomised) newStatus = 'Randomised';
    else if (hasWithdrawn) newStatus = 'Withdrawn';
    else if (hasEligibleToRandomise) newStatus = 'Eligible to randomise';
    else if (hasConsented) newStatus = 'Consented';
    else if (hasPendingConsent) newStatus = 'Pending consent';
    else if (hasDeclined) newStatus = 'Consent declined';
    else if (allDomainsAssessed && hasEligible) {
      newStatus = 'Assessment completed';
    }
    else if (allDomainsAssessed && !hasEligible) {
      newStatus = 'Not eligible';
    }
    else if (hasAnyActivity) {
      newStatus = 'In progress';
    }
    else {
      newStatus = 'New';
    }

    const actionableDomains = currentDomains.filter(d => 
        (d.status === 'ELIGIBLE' || d.status === 'IN_PROGRESS') && 
        d.consentStatus !== 'OBTAINED' && 
        d.consentStatus !== 'WITHDRAWN' && 
        d.consentStatus !== 'DECLINED' &&
        d.randomisationStatus !== 'RANDOMISED' &&
        d.randomisationStatus !== 'RANDOMISATION_REQUESTED'
    );
    
    let updatedCloseToExpire = currentParticipant.eligibilityCloseToExpire;
    let updatedAlertType = currentParticipant.alertType;

    if (actionableDomains.length === 0) {
        updatedCloseToExpire = false;
        if (updatedAlertType === 'error' || updatedAlertType === 'warning') {
            updatedAlertType = undefined;
        }
    }

    // Only call onUpdate if something actually changed to avoid loop
    const newParticipant = {
      ...currentParticipant,
      status: newStatus,
      randomisedId: updatedRandomisedId,
      eligibilityCloseToExpire: updatedCloseToExpire,
      alertType: updatedAlertType,
      domains: updatedDomainsRecord,
      consentRecords: currentConsentRecords,
      notes: currentNotes,
      eligibilityRecords: currentEligibilityRecords,
      randomisationUnlocked: randomisationUnlocked
    };

    if (JSON.stringify(currentParticipant) !== JSON.stringify(newParticipant)) {
        onUpdateRef.current(newParticipant);
    }
  }, [randomisationUnlocked]);


  // Sync local domain changes to global participant state
  // This is triggered when EligibilityForm calls setDomains (via handleEligibilityUpdate)
  useEffect(() => {
    updateGlobalState(domains, platformDomain, consentRecords, notes, eligibilityRecords);
  }, [domains, platformDomain, consentRecords, notes, eligibilityRecords, updateGlobalState]);

  const handleScrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      // Offset for sticky headers
      const y = element.getBoundingClientRect().top + window.scrollY - 180;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const handleEligibilitySubmit = (record: Partial<EligibilityRecord>) => {
    if (!participant) return;

    const newRecord: EligibilityRecord = {
      id: `elg-${Date.now()}`,
      timestamp: record.timestamp || '',
      status: record.status || 'NOT_ASSESSED',
      stateDetails: record.stateDetails,
      domainIds: record.domainIds || [],
      domainStatuses: record.domainStatuses || {},
      formValues: record.formValues,
      note: record.note,
      isActive: true
    };

    // Deactivate previous records and add new one
    const updatedRecords = eligibilityRecords.map(r => ({ ...r, isActive: false })).concat(newRecord);
    setEligibilityRecords(updatedRecords);

    // Update domains based on the new record
    const updatedDomains = domains.map(d => {
      if (newRecord.domainIds.includes(d.id)) {
        return {
          ...d,
          status: newRecord.domainStatuses[d.id]
        };
      }
      return d;
    });
    setDomains(updatedDomains);

    // Update platform domain
    setPlatformStatus(newRecord.status);
    setPlatformStateDetails(newRecord.stateDetails);
    setPlatformDomain(prev => ({
      ...prev,
      eligibility: newRecord.status,
      stateDetails: newRecord.stateDetails
    }));

    if (newRecord.note) {
      handleAddNote(`[Eligibility Assessment]\nDoc ID: ${newRecord.id}\nNote: ${newRecord.note}`);
    }

    // Explicitly update parent state
    const updatedDomainsRecord: Record<string, DomainState> = { ...participant.domains };
    updatedDomains.forEach(d => {
      updatedDomainsRecord[d.id] = {
        ...updatedDomainsRecord[d.id],
        eligibility: d.status,
        stateDetails: d.stateDetails,
        strataDetails: d.strataDetails
      };
    });
    // Update platform domain
    updatedDomainsRecord['platform'] = {
      ...platformDomain,
      eligibility: newRecord.status,
      stateDetails: newRecord.stateDetails
    };

    onUpdate({
      ...participant,
      domains: updatedDomainsRecord,
      eligibilityRecords: updatedRecords,
      assessmentPushed: false
    });
  };

  const handleAssessEligibility = () => {
    setIsViewingHistorical(false);
    setHistoricalDomainData(undefined);
    setHistoricalNote('');
    setIsEligibilityModalOpen(true);
  };

  const handleViewAssessment = (record: EligibilityRecord) => {
    const reconstructedDomainData: Record<string, DomainState> = {};
    
    // Platform domain
    reconstructedDomainData['platform'] = {
      id: 'platform',
      eligibility: record.status,
      consent: 'NOT_APPLICABLE',
      randomisation: 'NOT_READY',
      stateDetails: record.stateDetails,
      strataDetails: record.strataDetails,
      history: []
    };

    // Other domains
    record.domainIds.forEach(id => {
      reconstructedDomainData[id] = {
        id,
        eligibility: record.domainStatuses[id],
        consent: 'NOT_APPLICABLE',
        randomisation: 'NOT_READY',
        history: []
      };
    });

    setHistoricalDomainData(reconstructedDomainData);
    setHistoricalValues(record.formValues);
    setHistoricalNote(record.note || '');
    setIsViewingHistorical(true);
    setIsEligibilityModalOpen(true);
  };

  const handleEligibilityUpdate = useCallback((statusMap: Record<string, { status: EligibilityStatus; stateDetails?: string; strataDetails?: string }>) => {
    // 1. Handle Platform Logic (Separate Persistence)
    if (statusMap['platform']) {
        const update = statusMap['platform'];
        setPlatformStatus(update.status);
        setPlatformStateDetails(update.stateDetails);
        setPlatformStrataDetails(update.strataDetails);

        setPlatformDomain(prev => {
             const statusChanged = prev.eligibility !== update.status;
             const detailsChanged = prev.stateDetails !== update.stateDetails;
             const strataChanged = prev.strataDetails !== update.strataDetails;
             
             if (!statusChanged && !detailsChanged && !strataChanged) return prev;

             const newHistory = [...(prev.history || [])];
             const now = new Date();
             const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
             const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
             const timestamp = `${dateStr} ${timeStr}`;

             // Push history if significant change or value reset (cleared)
             // FIX: Only push history if we have a valid previous state (not empty and not just 'Unknown' if it's a transition)
             // This prevents "incorrect" entries when strata changes in an unassessed or unknown state
             if (prev.stateDetails && prev.stateDetails !== '' && prev.stateDetails !== 'Unknown' && 
                (statusChanged || detailsChanged)) {
                  
                  // Capture associated domains for the PREVIOUS state
                  let associatedDomains: { name: string; status: EligibilityStatus }[] = [];
                  if (prev.stateDetails) {
                      const sarsStatus = prev.stateDetails.split(',')[0].trim();
                      const domainIds = STATE_DOMAIN_MAPPING[sarsStatus] || [];
                      associatedDomains = domainsRef.current
                          .filter(d => domainIds.includes(d.id))
                          .map(d => ({ name: d.name, status: d.status }));
                  }

                  newHistory.push({
                      timestamp: timestamp,
                      status: prev.eligibility,
                      stateDetails: prev.stateDetails,
                      strataDetails: prev.strataDetails,
                      associatedDomains: associatedDomains
                  });
             }
             
             return { 
                 ...prev, 
                 eligibility: update.status, 
                 stateDetails: update.stateDetails,
                 strataDetails: update.strataDetails,
                 history: newHistory 
             };
        });
    }

    // 2. Handle Regular Domains
    setDomains(currentDomains => {
        let hasChanges = false;
        
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
        const timestamp = `${dateStr} ${timeStr}`;
        
        const updatedDomains = currentDomains.map(d => {
          const update = statusMap[d.id];
          if (update) {
            // Check if significant state change occurred
            const statusChanged = d.status !== update.status;
            const detailsChanged = d.stateDetails !== update.stateDetails || d.strataDetails !== update.strataDetails;

            if (statusChanged || detailsChanged) {
                hasChanges = true;
                
                const newDomainState = { 
                  ...d, 
                  status: update.status,
                  stateDetails: update.stateDetails,
                  strataDetails: update.strataDetails,
                  history: [...(d.history || [])]
                };

                const isValueReset = 
                    (d.strataDetails && (!update.strataDetails || update.strataDetails === '')) || 
                    (d.stateDetails && !update.stateDetails);

                const shouldPushHistory = 
                   // Case 1: Resetting a valid eligible value (The Plus Button functionality)
                   // We want to capture the state JUST BEFORE it is wiped.
                   (d.status === 'ELIGIBLE' && isValueReset) ||
                   // Case 2: Status changed from a valid state to something else (e.g. Eligible -> Not Eligible)
                   (statusChanged && d.status === 'ELIGIBLE') ||
                   // Case 3: Status changed from Not Eligible to something else, but only if it wasn't an "Unknown" state
                   (statusChanged && d.status === 'NOT_ELIGIBLE' && d.stateDetails && !d.stateDetails.includes('Unknown'));

                if (shouldPushHistory) {
                    newDomainState.history.push({
                        timestamp,
                        status: d.status,
                        stateDetails: d.stateDetails,
                        strataDetails: d.strataDetails
                    });
                }

                // REQUIREMENT: If status becomes NOT_ELIGIBLE, reset consent and randomisation
                // EXCEPT if a consent version already exists (preserving history)
                if (update.status === 'NOT_ELIGIBLE' && !d.consentVersion) {
                    newDomainState.consentStatus = 'NOT_APPLICABLE';
                    newDomainState.randomisationStatus = 'NOT_READY';
                }

                return newDomainState;
            }
          }
          return d;
        });
        
        if (!hasChanges) {
            return currentDomains;
        }
        return updatedDomains;
    });
  }, []);

  const handleDomainUpdate = (id: string, updates: Partial<EligibilityDomain>) => {
    setDomains(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const handleOpenRequestConsent = (domainIds?: string[], showSignature: boolean = false, isAnalogue: boolean = true, situation: string = 'Standard') => {
    const hasActiveDoc = consentRecords.some(r => r.isActive !== false);

    if (hasActiveDoc) {
      setPendingConsentParams({ domainIds, showSignature, isAnalogue, situation });
      setShowDeactivationAlert(true);
      return;
    }

    setConsentModalMode('request');
    setViewingConsentVersion(undefined);
    setDraftDocId(generateUniqueDocId(participant?.id || ''));
    setInitialConsentDomainIds(domainIds);
    setInitialShowSignature(showSignature);
    setInitialIsAnalogue(isAnalogue);
    setInitialSituation(situation);
    setShowConsentModal(true);
  };

  const handleViewConsent = (version: string) => {
    const record = consentRecords.find(r => r.version === version);
    if (record && (record.status === 'PENDING_CONSENT' || record.status === 'SIG_REQUESTED' || record.status === 'SIG_PENDING')) {
      setConsentModalMode('request');
      setViewingConsentVersion(undefined);
      setDraftDocId(version);
      setInitialConsentDomainIds(record.domainIds);
      setInitialShowSignature(record.status !== 'PENDING_CONSENT');
      setInitialIsAnalogue(record.isAnalogue);
      setInitialSituation(record.situation || 'Standard');
    } else {
      setConsentModalMode('view');
      setViewingConsentVersion(version);
      if (record && record.status === 'OBTAINED') {
        setInitialShowSignature(true);
        setInitialIsAnalogue(record.isAnalogue);
        setInitialSituation(record.situation || 'Standard');
        setInitialConsentDomainIds(record.domainIds);
      } else {
        setInitialShowSignature(false);
      }
    }
    setShowConsentModal(true);
  };

  const getRecordState = useCallback((record: ConsentRecord) => {
    if (record.version === 'Unknown') return platformStateDetails || 'Not started';
    const domainIds = record.domainIds;
    if (domainIds.some(id => STATE_DOMAIN_MAPPING['Negative'].includes(id))) return 'Negative';
    if (domainIds.some(id => STATE_DOMAIN_MAPPING['Positive'].includes(id))) return 'Positive';
    if (domainIds.some(id => STATE_DOMAIN_MAPPING['Unknown'].includes(id))) return 'Unknown';
    return 'Not started';
  }, [platformStateDetails]);

  const handleToggleActive = (id: string, isActive: boolean) => {
    setConsentRecords(prev => {
      const targetRecord = prev.find(r => r.id === id);
      if (!targetRecord) return prev;

      return prev.map(r => {
        if (r.id === id) {
          return { ...r, isActive };
        }
        // If we are activating a record, deactivate all others
        if (isActive) {
          return { ...r, isActive: false };
        }
        return r;
      });
    });
  };

  const handleRequestSignature = (
    domainIds: string[], 
    rcName?: string, 
    analogueSignatureStatus?: any, 
    extraName?: {role: string, name: string}[], 
    isAnalogue?: boolean, 
    situation?: string, 
    recipient?: string, 
    status?: string,
    processDateTime?: string,
    siteSideSelections?: string[],
    otherTextEntries?: {role: string, name: string}[],
    processNote?: string,
    note?: string
  ) => {
    console.log('handleRequestSignature called with draftDocId:', draftDocId);
    const newVersion = draftDocId || generateUniqueDocId(participant?.id || '');
    const newStatus = (status || 'SIG_REQUESTED') as any;

    // Update the pending record if it exists, or create a new one
    setConsentRecords(prev => {
      // First try to find by version (draftDocId)
      let pendingIndex = -1;
      if (draftDocId) {
        pendingIndex = prev.findIndex(r => r.version === draftDocId);
      }
      
      if (pendingIndex !== -1) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB').replace(/\//g, '.');
        const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const fullDate = `${dateStr} ${timeStr}`;

        const docName = rcName || 'Consent Document';
        const docId = newVersion;
        const docRef = `Doc: ${docName}\nDoc ID: ${docId}\nTime: ${new Date().toLocaleString('en-GB')}\n\n`;

        if (processNote && processNote.trim() !== '') {
          const formattedProcessNote = `[Process Data]\n${docRef}${processNote}`;
          handleAddNote(formattedProcessNote);
        }

        if (note && note.trim() !== '') {
          const formattedNote = `[Outcome Note]\n${docRef}${note}`;
          handleAddNote(formattedNote);
        }

        return prev.map((r, idx) => {
          if (idx === pendingIndex) {
            return {
              ...r,
              status: newStatus,
              version: newVersion,
              recipient: recipient || r.recipient,
              date: fullDate,
              rcName,
              analogueSignatureStatus,
              extraName,
              isAnalogue: isAnalogue ?? r.isAnalogue,
              situation: situation || r.situation || 'Standard',
              isActive: true, // Ensure it's active when updated/issued
              processNote,
              processDateTime,
              siteSideSelections,
              otherTextEntries,
              note
            };
          }
          return { ...r, isActive: false }; // Deactivate all other records
        });
      }
      
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB').replace(/\//g, '.');
      const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const fullDate = `${dateStr} ${timeStr}`;

      const targetState = getRecordState({ version: newVersion, domainIds } as ConsentRecord);

      const domainStatuses = domainIds.reduce((acc, id) => {
        acc[id] = newStatus;
        return acc;
      }, {} as Record<string, any>);

      const newRecord = {
        id: `rec-${Date.now()}`,
        version: newVersion,
        recipient: recipient || participant?.consentRecipient || 'Participant',
        isAnalogue: isAnalogue ?? false,
        domainIds,
        domainStatuses,
        status: newStatus,
        date: fullDate,
        situation: situation || 'Standard',
        isActive: true, // New record is active by default
        rcName,
        analogueSignatureStatus,
        extraName,
        processNote,
        processDateTime,
        siteSideSelections,
        otherTextEntries,
        note
      };

      const docName = rcName || 'Consent Document';
      const docId = newVersion;
      const docRef = `Doc: ${docName}\nDoc ID: ${docId}\nTime: ${new Date().toLocaleString('en-GB')}\n\n`;

      if (processNote && processNote.trim() !== '') {
        const formattedProcessNote = `[Process Data]\n${docRef}${processNote}`;
        handleAddNote(formattedProcessNote);
      }

      if (note && note.trim() !== '') {
        const formattedNote = `[Outcome Note]\n${docRef}${note}`;
        handleAddNote(formattedNote);
      }

      // Deactivate all existing records and add the new one
      return prev.map(r => ({ ...r, isActive: false })).concat(newRecord);
    });

    const updatedDomains = domains.map(d => {
      if (domainIds.includes(d.id)) {
        const isCurrentlyConsented = d.consentStatus === 'OBTAINED';
        const isDowngrade = isCurrentlyConsented && !['OBTAINED', 'WITHDRAWN', 'DECLINED'].includes(newStatus);
        const finalStatus = newStatus;

        return { 
            ...d, 
            consentStatus: isDowngrade ? d.consentStatus : finalStatus,
            consentVersion: newVersion 
        };
      }
      return d;
    });
    setDomains(updatedDomains);
    // Modal remains open for the "Issue Doc" flow
  };
  
  const handleAnalogueConsent = (
    domainIds: string[], 
    rcName?: string, 
    analogueSignatureStatus?: any, 
    extraName?: {role: string, name: string}[], 
    isAnalogue?: boolean, 
    situation?: string, 
    recipient?: string,
    processDateTime?: string,
    siteSideSelections?: string[],
    otherTextEntries?: {role: string, name: string}[],
    processNote?: string,
    note?: string
  ) => {
    const newVersion = draftDocId || generateUniqueDocId(participant?.id || '');

    setConsentRecords(prev => {
      // First try to find by version (draftDocId)
      let pendingIndex = -1;
      if (draftDocId) {
        pendingIndex = prev.findIndex(r => r.version === draftDocId);
      }
      
      if (pendingIndex !== -1) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB').replace(/\//g, '.');
        const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const fullDate = `${dateStr} ${timeStr}`;

        return prev.map((r, idx) => {
          if (idx === pendingIndex) {
            return {
              ...r,
              status: 'OBTAINED',
              version: newVersion,
              recipient: recipient || r.recipient,
              date: fullDate,
              rcName,
              analogueSignatureStatus,
              extraName,
              isAnalogue: isAnalogue ?? r.isAnalogue,
              situation: situation || r.situation || 'Standard',
              isActive: true, // Ensure it's active
              processNote,
              processDateTime,
              siteSideSelections,
              otherTextEntries,
              note
            };
          }
          return { ...r, isActive: false }; // Deactivate others
        });
      }
      
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB').replace(/\//g, '.');
      const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const fullDate = `${dateStr} ${timeStr}`;

      const targetState = getRecordState({ version: newVersion, domainIds } as ConsentRecord);

      const domainStatuses = domainIds.reduce((acc, id) => {
        acc[id] = 'OBTAINED';
        return acc;
      }, {} as Record<string, any>);

      const newRecord = {
        id: `rec-${Date.now()}`,
        version: newVersion,
        recipient: recipient || participant?.consentRecipient || 'Participant',
        isAnalogue: isAnalogue ?? true,
        domainIds,
        domainStatuses,
        status: 'OBTAINED',
        date: fullDate,
        situation: situation || 'Standard',
        isActive: true, // New record is active
        rcName,
        analogueSignatureStatus,
        extraName,
        processNote,
        processDateTime,
        siteSideSelections,
        otherTextEntries,
        note
      };

      const docName = rcName || 'Consent Document';
      const docId = newVersion;
      const docRef = `Doc: ${docName}\nDoc ID: ${docId}\nTime: ${new Date().toLocaleString('en-GB')}\n\n`;

      if (processNote && processNote.trim() !== '') {
        const formattedProcessNote = `[Process Data]\n${docRef}${processNote}`;
        handleAddNote(formattedProcessNote);
      }

      if (note && note.trim() !== '') {
        const formattedNote = `[Outcome Note]\n${docRef}${note}`;
        handleAddNote(formattedNote);
      }

      // Deactivate all existing records and add the new one
      return prev.map(r => ({ ...r, isActive: false })).concat(newRecord);
    });

    const updatedDomains = domains.map(d => {
      if (domainIds.includes(d.id)) {
        const finalStatus = 'OBTAINED';
        return { 
            ...d, 
            consentStatus: finalStatus as ConsentStatus,
            randomisationStatus: finalStatus === 'OBTAINED' ? 'READY' : 'NOT_READY' as RandomisationStatus,
            consentVersion: d.consentVersion || newVersion // Keep existing if was requested, else new
        };
      }
      return d;
    });
    setDomains(updatedDomains);
    setShowConsentModal(false);
  };

  const handleSimulateSign = () => {
    // Update consent records to OBTAINED
    setConsentRecords(prev => prev.map(r => {
        if (r.status === 'SIG_REQUESTED' || r.status === 'SIG_PENDING') {
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-GB').replace(/\//g, '.');
            const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            const fullDate = `${dateStr} ${timeStr}`;
            
            const updatedDomainStatuses = { ...r.domainStatuses };
            if (r.domainIds) {
              r.domainIds.forEach(id => {
                if (updatedDomainStatuses[id] !== 'DECLINED') {
                  updatedDomainStatuses[id] = 'OBTAINED';
                }
              });
            }
            
            return {
                ...r,
                status: 'OBTAINED',
                domainStatuses: updatedDomainStatuses,
                date: fullDate
            };
        }
        return r;
    }));

    const updatedDomains = domains.map(d => {
      // REQUIREMENT: Simulate signature only if ELIGIBLE or IN_PROGRESS
      // Only update domains that have actually requested a signature
      if ((d.status === 'ELIGIBLE' || d.status === 'IN_PROGRESS') && (d.consentStatus === 'SIG_REQUESTED' || d.consentStatus === 'SIG_PENDING')) {
        return { 
            ...d, 
            consentStatus: 'OBTAINED' as const,
            randomisationStatus: 'READY' as const
        };
      }
      return d;
    });
    setDomains(updatedDomains);
  };

  const handleSimulateSignOff = () => {
    const updatedDomains = domains.map(d => {
      if ((d.status === 'ELIGIBLE' || d.status === 'IN_PROGRESS') && (d.consentStatus === 'SIG_REQUESTED' || d.consentStatus === 'SIG_PENDING' || d.consentStatus === 'PENDING_CONSENT')) {
        return { 
            ...d, 
            consentStatus: 'OBTAINED' as const,
            randomisationStatus: 'READY' as const
        };
      }
      return d;
    });
    setDomains(updatedDomains);
  };

  const handleRevokeConsent = (revocations: { domainId: string; level?: string }[]) => {
    const currentDocId = viewingConsentVersion || draftDocId;
    if (currentDocId) {
      setConsentRecords(prev => {
        const updated = [...prev];
        const recordIndex = updated.findIndex(r => r.version === currentDocId);
        if (recordIndex !== -1) {
          const updatedDomainStatuses = { ...updated[recordIndex].domainStatuses };
          revocations.forEach(r => {
            updatedDomainStatuses[r.domainId] = 'WITHDRAWN';
          });
          updated[recordIndex] = {
            ...updated[recordIndex],
            domainStatuses: updatedDomainStatuses
          };
        }
        return updated;
      });
    }

    const updatedDomains = domains.map(d => {
      const revocation = revocations.find(r => r.domainId === d.id);
      if (revocation) {
        return { 
          ...d, 
          consentStatus: 'WITHDRAWN' as const,
          withdrawalLevel: revocation.level,
          randomisationStatus: 'NOT_READY' as const
        };
      }
      return d;
    });
    setDomains(updatedDomains);
    setShowRevokeModal(false);
  };

  const handleRandomise = (domainId?: string) => {
    if (domainId) {
      // Direct randomisation (e.g. from table row)
      executeRandomisation([domainId]);
    } else {
      // Bulk randomisation from header
      const currentState = platformStateDetails?.split(',')[0].trim() || 'Unknown';
      const associatedDomainIds = STATE_DOMAIN_MAPPING[currentState] || [];
      
      const readyDomains = domains.filter(d => {
        return (d.status === 'ELIGIBLE' || d.status === 'IN_PROGRESS') && 
          associatedDomainIds.includes(d.id) &&
          (d.consentStatus === 'OBTAINED') &&
          d.randomisationStatus !== 'RANDOMISED' &&
          consentRecords.some(r => r.isActive !== false && r.domainIds.includes(d.id) && (r.status === 'OBTAINED'));
      });

      if (readyDomains.length === 0) return;
      
      setSelectedDomainsForRandomisation(readyDomains.map(d => d.id));
      setShowRandomiseConfirmation(true);
    }
  };

  const executeRandomisation = (domainIds: string[]) => {
    const updatedDomains = domains.map(d => {
      if (domainIds.includes(d.id)) {
        const arms = ['Placebo', 'Treatment A', 'Treatment B'];
        const arm = arms[Math.floor(Math.random() * arms.length)];
        return { 
          ...d, 
          randomisationStatus: 'RANDOMISED' as const,
          assignedArm: arm,
          randomisedDate: new Date().toISOString().split('T')[0].split('-').reverse().join('.')
        };
      }
      return d;
    });
    
    setDomains(updatedDomains);
    setRandomisationUnlocked(true);
    setActiveTab('randomisation');
  };

  const handleContinueToConsent = () => {
    if (participant) {
      if (participant.assessmentPushed || hasAdvancedProgress) {
        // If already pushed, just switch tab
        setActiveTab('consent');
      } else {
        // If there are actionable domains, we can continue
        const actionableDomainIds = domains
          .filter(d => d.status === 'ELIGIBLE' || d.status === 'IN_PROGRESS')
          .map(d => d.id);

        if (actionableDomainIds.length > 0) {
            executeContinueToConsent();
        } else {
            // If no actionable domains, they need to do an assessment
            setActiveTab('eligibility');
            setIsEligibilityModalOpen(true);
        }
      }
    }
  };

  const executeContinueToConsent = () => {
    if (participant) {
      // Bypass wizard, use default parameters: recipient='participant', situation='Standard', isAnalogue=true
      const actionableDomainIds = domains
        .filter(d => d.status === 'ELIGIBLE' || d.status === 'IN_PROGRESS')
        .map(d => d.id);
      handleConfirmRecipient('participant', actionableDomainIds, true, 'Standard');
    }
  };

  const handleConfirmRecipient = (recipient: string, selectedDomainIds: string[], isAnalogue: boolean, situation: string) => {
    const documentName = `${recipient.toLowerCase()} ${situation.toLowerCase()}`;
    const existingObtained = consentRecords.find(r => 
        `${(r.recipient || '').toLowerCase()} ${(r.situation || 'Standard').toLowerCase()}` === documentName && 
        r.isActive !== false &&
        r.domainIds.some(id => selectedDomainIds.includes(id))
    );

    if (existingObtained) {
        alert(`A document with recipient "${recipient}" and situation "${situation}" already exists.`);
        return;
    }

    if (participant) {
      const version = generateUniqueDocId(participant.id);
      setDraftDocId(version);
      
      // Update domains that were selected to PENDING_CONSENT
      const updatedDomains = domains.map(d => {
        if (selectedDomainIds.includes(d.id)) {
             const isCurrentlyConsented = d.consentStatus === 'OBTAINED';
             return { 
               ...d, 
               consentStatus: isCurrentlyConsented ? d.consentStatus : 'PENDING_CONSENT' as const,
               consentVersion: version
             };
        }
        return d;
      });

      // Update the local state immediately
      setDomains(updatedDomains);

      // Construct the full updated domains record for the global update
      const updatedDomainsRecord: Record<string, DomainState> = { ...participant.domains };
      updatedDomains.forEach(d => {
        updatedDomainsRecord[d.id] = {
          ...updatedDomainsRecord[d.id],
          consent: d.consentStatus || 'NOT_APPLICABLE',
          consentVersion: d.consentVersion || (selectedDomainIds.includes(d.id) ? version : undefined)
        };
      });

      // Mark the latest eligibility record as closed
      const updatedEligibilityRecords = eligibilityRecords.map((r, idx) => {
        if (idx === eligibilityRecords.length - 1) {
          return { ...r, isClosed: true };
        }
        return r;
      });
      setEligibilityRecords(updatedEligibilityRecords);

      // Call onUpdate with all changes at once to avoid multiple state sync cycles
      onUpdate({
        ...participant,
        assessmentPushed: true,
        consentRecipient: recipient,
        domains: updatedDomainsRecord,
        eligibilityRecords: updatedEligibilityRecords
      });
      
      setShowRecipientModal(false);
      setActiveTab('consent');
      handleOpenRequestConsent(selectedDomainIds, false, isAnalogue, situation);
    }
  };

  if (!participant) return <div>Loading...</div>;

  // Filter the domains to be displayed based on user's visibleDomains selection
  const displayDomains = domains.filter(d => visibleDomains.includes(d.id));
  
  const hasAdvancedProgress = domains.some(d => 
    (d.status === 'ELIGIBLE' || d.status === 'IN_PROGRESS') && (
        ['PENDING_CONSENT', 'SIG_REQUESTED', 'SIG_PENDING', 'OBTAINED', 'DECLINED', 'WITHDRAWN'].includes(d.consentStatus || '') ||
        d.randomisationStatus === 'READY' ||
        d.randomisationStatus === 'RANDOMISED' ||
        d.randomisationStatus === 'RANDOMISATION_REQUESTED'
    )
  );

  const hasExpired = domains.some(d => d.status === 'EXPIRED');

  // UNLOCK LOGIC: Consent is locked UNLESS 'Continue to consent' was clicked (assessmentPushed) OR advanced progress already exists OR eligibility is expired
  const consentLocked = !participant.assessmentPushed && !hasAdvancedProgress && !hasExpired;

  const hasEligibleToRandomiseOrRandomised = domains.some(d => 
    (d.status === 'ELIGIBLE' || d.status === 'IN_PROGRESS') && (
        d.randomisationStatus === 'RANDOMISED' || 
        d.randomisationStatus === 'RANDOMISATION_REQUESTED'
    )
  );
  
  const randomisationLocked = !randomisationUnlocked && (!hasEligibleToRandomiseOrRandomised || consentLocked);
  
  const currentState = platformDomain.stateDetails ? platformDomain.stateDetails.split(',')[0].trim() : 'Unknown';
  const currentDomainIds = STATE_DOMAIN_MAPPING[currentState] || [];

  const hasAssignment = domains.some(d => 
    currentDomainIds.includes(d.id) &&
    d.status === 'ELIGIBLE' &&
    (d.consentStatus === 'OBTAINED') &&
    d.randomisationStatus === 'RANDOMISED'
  );
  
  const assignmentLocked = !hasAssignment;
  
  const eligibilityLocked = !!participant.assessmentPushed || participant.status === 'Randomised' || participant.status === 'Expired';

  const combinedDomainData = React.useMemo(() => {
    const record: Record<string, any> = {
        [platformDomain.id]: platformDomain
    };
    domains.forEach(d => {
        record[d.id] = d;
    });
    return record;
  }, [platformDomain, domains]);

  const handleConfirmDeactivation = (dontShowAgain: boolean) => {
    setShowDeactivationAlert(false);
    
    if (pendingConsentParams) {
      const { domainIds, showSignature, isAnalogue, situation } = pendingConsentParams;
      setConsentModalMode('request');
      setViewingConsentVersion(undefined);
      setDraftDocId(generateUniqueDocId(participant?.id || ''));
      setInitialConsentDomainIds(domainIds);
      setInitialShowSignature(showSignature);
      setInitialIsAnalogue(isAnalogue);
      setInitialSituation(situation);
      setShowConsentModal(true);
      setPendingConsentParams(null);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    const currentDocId = viewingConsentVersion || draftDocId;
    
    // Update the consent record status
    setConsentRecords(prev => {
      const recordIndex = prev.findIndex(r => r.version === currentDocId);
      
      if (recordIndex !== -1) {
        return prev.map((r, idx) => {
          if (idx === recordIndex) {
            const updatedDomainStatuses = { ...r.domainStatuses };
            if (r.domainIds) {
              r.domainIds.forEach(id => {
                if (updatedDomainStatuses[id] !== 'DECLINED') {
                  updatedDomainStatuses[id] = newStatus as any;
                }
              });
            }

            return {
              ...r,
              status: newStatus as any,
              domainStatuses: updatedDomainStatuses,
              isActive: true // Ensure the current record is active
            };
          }
          return { ...r, isActive: false }; // Deactivate all other records
        });
      }
      return prev;
    });

    // Update the domain statuses
    const currentRecord = consentRecords.find(r => r.version === (viewingConsentVersion || draftDocId));
    if (currentRecord) {
      setDomains(prev => prev.map(d => {
        if (currentRecord.domainIds.includes(d.id)) {
          // Preserve OBTAINED unless the new status is a final state that should override it
          const isCurrentlyConsented = d.consentStatus === 'OBTAINED';
          const isDowngrade = isCurrentlyConsented && !['OBTAINED', 'WITHDRAWN', 'DECLINED'].includes(newStatus);
          
          // If the domain is already declined or withdrawn, don't overwrite it with a generic document status
          const isFinalStatus = d.consentStatus === 'DECLINED' || d.consentStatus === 'WITHDRAWN';
          const shouldPreserve = isDowngrade || (isFinalStatus && !['DECLINED', 'WITHDRAWN'].includes(newStatus));

          if (shouldPreserve) {
            return d;
          }
          
          return {
            ...d,
            consentStatus: newStatus as any
          };
        }
        return d;
      }));
    }
  };

  const handleDomainConsentChange = (domainId: string, isConsented: boolean) => {
    const currentDocId = viewingConsentVersion || draftDocId;
    if (currentDocId) {
      setConsentRecords(prev => {
        const updated = [...prev];
        const recordIndex = updated.findIndex(r => r.version === currentDocId);
        if (recordIndex !== -1) {
          const updatedDomainStatuses = { ...updated[recordIndex].domainStatuses };
          updatedDomainStatuses[domainId] = isConsented ? 'OBTAINED' : 'DECLINED';
          updated[recordIndex] = {
            ...updated[recordIndex],
            domainStatuses: updatedDomainStatuses
          };
        }
        return updated;
      });
    }

    setDomains(prev => prev.map(d => {
      if (d.id === domainId) {
        return {
          ...d,
          consentStatus: isConsented ? 'OBTAINED' : 'DECLINED'
        };
      }
      return d;
    }));
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-12 animate-in fade-in slide-in-from-right-4 duration-300">
      <ParticipantHeader 
        participantId={participant.id}
        participantUid={participant.uid}
        randomisedId={participant.randomisedId}
        status={participant.status}
        domains={domains} // Header logic usually considers all domains for status
        consentRecords={consentRecords}
        activeTab={activeTab}
        onContinue={handleContinueToConsent}
        onRevokeConsent={() => setShowRevokeModal(true)}
        onRandomise={handleRandomise}
        onRequestConsent={() => handleOpenRequestConsent()}
        onBack={onBack}
        onShowDetails={() => setIsInfoModalOpen(true)}
        assessmentPushed={participant.assessmentPushed}
        platformStateDetails={platformStateDetails}
        onAssessEligibility={handleAssessEligibility}
        isLocked={eligibilityLocked}
      />

      <Tabs 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        consentLocked={consentLocked}
        randomisationLocked={randomisationLocked}
        assignmentLocked={assignmentLocked}
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className={activeTab === 'eligibility' ? 'block' : 'hidden'}>
          <div className="mt-8">
            <EligibilityView 
              domains={displayDomains}
              eligibilityRecords={eligibilityRecords}
              notes={notes}
              onAssessEligibility={handleAssessEligibility}
              onViewAssessment={handleViewAssessment}
              onToggleActive={(id, isActive) => {
                // Logic for toggling active eligibility if needed
              }}
              onAddNote={(episode, initialTab) => {
                setActiveNoteEpisode(episode);
                setInitialNoteTab(initialTab || 'view');
              }}
              alerts={participant.activeAlerts}
              platformStateDetails={platformStateDetails}
              showNewDomain={showNewDomain}
              isLocked={eligibilityLocked}
            />
          </div>
        </div>

        {activeTab === 'consent' && (
          <div className="mt-8">
            <ConsentView 
              domains={displayDomains}
              consentRecords={consentRecords}
              notes={notes}
              onRequestConsent={() => handleOpenRequestConsent()}
              onRevokeConsent={() => setShowRevokeModal(true)}
              onSimulateSign={handleSimulateSign}
              onRandomise={handleRandomise}
              onViewConsent={handleViewConsent}
              onToggleActive={handleToggleActive}
              onAddNote={(episode, initialTab) => {
                setActiveNoteEpisode(episode);
                setInitialNoteTab(initialTab || 'view');
              }}
              eligibilityCloseToExpire={participant.eligibilityCloseToExpire}
              alerts={participant.activeAlerts}
              platformStateDetails={platformStateDetails}
              consentRecipient={participant.consentRecipient}
              customEpisodeNames={participant.customEpisodeNames}
              onUpdateEpisodeName={handleUpdateEpisodeName}
            />
          </div>
        )}

        {activeTab === 'randomisation' && (
          <div className="mt-8">
            <RandomisationView 
              domains={displayDomains}
              onRandomise={handleRandomise}
              onWithdraw={() => setShowRevokeModal(true)}
              alerts={participant.activeAlerts}
              platformDomain={platformDomain}
              customEpisodeNames={participant.customRandomisationEpisodeNames}
              onUpdateEpisodeName={handleUpdateRandomisationEpisodeName}
            />
          </div>
        )}

        {activeTab === 'assignment' && (
          <div className="mt-8">
            <AssignmentView 
              domains={displayDomains}
              platformDomain={platformDomain}
            />
          </div>
        )}
      </div>

      <EligibilityFormModal 
        isOpen={isEligibilityModalOpen}
        onClose={() => {
          setIsEligibilityModalOpen(false);
          setIsViewingHistorical(false);
          setHistoricalDomainData(undefined);
          setHistoricalValues(undefined);
          setHistoricalNote('');
        }}
        onSubmit={handleEligibilitySubmit}
        domains={domains}
        domainData={isViewingHistorical ? historicalDomainData : combinedDomainData}
        initialValues={isViewingHistorical ? historicalValues : undefined}
        previousValues={!isViewingHistorical && eligibilityRecords.length > 0 ? eligibilityRecords[eligibilityRecords.length - 1].formValues : undefined}
        alerts={participant.activeAlerts}
        visibleDomains={visibleDomains}
        readOnly={isViewingHistorical}
        initialNote={isViewingHistorical ? historicalNote : ''}
        showNewDomain={showNewDomain}
      />

      <RequestConsentModal 
        isOpen={showConsentModal}
        onClose={() => {
          setDraftDocId('');
          setShowConsentModal(false);
        }}
        domains={displayDomains.map(d => {
          const record = consentRecords.find(r => r.version === (viewingConsentVersion || draftDocId));
          if (record && record.domainStatuses && record.domainStatuses[d.id]) {
            return { ...d, consentStatus: record.domainStatuses[d.id] };
          }
          return d;
        })}
        onRequestSignature={handleRequestSignature}
        onAnalogueConsent={handleAnalogueConsent}
        onStatusChange={handleStatusChange}
        onDomainConsentChange={handleDomainConsentChange}
        onRandomise={handleRandomise}
        onRevokeConsent={() => setShowRevokeModal(true)}
        participant={participant}
        site={SITES.find(s => s.id === participant.siteId)}
        consentRecords={consentRecords}
        mode={consentModalMode}
        viewingVersion={viewingConsentVersion}
        draftDocumentId={draftDocId}
        initialSelectedDomainIds={initialConsentDomainIds}
        initialShowSignature={initialShowSignature}
        initialIsAnalogue={initialIsAnalogue}
        initialScenario={initialSituation}
        initialRecipient={consentRecords.find(r => r.version === (viewingConsentVersion || draftDocId))?.recipient}
        isInactive={consentRecords.find(r => r.version === (viewingConsentVersion || draftDocId))?.isActive === false}
        status={consentRecords.find(r => r.version === (viewingConsentVersion || draftDocId))?.status}
        initialRcName={consentRecords.find(r => r.version === (viewingConsentVersion || draftDocId))?.rcName}
        initialExtraName={consentRecords.find(r => r.version === (viewingConsentVersion || draftDocId))?.extraName}
        initialAnalogueSignatureStatus={consentRecords.find(r => r.version === (viewingConsentVersion || draftDocId))?.analogueSignatureStatus}
        initialProcessNote={consentRecords.find(r => r.version === (viewingConsentVersion || draftDocId))?.processNote}
        initialProcessDateTime={consentRecords.find(r => r.version === (viewingConsentVersion || draftDocId))?.processDateTime}
        initialSiteSideSelections={consentRecords.find(r => r.version === (viewingConsentVersion || draftDocId))?.siteSideSelections}
        initialOtherTextEntries={consentRecords.find(r => r.version === (viewingConsentVersion || draftDocId))?.otherTextEntries}
        initialNote={consentRecords.find(r => r.version === (viewingConsentVersion || draftDocId))?.note}
      />

      {/* Randomisation Confirmation Modal */}
      {showRandomiseConfirmation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-serif text-gray-900">Confirm Randomisation</h3>
              <button 
                onClick={() => setShowRandomiseConfirmation(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Select the domains you wish to randomise for this participant. All eligible domains are selected by default.
              </p>
              
              <div className="space-y-2">
                {domains.filter(d => {
                  const currentState = platformStateDetails?.split(',')[0].trim() || 'Unknown';
                  const associatedDomainIds = STATE_DOMAIN_MAPPING[currentState] || [];
                  return (d.status === 'ELIGIBLE' || d.status === 'IN_PROGRESS') && 
                    associatedDomainIds.includes(d.id) &&
                    (d.consentStatus === 'OBTAINED') &&
                    d.randomisationStatus !== 'RANDOMISED' &&
                    consentRecords.some(r => r.isActive !== false && r.domainIds.includes(d.id) && (r.status === 'OBTAINED'));
                }).map(domain => (
                  <label key={domain.id} className="flex items-center p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedDomainsForRandomisation.includes(domain.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDomainsForRandomisation([...selectedDomainsForRandomisation, domain.id]);
                          } else {
                            setSelectedDomainsForRandomisation(selectedDomainsForRandomisation.filter(id => id !== domain.id));
                          }
                        }}
                        className="w-5 h-5 text-brand-600 border-gray-300 rounded focus:ring-brand-500 transition-all cursor-pointer"
                      />
                    </div>
                    <span className="ml-3 text-sm font-medium text-gray-900 group-hover:text-brand-700 transition-colors">
                      {domain.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowRandomiseConfirmation(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  executeRandomisation(selectedDomainsForRandomisation);
                  setShowRandomiseConfirmation(false);
                }}
                disabled={selectedDomainsForRandomisation.length === 0}
                className={`px-6 py-2 text-sm font-bold rounded-xl shadow-sm transition-all flex items-center
                  ${selectedDomainsForRandomisation.length === 0 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-brand-600 text-white hover:bg-brand-700 hover:shadow-md'}
                `}
              >
                Randomise Selected
                <Icons.Shuffle className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        </div>
      )}

      <RevokeConsentModal
        isOpen={showRevokeModal}
        onClose={() => setShowRevokeModal(false)}
        domains={displayDomains}
        consentRecords={participant.consentRecords || []}
        onRevoke={handleRevokeConsent}
      />

      <ParticipantInfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        participant={participant}
        site={SITES.find(s => s.id === participant.siteId)}
      />

      <ConsentRecipientModal
        isOpen={showRecipientModal}
        onClose={() => setShowRecipientModal(false)}
        onConfirm={handleConfirmRecipient}
        participant={participant}
        domains={domains}
      />

      <NoteModal
        isOpen={!!activeNoteEpisode}
        onClose={() => setActiveNoteEpisode(null)}
        consentRecipient={participant.consentRecipient}
        initialTab={initialNoteTab}
        onSave={(content, type, data) => {
          if (type === 'process' && content.startsWith('[Process data]')) {
            // Check if a process data note already exists for this docId
            setNotes(prev => {
              const existingIndex = prev.findIndex(n => {
                const parsed = parseNoteContent(n.content);
                return parsed.type === 'Process data' && parsed.docId === data.docId;
              });
              
              if (existingIndex !== -1) {
                const updated = [...prev];
                updated[existingIndex] = {
                  ...updated[existingIndex],
                  content,
                  timestamp: new Date().toISOString()
                };
                return updated;
              } else {
                return [...prev, {
                  id: `note-${Date.now()}`,
                  content,
                  timestamp: new Date().toISOString(),
                  author: 'Dr. Smith'
                }];
              }
            });
          } else {
            handleAddNote(content);
          }
          
          if (type === 'process' && data) {
            const { docId, processDateTime, siteSideSelections, otherTextEntries, processNote } = data;
            
            setConsentRecords(prev => prev.map(r => {
              if (r.version === docId) {
                return {
                  ...r,
                  status: 'SIG_PENDING',
                  processDateTime,
                  siteSideSelections,
                  otherTextEntries,
                  processNote
                };
              }
              return r;
            }));

            setDomains(prev => prev.map(d => {
              const record = consentRecords.find(r => r.version === docId);
              if (record && record.domainIds.includes(d.id)) {
                if (d.consentStatus === 'SIG_REQUESTED' || d.consentStatus === 'PENDING_CONSENT') {
                  return { ...d, consentStatus: 'SIG_PENDING' as ConsentStatus };
                }
              }
              return d;
            }));

            setActiveNoteEpisode((prev: any) => {
              if (!prev) return prev;
              return {
                ...prev,
                rows: prev.rows.map((r: any) => {
                  if (r.version === docId) {
                    return {
                      ...r,
                      status: 'SIG_PENDING',
                      processDateTime,
                      siteSideSelections,
                      otherTextEntries,
                      processNote
                    };
                  }
                  return r;
                })
              };
            });

            if (data.fromTab !== 'process') {
              setActiveNoteEpisode(null);
            }
          } else if (type === 'outcome' && data) {
            const { docId, outcomeStaff, outcomeExtraName, outcomeDateTime, outcomeNote, domainVerifications } = data;
            
            const hasVerifications = Object.values(domainVerifications).some(v => v !== undefined);

            setConsentRecords(prev => prev.map(r => {
              if (r.version === docId) {
                const updatedDomainStatuses = { ...r.domainStatuses };
                Object.keys(domainVerifications).forEach(domainId => {
                  if (domainVerifications[domainId] === true) {
                    updatedDomainStatuses[domainId] = 'OBTAINED';
                  } else if (domainVerifications[domainId] === false) {
                    updatedDomainStatuses[domainId] = 'DECLINED';
                  }
                });

                const allDeclined = Object.keys(domainVerifications).length > 0 && Object.values(domainVerifications).every(v => v === false);
                return {
                  ...r,
                  status: hasVerifications ? (allDeclined ? 'DECLINED' : 'OBTAINED') : r.status,
                  rcName: outcomeStaff || r.rcName,
                  extraName: outcomeExtraName || r.extraName,
                  date: outcomeDateTime || r.date,
                  note: outcomeNote || r.note,
                  domainStatuses: updatedDomainStatuses,
                  outcomeDate: outcomeDateTime || r.outcomeDate
                };
              }
              return r;
            }));

            setDomains(prev => prev.map(d => {
              const record = data.docId ? { domainIds: prev.filter(x => x.id === d.id).map(x => x.id) } : null; // Mock record for domain check
              // Actually we should use data.docId to find the record in the NEW consentRecords, but we can't easily.
              // We know which domains are being verified because they are in domainVerifications keys.
              if (domainVerifications[d.id] !== undefined) {
                if (domainVerifications[d.id] === true) {
                  return { ...d, consentStatus: 'OBTAINED' as ConsentStatus, randomisationStatus: 'READY' as RandomisationStatus };
                } else if (domainVerifications[d.id] === false) {
                  return { ...d, consentStatus: 'DECLINED' as ConsentStatus };
                }
              }
              return d;
            }));

            setActiveNoteEpisode(null);
          }
        }}
        notes={notes}
        episode={activeNoteEpisode}
        readOnly={activeNoteEpisode?.isHistorical}
      />

      <DeactivationAlertModal
        isOpen={showDeactivationAlert}
        onClose={() => {
          setShowDeactivationAlert(false);
          setPendingConsentParams(null);
        }}
        onConfirm={handleConfirmDeactivation}
      />
    </div>
  );
};

export default ParticipantDetail;