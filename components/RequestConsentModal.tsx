import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import { EligibilityDomain, Participant, Site, ConsentRecord } from '../types';
import NoteModal from './NoteModal';

const RC_OPTIONS = ['Dr. Sarah Chan', 'Dr. Emily Wong', 'Nurse John Smith', 'Prof. David Miller'];
const EXTRA_OPTIONS = ['Interpreter', 'Witness', 'Guardian', 'Legal Representative', 'Staff'];
const PARTICIPANT_TYPE_OPTIONS = ['Participant', 'Legal Representative', 'Guardian', 'Next of Kin'];
const SCENARIO_OPTIONS = ['Standard', 'Change in capacity', 'Change in representative', 'Protocol amendment'];

const SearchableDropdown = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select...",
  disabled = false
}: { 
  options: string[], 
  value: string, 
  onChange: (val: string) => void,
  placeholder?: string,
  disabled?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm flex justify-between items-center transition-colors ${disabled ? 'bg-gray-50 cursor-not-allowed text-gray-500' : 'bg-white cursor-pointer hover:border-gray-400'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={value ? (disabled ? "text-gray-500" : "text-gray-900") : "text-gray-500"}>
          {value || placeholder}
        </span>
        <Icons.ChevronDown className="w-4 h-4 text-gray-400" />
      </div>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Icons.Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 transform -translate-y-1/2" />
              <input 
                type="text"
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded bg-gray-50 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <div 
                  key={opt}
                  className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  {opt}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-gray-400 italic">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface RequestConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  domains: EligibilityDomain[];
  onRequestSignature: (
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
  ) => void;
  onAnalogueConsent?: (
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
  ) => void;
  onStatusChange?: (status: string) => void;
  onDomainConsentChange?: (domainId: string, isConsented: boolean) => void;
  onRandomise?: () => void;
  onRevokeConsent?: () => void;
  participant: Participant;
  site?: Site;
  consentRecords?: ConsentRecord[];
  mode?: 'request' | 'view';
  viewingVersion?: string;
  draftDocumentId?: string;
  initialSelectedDomainIds?: string[];
  initialShowSignature?: boolean;
  initialIsAnalogue?: boolean;
  initialScenario?: string;
  initialRecipient?: string;
  isInactive?: boolean;
  status?: string;
  initialRcName?: string;
  initialExtraName?: {role: string, name: string}[];
  initialAnalogueSignatureStatus?: {
    participant: boolean;
    participantDateTime: string;
    investigator: boolean;
    investigatorDateTime: string;
    extra: boolean;
    extraDateTime: string;
  };
  initialProcessNote?: string;
  initialProcessDateTime?: string;
  initialSiteSideSelections?: string[];
  initialOtherTextEntries?: {role: string, name: string}[];
  initialNote?: string;
}

const RequestConsentModal: React.FC<RequestConsentModalProps> = ({ 
  isOpen, 
  onClose, 
  domains, 
  onRequestSignature,
  onAnalogueConsent,
  onStatusChange,
  onDomainConsentChange,
  onRandomise,
  onRevokeConsent,
  participant,
  site,
  consentRecords = [],
  mode = 'request',
  viewingVersion,
  draftDocumentId,
  initialSelectedDomainIds,
  initialShowSignature = false,
  initialIsAnalogue = true,
  initialScenario = 'Standard',
  initialRecipient,
  isInactive = false,
  status,
  initialRcName = '',
  initialExtraName = [],
  initialAnalogueSignatureStatus,
  initialProcessDateTime = '',
  initialSiteSideSelections = [],
  initialOtherTextEntries = [],
  initialProcessNote = '',
  initialNote = ''
}) => {
  const hasExpired = domains.some(d => d.status === 'EXPIRED');
  
  const isViewMode = mode === 'view';
  const isVersionNotStarted = viewingVersion && domains.some(d => d.consentVersion === viewingVersion && d.consentStatus === 'PENDING_CONSENT');
  const isReadOnly = (isViewMode && !isVersionNotStarted) || isInactive || status === 'OBTAINED';
  const isCompleted = status === 'OBTAINED' || status === 'DECLINED' || status === 'WITHDRAWN' || status === 'CONSENTED';
  const isActiveEpisode = !isCompleted && !isInactive;

  const [selectedDomainIds, setSelectedDomainIds] = useState<string[]>([]);
  const [generatedDate, setGeneratedDate] = useState<string>('');
  
  const [rcName, setRcName] = useState(initialRcName);
  const [extraName, setExtraName] = useState<{role: string, name: string}[]>(initialExtraName);
  const [participantType, setParticipantType] = useState(mode === 'request' && !status ? '' : (initialRecipient || 'Participant'));
  const [scenario, setScenario] = useState(mode === 'request' && !status ? '' : initialScenario);
  const [isAnalogueMode, setIsAnalogueMode] = useState(true);
  const [showSignature, setShowSignature] = useState(false);
  const [isTrailsOpen, setIsTrailsOpen] = useState(false);
  const [isParticipantOpen, setIsParticipantOpen] = useState(false);
  const [isExtraOpen, setIsExtraOpen] = useState(false);
  const [isDocSettingsOpen, setIsDocSettingsOpen] = useState(true);
  const [isDocProcessOpen, setIsDocProcessOpen] = useState(false);
  const [isOutcomeOpen, setIsOutcomeOpen] = useState(false);
  const [isMetadataOpen, setIsMetadataOpen] = useState(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteModalTab, setNoteModalTab] = useState<'view' | 'process' | 'outcome'>('process');
  const [filterInProgress, setFilterInProgress] = useState(false);
  const [activeTab, setActiveTab] = useState<'participant' | 'guardian'>('guardian');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [siteSideSelections, setSiteSideSelections] = useState<string[]>([]);
  const [otherTextEntries, setOtherTextEntries] = useState<{role: string, name: string}[]>([]);
  const [processDateTime, setProcessDateTime] = useState('');
  const [processNote, setProcessNote] = useState(initialProcessNote || '');
  const [outcomeNote, setOutcomeNote] = useState(initialNote || '');
  const [analogueSignatureStatus, setAnalogueSignatureStatus] = useState(initialAnalogueSignatureStatus || {
    participant: false,
    participantDateTime: '',
    investigator: false,
    investigatorDateTime: '',
    extra: false,
    extraDateTime: ''
  });

  // Determine if a domain requires consent action
  const needsConsent = (d: EligibilityDomain) => {
    // Must be eligible or in progress
    if (d.status !== 'ELIGIBLE' && d.status !== 'IN_PROGRESS') return false;
    
    // Statuses that imply the domain is already handled or in progress
    const handledStatuses = [
      'OBTAINED',
      'SIG_REQUESTED', 
      'SIG_PENDING',
      // 'WITHDRAWN', // Allow withdrawn to be selected for re-consent
      // 'DECLINED', // Allow declined to be selected for re-consent
      'OBTAINED'
    ];
    
    if (d.consentStatus && handledStatuses.includes(d.consentStatus)) return false;
    if (d.randomisationStatus === 'RANDOMISED') return false;

    return true;
  };

  // Reset/Initialize selection when modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'view' && viewingVersion) {
         // In view mode, select all domains that share this version
         setSelectedDomainIds(domains
            .filter(d => d.consentVersion === viewingVersion)
            .map(d => d.id));
      } else if (initialSelectedDomainIds && initialSelectedDomainIds.length > 0) {
         // Use explicitly provided initial selection
         setSelectedDomainIds(initialSelectedDomainIds);
      } else {
         // Select only domains that actively need consent
         setSelectedDomainIds(domains
            .filter(needsConsent)
            .map(d => d.id));
      }
      
      // Set generated date to today
      const today = new Date();
      setGeneratedDate(today.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.'));
      
      // Reset analogue state
      setAnalogueSignatureStatus({ 
        participant: false, 
        participantDateTime: '', 
        investigator: false, 
        investigatorDateTime: '', 
        extra: false, 
        extraDateTime: ''
      });

      const isNewDocument = mode === 'request' && !status;

      // Sync participant type from participant data
      if (isNewDocument) {
        setParticipantType('');
        setScenario('');
      } else if (initialRecipient) {
        setParticipantType(initialRecipient);
      } else if (participant.consentRecipient) {
        const typeMap: Record<string, string> = {
          'participant': 'Participant',
          'guardian': 'Guardian',
          'minor': 'Guardian',
          'witness': 'Participant' // Witness is usually extra, but the signer is still participant/guardian
        };
        const initialType = typeMap[participant.consentRecipient] || 'Participant';
        setParticipantType(initialType);
        
        if (participant.consentRecipient === 'witness') {
          setExtraName([{role: 'Witness', name: ''}]);
        } else {
          setExtraName([]);
        }
      }

      setIsAnalogueMode(initialIsAnalogue);
      setShowSignature(initialShowSignature);
      if (!isNewDocument) {
        setScenario(initialScenario);
      }
      setRcName(initialRcName);
      if (participant.consentRecipient !== 'witness' || !isNewDocument) {
        setExtraName(initialExtraName);
      }
      if (initialAnalogueSignatureStatus) {
        setAnalogueSignatureStatus(initialAnalogueSignatureStatus);
      }
      setIsTrailsOpen(false);
      setIsParticipantOpen(false);
      setIsExtraOpen(false);
      setIsDocSettingsOpen(true);
      setSiteSideSelections(initialSiteSideSelections);
      setOtherTextEntries(initialOtherTextEntries);
      setProcessDateTime(initialProcessDateTime || '');
      setProcessNote(initialProcessNote || '');
      setOutcomeNote(initialNote || '');
      
      // Determine initial step based on status
      if (status === 'SIG_PENDING' || status === 'SIG_REQUESTED' || status === 'PENDING_CONSENT' || initialShowSignature) {
        setCurrentStep(2);
        setIsDocSettingsOpen(true);
        setIsDocProcessOpen(true);
        setIsOutcomeOpen(true);
      } else {
        setCurrentStep(1);
        setIsDocSettingsOpen(true);
        setIsDocProcessOpen(false);
        setIsOutcomeOpen(false);
      }
      
      setIsLeftPanelOpen(true);
    }
  }, [isOpen, isReadOnly]);

  if (!isOpen) return null;

  const STATE_DOMAIN_MAPPING: Record<string, string[]> = {
    'Negative': ['antibiotics'],
    'Positive': ['anticoagulation', 'respiratory'],
    'Unknown': ['statins', 'vasopressors']
  };

  const platformState = participant.domains['platform']?.stateDetails;
  const allowedDomains = platformState ? STATE_DOMAIN_MAPPING[platformState] : undefined;

  // Filter domains to display in the list. 
  // We want to show eligible domains + any that have relevant consent history for context.
  // REQUIREMENT: Also show IN_PROGRESS domains as requested.
  // NEW REQUIREMENT: Filter based on participant status (state)
  const displayDomains = domains.filter(d => 
    (d.status === 'ELIGIBLE' || 
    d.status === 'IN_PROGRESS' ||
    ['OBTAINED', 'SIG_REQUESTED', 'SIG_PENDING', 'WITHDRAWN', 'DECLINED'].includes(d.consentStatus || '')) &&
    (!allowedDomains || allowedDomains.includes(d.id)) &&
    (!filterInProgress || d.status === 'IN_PROGRESS')
  );
  
  const toggleDomain = (id: string, isHandled: boolean, consentStatus?: string) => {
    if (mode === 'view') return; // Cannot toggle in view mode
    if (isHandled && consentStatus !== 'OBTAINED' && consentStatus !== 'DECLINED') return; // Prevent toggling handled domains unless consented or declined
    if (hasExpired) return; // Cannot toggle if expired
    
    setSelectedDomainIds(prev => 
      prev.includes(id) 
        ? prev.filter(d => d !== id) 
        : [...prev, id]
    );
  };

  const handleRequestSignature = () => {
    if (!hasExpired) {
        if (onStatusChange) onStatusChange('SIG_REQUESTED');
        onRequestSignature(
          selectedDomainIds, 
          rcName, 
          analogueSignatureStatus, 
          cleanExtraNameArray.length > 0 ? cleanExtraNameArray : undefined, 
          isAnalogueMode, 
          scenario, 
          participantType, 
          'SIG_REQUESTED',
          processDateTime,
          siteSideSelections,
          otherTextEntries,
          processNote,
          outcomeNote
        );
    }
  };

  const handleConfirmAnalogue = () => {
    if (onAnalogueConsent && !hasExpired) {
        if (onStatusChange) onStatusChange('OBTAINED');
        onAnalogueConsent(
          selectedDomainIds, 
          rcName, 
          analogueSignatureStatus, 
          cleanExtraNameArray.length > 0 ? cleanExtraNameArray : undefined, 
          isAnalogueMode, 
          scenario, 
          participantType,
          processDateTime,
          siteSideSelections,
          otherTextEntries,
          processNote,
          outcomeNote
        );
    }
  };

  // Filter domains for the document preview based on user selection
  const domainsToIncludeInDoc = displayDomains.filter(d => selectedDomainIds.includes(d.id));
  
  // Check if any selected domain already has a document for the selected participant type and scenario
  const hasExistingConsentForSelection = selectedDomainIds.some(domainId => {
    if (!participantType || !scenario) return false;
    // If it's a new document, it will be part of a new episode group, so don't check for existing consent
    if (!draftDocumentId && !viewingVersion) return false;
    return consentRecords.some(record => 
      record.version !== (draftDocumentId || viewingVersion) &&
      record.domainIds.includes(domainId) &&
      record.recipient === participantType &&
      (record.situation || 'Standard') === scenario &&
      record.isActive !== false &&
      !['DECLINED', 'WITHDRAWN', 'OBTAINED', 'CONSENTED'].includes(record.status)
    );
  });
  
  const isFormValid = selectedDomainIds.length > 0 && participantType !== '' && scenario !== '' && !hasExistingConsentForSelection;
  
  // Format long date for document
  const longDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  
  // Construct full ID
  const displayUid = participant.randomisedId ? participant.uid.replace('SCR', 'PAR') : participant.uid;
  const displayId = participant.randomisedId || participant.id;
  const participantFullId = `${displayUid}-${displayId}`;

  const cleanExtraNameArray = extraName.filter(n => n.role.trim() !== '' || n.name.trim() !== '');

  const isAnalogueComplete = 
    analogueSignatureStatus.participantDateTime !== '' && 
    analogueSignatureStatus.investigatorDateTime !== '' &&
    rcName !== '' &&
    (!cleanExtraNameArray.length || analogueSignatureStatus.extraDateTime !== '');

  const anyDomainVerified = domainsToIncludeInDoc.some(d => d.consentStatus === 'OBTAINED');

  const isSubmitDisabled = false;

  const handleConsentAll = () => {
    domainsToIncludeInDoc.forEach(domain => {
      onDomainConsentChange?.(domain.id, true);
    });
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (selectedDomainIds.length === 0) {
        alert('Please select at least one domain.');
        return;
      }
      console.log('Calling onRequestSignature');
      try {
        onRequestSignature(
          selectedDomainIds, 
          rcName, 
          analogueSignatureStatus, 
          cleanExtraNameArray.length > 0 ? cleanExtraNameArray : undefined, 
          isAnalogueMode, 
          scenario, 
          participantType, 
          'PENDING_CONSENT',
          processDateTime,
          siteSideSelections,
          otherTextEntries,
          processNote,
          outcomeNote
        );
        console.log('onRequestSignature succeeded, closing modal');
        if (onStatusChange) onStatusChange('PENDING_CONSENT');
        onClose();
      } catch (e) {
        console.error('Error in onRequestSignature:', e);
        alert('Failed to generate document. Please try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900 bg-opacity-40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1200px] h-[90vh] flex flex-col overflow-hidden relative border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">STATE: {participant.stateDetails || 'POSITIVE'}</p>
                <button 
                  onClick={() => setFilterInProgress(!filterInProgress)}
                  className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded transition-colors ${filterInProgress ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'}`}
                >
                  {filterInProgress ? 'In Progress Only' : 'All Domains'}
                </button>
                {status && (
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                    ${status === 'OBTAINED' ? 'bg-green-100 text-green-700' : 
                      status === 'SIG_REQUESTED' || status === 'SIG_PENDING' ? 'bg-blue-100 text-blue-700' : 
                      status === 'PENDING_CONSENT' ? 'bg-gray-100 text-gray-600' : 
                      'bg-gray-100 text-gray-600'}
                  `}>
                    {status === 'SIG_REQUESTED' ? 'Awaiting consent' : 
                     status === 'SIG_PENDING' ? 'In progress' : 
                     status === 'PENDING_CONSENT' ? 'Draft' : 
                     status.replace('_', ' ')}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-serif text-gray-900">
                  {isReadOnly ? `Consent Document ${viewingVersion}` : `${draftDocumentId || `DOC-${participant.id.replace(/\D/g, '')}`}`}
              </h2>
            </div>
            <button 
              onClick={() => setIsMetadataOpen(!isMetadataOpen)}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-500 flex items-center gap-1 text-xs font-medium"
            >
              {isMetadataOpen ? (
                <>Hide Details <Icons.ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Show Details <Icons.ChevronDown className="w-4 h-4" /></>
              )}
            </button>
            <button 
              onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-500 flex items-center gap-1 text-xs font-medium"
              title={isLeftPanelOpen ? "Hide side panel" : "Show side panel"}
            >
              <Icons.Columns className="w-4 h-4" />
              <span>{isLeftPanelOpen ? "Hide Panel" : "Show Panel"}</span>
            </button>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Icons.X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Metadata Banner */}
        {isMetadataOpen && (
          <div className="px-8 py-6 border-b border-gray-100 bg-white animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-8">
              <div className="flex flex-col">
                 <span className={`block text-[10px] uppercase font-bold mb-0.5 ${participant.randomisedId ? 'text-brand-600' : 'text-gray-500'}`}>{displayUid}</span>
                 <span className={`font-bold ${participant.randomisedId ? 'text-base text-brand-900' : 'text-sm text-gray-900'}`}>{displayId}</span>
              </div>
              <div>
                 <span className="block text-xs text-gray-500 mb-1">Site</span>
                 <span className="text-sm text-gray-900">{site?.name || 'Unknown Site'}</span>
              </div>
              <div>
                 <span className="block text-xs text-gray-500 mb-1">Recipient</span>
                 <span className="text-sm text-gray-900 font-medium">{participantType === 'Participant' ? (participant.recipient || 'Participant') : participantType}</span>
              </div>
              <div>
                 <span className="block text-xs text-gray-500 mb-1">Generated</span>
                 <span className="text-sm text-gray-900">{generatedDate}</span>
              </div>
              
              <div className="md:col-span-2">
                 <span className="block text-xs text-gray-500 mb-2">Block used</span>
                 <div className="flex space-x-2">
                   <button className="px-3 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50">Universal consent</button>
                   <button className="px-3 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50">VIC disclaimer</button>
                 </div>
              </div>
              <div>
                 <span className="block text-xs text-gray-500 mb-1">Document version</span>
                 <span className="text-sm text-gray-900">2.1</span>
              </div>
              <div>
                 <span className="block text-xs text-gray-500 mb-1">Protocol version</span>
                 <span className="text-sm text-gray-900">2.1</span>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Panel */}
          <div className={`
            ${isLeftPanelOpen ? 'w-[400px]' : 'w-0'} 
            flex-shrink-0 border-r border-gray-100 overflow-y-auto overflow-x-hidden bg-white transition-all duration-300 ease-in-out relative
          `}>
            <div className={`w-[400px] p-8 transition-opacity duration-300 ${isLeftPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              {isInactive && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start animate-in fade-in slide-in-from-top-2 duration-300">
                  <Icons.Lock className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-red-900 uppercase tracking-tight">Document Locked</p>
                    <p className="text-[11px] text-red-700 mt-1">This document is locked because it is closed.</p>
                  </div>
                </div>
              )}

              {hasExpired && !isReadOnly && (
                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start animate-in fade-in slide-in-from-top-2 duration-300">
                    <Icons.AlertCircle className="w-5 h-5 text-orange-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-xs font-bold text-orange-900 uppercase tracking-tight">Eligibility Expired</p>
                        <p className="text-[11px] text-orange-700 mt-1">Consent cannot be requested until eligibility is reassessed and confirmed.</p>
                    </div>
                </div>
            )}

            {(participantType === 'Guardian' || participantType === 'Minor') && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start animate-in fade-in slide-in-from-top-2 duration-300">
                  <Icons.Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                      <p className="text-xs font-bold text-blue-900 uppercase tracking-tight">Two Documents Required</p>
                      <p className="text-[11px] text-blue-700 mt-1">Because a {participantType.toLowerCase()} is selected, separate documents will be generated for the guardian and the participant.</p>
                  </div>
              </div>
            )}

            {/* Step 1: Document Parameters (Editable or Read-only) */}
            <div className="mb-4 bg-gray-50 rounded-2xl p-6">
              <button 
                onClick={() => setIsDocSettingsOpen(!isDocSettingsOpen)}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-normal text-gray-900">Document Settings</h3>
                  {currentStep > 1 && <Icons.CheckCircle className="w-5 h-5 text-green-500" />}
                </div>
                {isDocSettingsOpen ? <Icons.ChevronUp className="w-5 h-5 text-gray-400" /> : <Icons.ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>
              
              {isDocSettingsOpen && (
                <div className="mt-6 pt-6 border-t border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200">
                  {currentStep === 1 ? (
                    <div className="space-y-6">
                      {/* Domains Section */}
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-tight mb-4">Domains</h4>
                        <div className="space-y-4">
                          {displayDomains.length > 0 ? displayDomains.map((domain, idx) => {
                            const isSelected = selectedDomainIds.includes(domain.id);
                            const isHandled = !needsConsent(domain);
                            const canSelect = !isReadOnly && (!isHandled || domain.consentStatus === 'OBTAINED' || domain.consentStatus === 'DECLINED') && !hasExpired;
                            
                            return (
                              <div 
                                key={domain.id} 
                                className={`flex items-start space-x-3 group select-none ${canSelect ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
                                onClick={() => canSelect && toggleDomain(domain.id, isHandled, domain.consentStatus)}
                              >
                                <div className="mt-0.5 flex-shrink-0">
                                  <div className={`
                                    w-5 h-5 rounded-[4px] flex items-center justify-center border transition-all duration-200
                                    ${isSelected ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-300'}
                                    ${canSelect && !isSelected ? 'group-hover:border-gray-400' : ''}
                                  `}>
                                    {isSelected && <Icons.Check className="w-3.5 h-3.5" strokeWidth={3} />}
                                  </div>
                                </div>
                                <div>
                                  <p className={`font-medium text-sm transition-colors ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {domain.name}
                                  </p>
                                  <p className="text-[10px] text-gray-400 capitalize">{domain.status.replace('_', ' ').toLowerCase()}</p>
                                  
                                  {/* Status indicators for unselectable items */}
                                  {domain.consentStatus === 'OBTAINED' && <p className="text-[10px] text-green-600 font-medium">Already obtained</p>}
                                  {domain.consentStatus === 'SIG_REQUESTED' && <p className="text-[10px] text-blue-600 font-medium">Awaiting consent</p>}
                                  {domain.consentStatus === 'SIG_PENDING' && <p className="text-[10px] text-blue-600 font-medium">In progress</p>}
                                  {domain.consentStatus === 'OBTAINED' && <p className="text-[10px] text-green-600 font-medium">Consented</p>}
                                  {domain.consentStatus === 'WITHDRAWN' && <p className="text-[10px] text-gray-500 font-medium">Withdrawn</p>}
                                  {domain.consentStatus === 'DECLINED' && <p className="text-[10px] text-red-600 font-medium">Declined</p>}
                                </div>
                              </div>
                            );
                          }) : (
                            <div className="text-sm text-gray-500 italic px-2">
                              No ready domains. Please complete assessment.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Consent Mode Section */}
                      {!isReadOnly && !hasExpired && (
                        <div className="pt-6 border-t border-gray-200">
                          
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-gray-700">Printed document</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isAnalogueMode ? 'On' : 'Off'}</span>
                              <button 
                                onClick={() => setIsAnalogueMode(!isAnalogueMode)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isAnalogueMode ? 'bg-brand-600' : 'bg-gray-300'}`}
                              >
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isAnalogueMode ? 'translate-x-5' : 'translate-x-1'}`} />
                              </button>
                            </div>
                          </div>
                          
                          <div className="space-y-4 mb-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight mb-1">Recipient</label>
                              <SearchableDropdown 
                                options={PARTICIPANT_TYPE_OPTIONS}
                                value={participantType}
                                onChange={setParticipantType}
                                placeholder="Select type..."
                                disabled={isReadOnly}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight mb-1">Scenario</label>
                              <SearchableDropdown 
                                options={SCENARIO_OPTIONS}
                                value={scenario}
                                onChange={setScenario}
                                placeholder="Select scenario..."
                                disabled={isReadOnly}
                              />
                            </div>
                          </div>
                          
                          {/* CTA Button to show signature */}
                          <div className="mt-8 pt-6 border-t border-gray-200">
                            {hasExistingConsentForSelection && (
                              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 flex items-start gap-2">
                                <Icons.AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <p>A document already exists for the selected domain(s) with this participant type and scenario.</p>
                              </div>
                            )}
                            {scenario === 'Change in capacity' && (
                              <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 text-sm rounded-lg border border-yellow-100 flex items-start gap-2">
                                <Icons.AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <p>Please ensure that the "Change in capacity" is documented in the participant's notes, referencing DOC-17330.</p>
                              </div>
                            )}
                            <button
                              onClick={() => {
                                console.log('Button clicked');
                                handleNextStep();
                              }}
                              disabled={!isFormValid}
                              className={`w-full py-3 rounded-full font-medium text-sm transition-all shadow-md ${
                                !isFormValid 
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                  : 'active:scale-[0.98] bg-gray-900 text-white hover:bg-gray-800'
                              }`}
                            >
                              Generate Document
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-tight">Domains</h4>
                        <div className="flex flex-col items-end space-y-1">
                          {displayDomains.filter(d => selectedDomainIds.includes(d.id)).map((domain) => (
                            <span key={domain.id} className="text-sm font-medium text-gray-900">{domain.name}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-tight">Signature Mode</h4>
                        <span className="text-sm font-medium text-gray-900">{isAnalogueMode ? 'Printed Doc' : 'Digital'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-tight">Recipient</h4>
                        <span className="text-sm font-medium text-gray-900">{participantType}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-tight">Scenario</h4>
                        <span className="text-sm font-medium text-gray-900">{scenario}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Document Process (Hidden) */}
            {false && (
            <div className={`mb-4 bg-gray-50 rounded-2xl p-6 transition-all duration-300 ${(currentStep < 2 && !isReadOnly) ? 'opacity-50' : 'opacity-100'}`}>
              <button 
                onClick={() => (currentStep >= 2 || isReadOnly) && setIsDocProcessOpen(!isDocProcessOpen)}
                disabled={currentStep < 2 && !isReadOnly}
                className={`w-full flex items-center justify-between group ${(currentStep < 2 && !isReadOnly) ? 'cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-normal text-gray-900">2. Consent Process</h3>
                </div>
                {(currentStep >= 2 || isReadOnly) && (isDocProcessOpen ? <Icons.ChevronUp className="w-5 h-5 text-gray-400" /> : <Icons.ChevronDown className="w-5 h-5 text-gray-400" />)}
              </button>
              
              {(isDocProcessOpen || (isReadOnly && (processDateTime || siteSideSelections.length > 0 || otherTextEntries.length > 0))) && (
                <div className="mt-6 pt-6 border-t border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200">
                  {isReadOnly ? (
                    <div className="space-y-4 mb-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <div>
                        <span className="block text-xs font-bold text-gray-500 uppercase tracking-tight mb-1">Site Staff Present</span>
                        <div className="space-y-1">
                          {siteSideSelections.length > 0 ? siteSideSelections.map((s, i) => (
                            <span key={i} className="block text-sm text-gray-900">{s || '-'}</span>
                          )) : <span className="text-sm text-gray-400 italic">None selected</span>}
                        </div>
                      </div>
                      {otherTextEntries.length > 0 && (
                        <div>
                          <span className="block text-xs font-bold text-gray-500 uppercase tracking-tight mb-1">Other Attendees</span>
                          <div className="space-y-1">
                            {otherTextEntries.map((s, i) => (
                              <span key={i} className="block text-sm text-gray-900">{s.name ? `${s.role} (${s.name})` : s.role || '-'}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Date & Time Presented</span>
                        <span className="text-sm text-gray-900 font-medium">{processDateTime || '-'}</span>
                      </div>
                      {processNote && (
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Process Data</span>
                          <span className="text-sm text-gray-900">{processNote}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    currentStep === 2 && (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight mb-2">Site Staff Present</label>
                          <div className="space-y-2">
                            {siteSideSelections.map((selection, index) => (
                              <div key={index} className="flex gap-2 items-center">
                                <div className="flex-1">
                                  <SearchableDropdown 
                                    options={RC_OPTIONS}
                                    value={selection}
                                    onChange={(val) => {
                                      const newSelections = [...siteSideSelections];
                                      newSelections[index] = val;
                                      setSiteSideSelections(newSelections);
                                    }}
                                    placeholder="Select..."
                                    disabled={isReadOnly}
                                  />
                                </div>
                                {!isReadOnly && (
                                  <button 
                                    onClick={() => setSiteSideSelections(siteSideSelections.filter((_, i) => i !== index))}
                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                    <Icons.X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {!isReadOnly && (
                              <button 
                                onClick={() => setSiteSideSelections([...siteSideSelections, ''])}
                                className="flex items-center gap-2 text-sm text-brand-600 font-medium hover:text-brand-700 transition-colors mt-2"
                              >
                                <Icons.Plus className="w-4 h-4" />
                                Add Site Staff
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight mb-2">Other Attendees</label>
                          <div className="space-y-2">
                            {otherTextEntries.map((entry, index) => (
                              <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                                <div className="flex gap-2 items-center">
                                  <div className="flex-1">
                                    <SearchableDropdown 
                                      options={EXTRA_OPTIONS}
                                      value={entry.role}
                                      onChange={(val) => {
                                        const newEntries = [...otherTextEntries];
                                        newEntries[index] = { ...newEntries[index], role: val };
                                        setOtherTextEntries(newEntries);
                                      }}
                                      placeholder="Select role..."
                                      disabled={isReadOnly}
                                    />
                                  </div>
                                  {!isReadOnly && (
                                    <button 
                                      onClick={() => setOtherTextEntries(otherTextEntries.filter((_, i) => i !== index))}
                                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                      <Icons.X className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                                {entry.role && entry.role !== 'Participant' && (
                                  <div className="animate-in slide-in-from-top-1 duration-200">
                                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Name</label>
                                    {entry.role === 'Staff' ? (
                                      <SearchableDropdown 
                                        options={RC_OPTIONS}
                                        value={entry.name}
                                        onChange={(val) => {
                                          const newEntries = [...otherTextEntries];
                                          newEntries[index] = { ...newEntries[index], name: val };
                                          setOtherTextEntries(newEntries);
                                        }}
                                        placeholder="Select staff..."
                                        disabled={isReadOnly}
                                      />
                                    ) : (
                                      <input 
                                        type="text"
                                        value={entry.name}
                                        onChange={(e) => {
                                          const newEntries = [...otherTextEntries];
                                          newEntries[index] = { ...newEntries[index], name: e.target.value };
                                          setOtherTextEntries(newEntries);
                                        }}
                                        placeholder="Enter name..."
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                                        readOnly={isReadOnly}
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                            {!isReadOnly && (
                              <button 
                                onClick={() => setOtherTextEntries([...otherTextEntries, { role: '', name: '' }])}
                                className="flex items-center gap-2 text-sm text-brand-600 font-medium hover:text-brand-700 transition-colors mt-2"
                              >
                                <Icons.Plus className="w-4 h-4" />
                                Add Other Attendees
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Date & Time Presented</label>
                            <input 
                              type="datetime-local"
                              value={processDateTime}
                              onChange={(e) => setProcessDateTime(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                              readOnly={isReadOnly}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Process Data</label>
                            <textarea
                              value={processNote}
                              onChange={(e) => setProcessNote(e.target.value)}
                              placeholder="Add notes about the consent process..."
                              rows={3}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white resize-none"
                              readOnly={isReadOnly}
                            />
                          </div>
                        </div>


                        {!isReadOnly && (
                          <div className="pt-6 border-t border-gray-200">
                            <button 
                              onClick={() => {
                                const allFieldsFilled = processDateTime !== '' && siteSideSelections.length > 0 && siteSideSelections.every(s => s.trim() !== '');
                                const newStatus = (allFieldsFilled ? 'SIG_PENDING' : (status || 'PENDING_CONSENT')) as any;
                                
                                if (allFieldsFilled && onStatusChange) {
                                  onStatusChange('SIG_PENDING');
                                }
                                
                                // Persist changes
                                onRequestSignature(
                                  selectedDomainIds, 
                                  rcName, 
                                  analogueSignatureStatus, 
                                  cleanExtraNameArray.length > 0 ? cleanExtraNameArray : undefined, 
                                  isAnalogueMode, 
                                  scenario, 
                                  participantType, 
                                  newStatus,
                                  processDateTime,
                                  siteSideSelections,
                                  otherTextEntries,
                                  processNote,
                                  outcomeNote
                                );
                                
                              }}
                              className="w-full py-2.5 rounded-full text-sm font-medium transition-all flex items-center justify-center bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              <Icons.Save className="w-4 h-4 mr-2" />
                              Save changes
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
            )}

            {/* Step 3: Outcome (Hidden) */}
            {false && (
            <div className={`mb-4 bg-gray-50 rounded-2xl p-6 transition-all duration-300 ${(currentStep < 2 && !isReadOnly) ? 'opacity-50' : 'opacity-100'}`}>
              <button 
                onClick={() => (currentStep >= 2 || isReadOnly) && setIsOutcomeOpen(!isOutcomeOpen)}
                disabled={currentStep < 2 && !isReadOnly}
                className={`w-full flex items-center justify-between group ${(currentStep < 2 && !isReadOnly) ? 'cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-normal text-gray-900">3. Outcome</h3>
                </div>
                {(currentStep >= 2 || isReadOnly) && (isOutcomeOpen ? <Icons.ChevronUp className="w-5 h-5 text-gray-400" /> : <Icons.ChevronDown className="w-5 h-5 text-gray-400" />)}
              </button>
              
              {(isOutcomeOpen || (isReadOnly && (domainsToIncludeInDoc.length > 0 || analogueSignatureStatus.investigatorDateTime))) && (
                <div className="mt-6 pt-6 border-t border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Domain Verification */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-tight">Participant Consented</h4>
                      {!isReadOnly && (
                        <button 
                          onClick={handleConsentAll}
                          className="text-xs font-bold text-brand-600 hover:text-brand-700 uppercase"
                        >
                          Yes to All
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {domainsToIncludeInDoc.map(domain => {
                        const isConsented = domain.consentStatus === 'OBTAINED';
                        return (
                          <div key={domain.id} className="flex items-center justify-between gap-4 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex-1">
                              <span className="block text-sm font-medium text-gray-900">
                                {domain.name}
                              </span>
                              <span className={`block text-[10px] mt-0.5 ${isConsented ? 'text-green-600' : 'text-red-600'}`}>
                                {isConsented ? 'Consent verified' : 'Consent denied'}
                              </span>
                            </div>
                            <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                              <button 
                                onClick={() => !isReadOnly && onDomainConsentChange?.(domain.id, true)}
                                disabled={isReadOnly}
                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${isConsented ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                              >
                                Y
                              </button>
                              <button 
                                onClick={() => !isReadOnly && onDomainConsentChange?.(domain.id, false)}
                                disabled={isReadOnly}
                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${!isConsented ? 'bg-white text-gray-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                              >
                                N
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Signature Section */}
                  <div className="mb-8 pt-6 border-t border-gray-200">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-tight mb-4">Signature</h4>
                    
                    {(participantType === 'Guardian' || participantType === 'Minor') && (
                      <div className="flex space-x-1 bg-gray-200/50 p-1 rounded-lg mb-6">
                        <button
                          onClick={() => setActiveTab('guardian')}
                          className={`flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-all ${
                            activeTab === 'guardian'
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                          }`}
                        >
                          Guardian Doc
                        </button>
                        <button
                          onClick={() => setActiveTab('participant')}
                          className={`flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-all ${
                            activeTab === 'participant'
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                          }`}
                        >
                          Participant Doc
                        </button>
                      </div>
                    )}
                    
                    <div className="mb-6">
                      {isReadOnly && (
                        <div className="space-y-4 mb-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Signature Status</span>
                            <span className={`text-sm font-medium ${
                              status === 'OBTAINED' ? 'text-green-600' : 
                              status === 'DECLINED' || status === 'WITHDRAWN' ? 'text-red-600' : 
                              'text-blue-600'
                            }`}>
                              {status === 'OBTAINED' ? (isAnalogueMode ? 'Received' : 'Signed') : 
                               status === 'OBTAINED' ? 'Verified' :
                               status === 'SIG_REQUESTED' ? 'Awaiting' :
                               status === 'SIG_PENDING' ? 'Presented' :
                               status === 'PENDING_CONSENT' ? 'Not started' :
                               status?.replace('_', ' ') || (isAnalogueMode ? 'Not received' : 'Not signed')}
                            </span>
                          </div>
                          {isAnalogueMode && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Date & Time</span>
                              <span className="text-sm font-medium text-gray-900">{analogueSignatureStatus.investigatorDateTime || '-'}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Site Staff Signatory</span>
                            <span className="text-sm font-medium text-gray-900">{rcName || '-'}</span>
                          </div>
                          {cleanExtraNameArray.length > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Other Attendees (optional)</span>
                              <span className="text-sm font-medium text-gray-900">{cleanExtraNameArray.map(n => n.name ? `${n.role} (${n.name})` : n.role).join(', ')}</span>
                            </div>
                          )}
                          {outcomeNote && (
                            <div>
                              <span className="block text-xs font-bold text-gray-500 uppercase tracking-tight mb-1">Outcome Note</span>
                              <span className="text-sm text-gray-900">{outcomeNote}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {!isReadOnly && (
                        <div className="space-y-4 mb-4">
                          {isAnalogueMode && (
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Date & Time</label>
                              <input 
                                type="datetime-local"
                                value={analogueSignatureStatus.investigatorDateTime}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAnalogueSignatureStatus(prev => ({
                                    ...prev,
                                    investigatorDateTime: val,
                                    participantDateTime: val,
                                    extraDateTime: val,
                                    investigator: val !== '',
                                    participant: val !== '',
                                    extra: val !== ''
                                  }));
                                }}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Site Staff Signatory</label>
                            <SearchableDropdown 
                              options={RC_OPTIONS}
                              value={rcName}
                              onChange={setRcName}
                              placeholder="Select..."
                            />
                          </div>
                          
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Other Attendees (optional)</label>
                            <div className="space-y-2">
                              {extraName.map((entry, index) => (
                                <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                                  <div className="flex gap-2 items-center">
                                    <div className="flex-1">
                                      <SearchableDropdown 
                                        options={EXTRA_OPTIONS}
                                        value={entry.role}
                                        onChange={(val) => {
                                          const newEntries = [...extraName];
                                          newEntries[index] = { ...newEntries[index], role: val };
                                          setExtraName(newEntries);
                                        }}
                                        placeholder="Select role..."
                                      />
                                    </div>
                                    <button 
                                      onClick={() => {
                                        const newEntries = [...extraName];
                                        newEntries.splice(index, 1);
                                        setExtraName(newEntries);
                                      }}
                                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                      <Icons.X className="w-4 h-4" />
                                    </button>
                                  </div>
                                  {entry.role && entry.role !== 'Participant' && (
                                    <div className="animate-in slide-in-from-top-1 duration-200">
                                      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Name</label>
                                      {entry.role === 'Staff' ? (
                                        <SearchableDropdown 
                                          options={RC_OPTIONS}
                                          value={entry.name}
                                          onChange={(val) => {
                                            const newEntries = [...extraName];
                                            newEntries[index] = { ...newEntries[index], name: val };
                                            setExtraName(newEntries);
                                          }}
                                          placeholder="Select staff..."
                                        />
                                      ) : (
                                        <input 
                                          type="text"
                                          value={entry.name}
                                          onChange={(e) => {
                                            const newEntries = [...extraName];
                                            newEntries[index] = { ...newEntries[index], name: e.target.value };
                                            setExtraName(newEntries);
                                          }}
                                          placeholder="Enter name..."
                                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                                        />
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                              <button 
                                onClick={() => {
                                  const newEntries = [...extraName];
                                  newEntries.push({ role: '', name: '' });
                                  setExtraName(newEntries);
                                }}
                                className="flex items-center gap-2 text-sm text-brand-600 font-medium hover:text-brand-700 transition-colors mt-2"
                              >
                                <Icons.Plus className="w-4 h-4" />
                                Add Other Attendees
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Outcome Note</label>
                            <textarea
                              value={outcomeNote}
                              onChange={(e) => setOutcomeNote(e.target.value)}
                              placeholder="Add notes about the consent outcome..."
                              rows={3}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white resize-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>


                  {!isReadOnly && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <button 
                        onClick={() => {
                          // Persist changes without changing status
                          onRequestSignature(
                            selectedDomainIds, 
                            rcName, 
                            analogueSignatureStatus, 
                            cleanExtraNameArray.length > 0 ? cleanExtraNameArray : undefined, 
                            isAnalogueMode, 
                            scenario, 
                            participantType, 
                            status as any,
                            processDateTime,
                            siteSideSelections,
                            otherTextEntries,
                            processNote,
                            outcomeNote
                          );
                        }}
                        className="w-full py-2.5 rounded-full text-sm font-medium transition-all flex items-center justify-center bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        <Icons.Save className="w-4 h-4 mr-2" />
                        Save changes
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            )}

            {/* Confirm Button outside cards (Hidden) */}
            {!isReadOnly && currentStep >= 2 && false && (
              <div className="mt-8 mb-4">
                <p className="text-xs text-gray-400 mb-4 text-center">Last updated on {generatedDate}</p>
                <button 
                  onClick={isAnalogueMode ? handleConfirmAnalogue : handleRequestSignature}
                  disabled={isSubmitDisabled}
                  className={`w-full py-3 rounded-full font-medium text-sm shadow-sm transition-colors flex items-center justify-center
                    ${isSubmitDisabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed border-gray-200' : 'bg-brand-600 text-white hover:bg-brand-700'}
                  `}
                >
                  {isAnalogueMode ? 'Confirm' : 'Request signature'}
                  <Icons.CheckCircle className="w-4 h-4 ml-2" />
                </button>
              </div>
            )}

            {/* Add Details CTA - Only when viewing a specific version (finalized or draft) */}
            {(viewingVersion || draftDocumentId) && currentStep !== 1 && (
              <div className="px-6 mb-4">
                <button
                  onClick={() => {
                    setNoteModalTab(isActiveEpisode ? 'process' : 'view');
                    setIsNoteModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm animate-in fade-in slide-in-from-top-2 duration-300"
                >
                  {isActiveEpisode ? (
                    <>
                      <Icons.Plus className="w-4 h-4 text-brand-600" />
                      Update episode
                    </>
                  ) : (
                    <>
                      <Icons.Eye className="w-4 h-4 text-gray-400" />
                      See details
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 flex flex-col min-w-0 bg-gray-100">
            <div className="px-8 pt-6 pb-4 flex justify-between items-center bg-gray-100">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-normal text-gray-900">Preview</h3>
                {(participantType === 'Guardian' || participantType === 'Minor') && (
                  <div className="flex space-x-1 bg-gray-200/50 p-1 rounded-lg">
                    <button
                      onClick={() => setActiveTab('guardian')}
                      className={`py-1.5 px-3 text-sm font-medium rounded-md transition-all ${
                        activeTab === 'guardian'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                      }`}
                    >
                      Guardian Doc
                    </button>
                    <button
                      onClick={() => setActiveTab('participant')}
                      className={`py-1.5 px-3 text-sm font-medium rounded-md transition-all ${
                        activeTab === 'participant'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                      }`}
                    >
                      Participant Doc
                    </button>
                  </div>
                )}
              </div>
              <button className="flex items-center text-sm text-gray-900 hover:text-gray-600 font-medium bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm transition-all hover:shadow">
                <span className="mr-2">Print</span>
                <Icons.Printer className="w-4 h-4" /> 
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
               {/* Realistic Document */}
               <div className="bg-white shadow-xl mx-auto max-w-[800px] min-h-[1000px] p-12 md:p-16 text-gray-900 font-serif leading-relaxed relative">
                 {/* Page Header */}
                 <div className="flex justify-between items-end border-b-2 border-gray-900 pb-6 mb-10">
                   <div>
                     <div className="w-12 h-12 rounded-full border-2 border-gray-900 flex items-center justify-center text-gray-900 font-bold text-xl mb-4">
                        <span className="relative top-[1px]">In</span>
                      </div>
                      <h1 className="text-2xl font-bold uppercase tracking-wider text-gray-900">
                        {activeTab === 'guardian' ? 'Guardian Consent Form' : 'Informed Consent Form'}
                      </h1>
                   </div>
                   <div className="text-right text-xs text-gray-500 font-sans">
                     <p>Form Version 2.1</p>
                     <p>Page 1 of 3</p>
                   </div>
                 </div>

                 {/* Content Body */}
                 <div className="space-y-8 text-[15px]">
                   <section className="bg-gray-50 p-4 border border-gray-100 rounded font-sans text-sm">
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <span className="block text-gray-500 text-xs uppercase tracking-wide">Participant ID</span>
                         <span className="font-mono font-bold">{participantFullId}</span>
                       </div>
                       <div>
                         <span className="block text-gray-500 text-xs uppercase tracking-wide">Date</span>
                         <span>{longDate}</span>
                       </div>
                       <div>
                         <span className="block text-gray-500 text-xs uppercase tracking-wide">Principal Investigator</span>
                         <span>Dr. Sarah Chan</span>
                       </div>
                       <div>
                         <span className="block text-gray-500 text-xs uppercase tracking-wide">Recipient</span>
                         <span>
                           {activeTab === 'guardian' 
                             ? (participantType === 'Guardian' ? 'Guardian' : 'Legal Representative')
                             : 'Participant'}
                         </span>
                       </div>
                       <div>
                         <span className="block text-gray-500 text-xs uppercase tracking-wide">Scenario</span>
                         <span>{scenario}</span>
                       </div>
                     </div>
                   </section>

                   <section>
                     <h2 className="font-bold text-lg text-gray-900 mb-3 font-sans uppercase tracking-wide border-b border-gray-200 pb-1">1. Introduction</h2>
                     <p className="text-gray-700">
                       {activeTab === 'guardian' 
                         ? "You are being invited to provide consent on behalf of the participant to take part in the INCEPT Clinical Platform Trial. This document explains the purpose, risks, and benefits of the study. Please read it carefully before deciding whether to provide consent. Participation is voluntary, and you may withdraw the participant at any time without penalty."
                         : "You are being invited to take part in the INCEPT Clinical Platform Trial. This document explains the purpose, risks, and benefits of the study. Please read it carefully before deciding whether to participate. Participation is voluntary, and you may withdraw at any time without penalty."}
                     </p>
                   </section>

                   <section>
                     <h2 className="font-bold text-lg text-gray-900 mb-3 font-sans uppercase tracking-wide border-b border-gray-200 pb-1">2. Eligible Interventions</h2>
                     <p className="text-gray-700 mb-4">
                       {activeTab === 'guardian'
                         ? "Based on the screening results, the participant is eligible for the following treatment domains. If you consent, they may be randomized to one of the interventions within these domains:"
                         : "Based on your screening results, you are eligible for the following treatment domains. If you consent, you may be randomized to one of the interventions within these domains:"}
                     </p>
                     
                     <div className="bg-blue-50 border-l-4 border-brand-600 p-5 rounded-r-lg">
                       <h3 className="text-brand-800 font-bold font-sans text-sm uppercase mb-3 tracking-wide">Qualified Domains</h3>
                       {domainsToIncludeInDoc.length > 0 ? (
                         <ul className="space-y-3">
                           {domainsToIncludeInDoc.map((domain) => (
                             <li key={domain.id} className="flex items-start">
                               <Icons.CheckCircle className="w-5 h-5 text-brand-600 mt-0.5 mr-2 flex-shrink-0" />
                               <span className="font-medium text-gray-900">{domain.name}</span>
                             </li>
                           ))}
                         </ul>
                       ) : (
                         <p className="text-gray-500 italic">No new domains selected for this consent form.</p>
                       )}
                     </div>
                   </section>

                   <section>
                     <h2 className="font-bold text-lg text-gray-900 mb-3 font-sans uppercase tracking-wide border-b border-gray-200 pb-1">3. Study Procedures</h2>
                     <p className="text-gray-700">
                       {activeTab === 'guardian'
                         ? "If you agree for the participant to join the study, data regarding their medical history, vitals, and treatment response will be collected. This information will be de-identified and used solely for research purposes."
                         : "If you agree to join the study, data regarding your medical history, vitals, and treatment response will be collected. This information will be de-identified and used solely for research purposes."}
                     </p>
                   </section>

                    <section>
                     <h2 className="font-bold text-lg text-gray-900 mb-3 font-sans uppercase tracking-wide border-b border-gray-200 pb-1">4. Authorization</h2>
                     <p className="text-gray-700">
                       {activeTab === 'guardian'
                         ? "By signing below, I confirm that I have read and understood this information sheet, have had the opportunity to ask questions, and voluntarily agree to provide consent for the participant."
                         : "By signing below, I confirm that I have read and understood this information sheet, have had the opportunity to ask questions, and voluntarily agree to participate."}
                     </p>
                   </section>

                   {/* Signature Blocks */}
                   <div className="pt-12 mt-12 border-t-2 border-gray-100 break-inside-avoid">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12">
                        {/* Participant */}
                        <div>
                          <div className="h-24 border-b border-gray-900 mb-2 relative flex items-end">
                            {isReadOnly ? (
                                <span className="font-signature text-2xl text-blue-900 italic font-bold">Electronically Signed</span>
                            ) : (
                                <span className="absolute bottom-1 right-0 text-gray-400 text-xs font-sans pointer-events-none opacity-50">Sign here</span>
                            )}
                          </div>
                          <label className="block text-xs uppercase font-bold font-sans text-gray-500">
                            {activeTab === 'guardian' ? 'Guardian Signature' : 'Participant Signature'}
                          </label>
                        </div>
                        <div>
                           <div className="h-24 border-b border-gray-900 mb-2 flex items-end pb-1">
                             <span className="font-mono text-lg">{generatedDate.replace(/\./g, ' / ')}</span>
                           </div>
                           <label className="block text-xs uppercase font-bold font-sans text-gray-500">Date</label>
                        </div>

                         {/* Investigator */}
                        <div>
                          <div className="h-24 border-b border-gray-900 mb-2 relative flex items-end">
                            {isReadOnly && (
                                <span className="font-signature text-2xl text-blue-900 italic font-bold">Dr. Sarah Chan</span>
                            )}
                          </div>
                          <label className="block text-xs uppercase font-bold font-sans text-gray-500">Investigator Signature</label>
                        </div>
                        <div>
                           <div className="h-24 border-b border-gray-900 mb-2 flex items-end pb-1">
                             {isReadOnly && <span className="font-mono text-lg">{generatedDate.replace(/\./g, ' / ')}</span>}
                           </div>
                           <label className="block text-xs uppercase font-bold font-sans text-gray-500">Date</label>
                        </div>
                      </div>
                   </div>
                 </div>
                 
                 {/* Footer of the page */}
                 <div className="absolute bottom-6 left-12 right-12 text-center">
                    <p className="text-[10px] text-gray-400 font-sans uppercase tracking-widest">INCEPT Clinical Platform • Confidential • Do Not Distribute</p>
                 </div>
               </div>
               
               {/* Spacer for scroll */}
               <div className="h-12"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Note Modal for Consent Details */}
      {(viewingVersion || draftDocumentId) && (
        <NoteModal
          isOpen={isNoteModalOpen}
          onClose={() => setIsNoteModalOpen(false)}
          onSave={(content, type, data) => {
            // In a real app, this would update the backend
            console.log('Saving note from RequestConsentModal:', { content, type, data });
            setIsNoteModalOpen(false);
          }}
          notes={participant.notes}
          episode={(() => {
            const record = consentRecords.find(r => r.version === (viewingVersion || draftDocumentId));
            if (!record) return null;
            
            // Map domainIds to actual domain objects from the props
            const recordDomains = domains.filter(d => record.domainIds.includes(d.id));
            
            return {
              id: viewingVersion || draftDocumentId,
              rows: [{
                ...record,
                domains: recordDomains
              }]
            };
          })()}
          consentRecipient={participantType}
          readOnly={!isActiveEpisode}
          initialTab={noteModalTab}
        />
      )}
    </div>
  );
};

export default RequestConsentModal;