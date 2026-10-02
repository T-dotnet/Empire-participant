import React from 'react';
import { Icons } from './Icons';
import { EligibilityDomain, ConsentRecord, STATE_DOMAIN_MAPPING } from '../types';

interface ParticipantHeaderProps {
  participantId: string;
  participantUid: string;
  randomisedId?: string;
  status: string;
  domains?: EligibilityDomain[];
  consentRecords?: ConsentRecord[];
  activeTab?: string;
  onContinue?: () => void;
  onRevokeConsent?: () => void;
  onRandomise?: () => void;
  onRequestConsent?: () => void;
  onBack?: () => void;
  expiryDate?: string;
  onShowDetails?: () => void;
  assessmentPushed?: boolean;
  platformStateDetails?: string;
  onAssessEligibility?: () => void;
  isLocked?: boolean;
}

const ParticipantHeader: React.FC<ParticipantHeaderProps> = ({ 
  participantId,
  participantUid,
  randomisedId,
  status,
  domains = [], 
  consentRecords = [],
  activeTab = 'eligibility',
  onContinue,
  onRevokeConsent,
  onRandomise,
  onRequestConsent,
  onBack,
  onShowDetails,
  assessmentPushed = false,
  platformStateDetails,
  onAssessEligibility,
  isLocked = false
}) => {
  
  // Logic to determine if we can proceed/unlock
  const allDomainsAssessed = domains.length > 0 && domains.every(d => 
    d.status === 'ELIGIBLE' || d.status === 'NOT_ELIGIBLE'
  );

  // REQUIREMENT: If all domains are NOT_ELIGIBLE, the button should be disabled.
  // But we want to allow proceeding if there are domains IN_PROGRESS too.
  const actionableDomains = domains.filter(d => 
      (d.status === 'ELIGIBLE' || d.status === 'IN_PROGRESS') && 
      d.consentStatus !== 'OBTAINED' && 
      d.consentStatus !== 'WITHDRAWN' && 
      // d.consentStatus !== 'DECLINED' && // Allow re-consenting for declined domains
      d.randomisationStatus !== 'RANDOMISED' &&
      d.randomisationStatus !== 'RANDOMISATION_REQUESTED'
  );

  // canContinue strictly requires at least one domain to be eligible or in progress and not yet consented.
  const canContinue = assessmentPushed || actionableDomains.length > 0;

  // Logic to show/hide specific buttons
  const showWithdraw = (activeTab === 'consent' || activeTab === 'randomisation') && (
    domains.some(d => 
      (d.status === 'ELIGIBLE' || d.status === 'IN_PROGRESS') && 
      (d.consentStatus === 'OBTAINED') &&
      consentRecords.some(r => r.isActive !== false && r.domainIds.includes(d.id) && (r.status === 'OBTAINED'))
    ) ||
    domains.some(d => d.consentStatus === 'WITHDRAWN')
  );
  
  
  // User request: "Randomise" button appears for the domains that were successfully signed (obtained). This is the same logic of revoke
  // User request: "If domain is in progress do not show randomise CTA" - REVERTED: Now allowing randomisation for in-progress domains
  const showRandomise = (activeTab === 'consent' || activeTab === 'randomisation') && domains.some(d => {
    const currentState = platformStateDetails?.split(',')[0].trim() || 'Unknown';
    const associatedDomainIds = STATE_DOMAIN_MAPPING[currentState] || [];
    
    return (d.status === 'ELIGIBLE' || d.status === 'IN_PROGRESS') && 
      associatedDomainIds.includes(d.id) &&
      (d.consentStatus === 'OBTAINED') &&
      d.randomisationStatus !== 'RANDOMISED' &&
      consentRecords.some(r => r.isActive !== false && r.domainIds.includes(d.id) && (r.status === 'OBTAINED'));
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In progress': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Assessment completed': return 'bg-brand-50 text-brand-700 border-brand-200';
      case 'Not started': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Eligible to randomise': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Consented': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Randomised': return 'bg-green-50 text-green-700 border-green-200';
      case 'Not eligible': return 'bg-red-50 text-red-700 border-red-200';
      case 'Consent declined': return 'bg-red-50 text-red-700 border-red-200';
      case 'Withdrawn': return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'New': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'Expired': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const displayUid = randomisedId ? participantUid.replace('SCR', 'PAR') : participantUid;
  const displayId = randomisedId || participantId;

  const handleCopyId = () => {
    navigator.clipboard.writeText(`${displayUid}-${displayId}`);
  };

  return (
    <div className="pt-8 pb-4">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button 
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-900 flex items-center mb-6 transition-colors focus:outline-none"
          >
            <span className="mr-2">←</span> Back to participant list
          </button>
          
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="flex flex-col mb-3">
                <span className={`text-sm font-semibold uppercase tracking-widest mb-1 ${randomisedId ? 'text-brand-600' : 'text-gray-500'}`}>{displayUid}</span>
                <div className="flex items-center gap-3">
                  <h1 className={`font-bold font-sans tracking-tight ${randomisedId ? 'text-5xl text-brand-900' : 'text-4xl text-gray-900'}`}>
                    {displayId}
                  </h1>
                  <button 
                    onClick={handleCopyId}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                    title="Copy ID"
                  >
                    <Icons.Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span>Last update 25.09.2025 14:30</span>
                <span className="text-gray-300">•</span>
                <button 
                  onClick={onShowDetails}
                  className="flex items-center hover:text-gray-900 transition-colors group"
                >
                  Participant details
                  <Icons.ExternalLink className="w-3.5 h-3.5 ml-1.5 text-gray-400 group-hover:text-gray-600" />
                </button>


                
                <span className={`ml-2 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider border ${getStatusColor(status)}`}>
                    {status}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {activeTab === 'eligibility' && (
                <>
                  <button 
                    onClick={onAssessEligibility}
                    className="px-8 py-3 rounded-full font-medium text-sm shadow-sm transition-all duration-300 flex items-center bg-white border border-brand-600 text-brand-600 hover:bg-brand-50 hover:shadow-md"
                  >
                    <Icons.Plus className="w-4 h-4 mr-2" />
                    New Assessment
                  </button>
                  <button 
                    onClick={onContinue}
                    disabled={!canContinue}
                    className={`px-8 py-3 rounded-full font-medium text-sm shadow-sm transition-all duration-300 flex items-center
                      ${!canContinue ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-brand-600 text-white hover:bg-brand-700 hover:shadow-md'}
                    `}
                  >
                    {assessmentPushed ? 'Return to consent' : 'Continue to consent'}
                    <Icons.ChevronRight className="w-4 h-4 ml-2" />
                  </button>
                </>
              )}

              {showWithdraw && (
                <button 
                  onClick={onRevokeConsent}
                  className="text-brand-600 hover:text-brand-700 font-medium text-sm underline transition-all flex items-center mr-6"
                >
                  Manage consent
                  <Icons.ChevronRight className="w-4 h-4 ml-1" />
                </button>
              )}

              {showRandomise && (
                <button 
                  onClick={() => onRandomise?.()}
                  className="px-8 py-3 rounded-full font-medium text-sm shadow-sm transition-all flex items-center animate-in zoom-in-95 duration-300 bg-brand-600 text-white hover:bg-brand-700 hover:shadow-md"
                >
                  Randomise
                  <Icons.Shuffle className="w-4 h-4 ml-2" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantHeader;