import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import EligibilityForm from './EligibilityForm';
import EligibilitySummary from './EligibilitySummary';
import { EligibilityDomain, EligibilityStatus, ParticipantAlert, DomainState, EligibilityRecord } from '../types';

interface EligibilityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (record: Partial<EligibilityRecord>) => void;
  domains: EligibilityDomain[];
  domainData?: Record<string, DomainState>;
  initialValues?: Record<string, any>;
  previousValues?: Record<string, any>;
  alerts?: ParticipantAlert[];
  visibleDomains: string[];
  readOnly?: boolean;
  initialNote?: string;
  showNewDomain?: boolean;
}

const EligibilityFormModal: React.FC<EligibilityFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  domains,
  domainData,
  initialValues,
  previousValues,
  alerts = [],
  visibleDomains,
  readOnly = false,
  initialNote = '',
  showNewDomain = false
}) => {
  const [currentStatusMap, setCurrentStatusMap] = useState<Record<string, { status: EligibilityStatus; stateDetails?: string; strataDetails?: string }>>({});
  const [currentValues, setCurrentValues] = useState<Record<string, any>>({});
  const [note, setNote] = useState(initialNote);

  useEffect(() => {
    if (isOpen) {
      setNote(initialNote);
    }
  }, [isOpen, initialNote]);

  if (!isOpen) return null;

  const handleStatusUpdate = (statusMap: Record<string, { status: EligibilityStatus; stateDetails?: string; strataDetails?: string }>) => {
    setCurrentStatusMap(statusMap);
  };

  const handleValuesUpdate = (values: Record<string, any>) => {
    setCurrentValues(values);
  };

  const handleSubmit = () => {
    // Create the record
    const domainIds = Object.keys(currentStatusMap).filter(id => id !== 'platform');
    const domainStatuses: Record<string, EligibilityStatus> = {};
    domainIds.forEach(id => {
      domainStatuses[id] = currentStatusMap[id].status;
    });

    const platformStatus = currentStatusMap['platform']?.status || 'NOT_ASSESSED';
    const stateDetails = currentStatusMap['platform']?.stateDetails || '';

    let assessmentStatus: EligibilityStatus = platformStatus;

    if (platformStatus === 'ELIGIBLE') {
      const statuses = domainIds.map(id => domainStatuses[id]);
      const allNotEligible = statuses.every(s => s === 'NOT_ELIGIBLE');
      const allInProgress = statuses.every(s => s === 'IN_PROGRESS');
      const atLeastOneEligible = statuses.some(s => s === 'ELIGIBLE');
      const atLeastOneNotAssessed = statuses.some(s => s === 'NOT_ASSESSED' || s === 'IN_PROGRESS');
      const noneNotAssessed = !atLeastOneNotAssessed;

      if (statuses.length > 0) {
        if (allNotEligible) {
          assessmentStatus = 'NOT_ELIGIBLE';
        } else if (allInProgress) {
          assessmentStatus = 'IN_PROGRESS';
        } else if (atLeastOneEligible && atLeastOneNotAssessed) {
          assessmentStatus = 'NOT_COMPLETED';
        } else if (atLeastOneEligible && noneNotAssessed) {
          assessmentStatus = 'COMPLETED';
        } else if (!atLeastOneEligible) {
          // Mixed state without any eligible domains (e.g., some NOT_ELIGIBLE, some IN_PROGRESS)
          assessmentStatus = 'IN_PROGRESS';
        }
      }
    }

    const record: Partial<EligibilityRecord> = {
      timestamp: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.') + ' ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase(),
      status: assessmentStatus,
      stateDetails: stateDetails,
      domainIds: domainIds,
      domainStatuses: domainStatuses,
      formValues: currentValues,
      note: note,
      isActive: true
    };

    onSubmit(record);
    onClose();
  };

  // Prepare domains for summary based on current status map
  const summaryDomains = domains.map(d => ({
    ...d,
    status: currentStatusMap[d.id]?.status || d.status
  }));

  const platformStatus = currentStatusMap['platform']?.status;
  const platformStateDetails = currentStatusMap['platform']?.stateDetails;
  const platformStrataDetails = currentStatusMap['platform']?.strataDetails;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-serif text-gray-900">{readOnly ? 'View Assessment' : 'Eligibility Assessment'}</h2>
            <p className="text-sm text-gray-500 mt-1">{readOnly ? 'Reviewing historical assessment data.' : 'Complete the form below to determine trial eligibility.'}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          >
            <Icons.X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Main Form Area */}
          <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
            <div className="max-w-3xl mx-auto">
              <EligibilityForm 
                onStatusUpdate={handleStatusUpdate}
                onValuesUpdate={handleValuesUpdate}
                domainData={domainData}
                initialValues={initialValues}
                previousValues={previousValues}
                showNewDomain={showNewDomain}
                alerts={alerts}
                visibleDomains={visibleDomains}
                canEdit={!readOnly}
              />
            </div>
          </div>

          {/* Side Panel */}
          <div className="w-80 bg-gray-50 border-l border-gray-100 overflow-y-auto px-6 py-8 custom-scrollbar">
            <div>
              <EligibilitySummary 
                domains={summaryDomains}
                onSelectDomain={() => {}} // No-op in modal
                onToggleDomain={() => {}} // No-op in modal
                platformStatus={platformStatus}
                platformStateDetails={platformStateDetails}
                platformStrataDetails={platformStrataDetails}
                alerts={alerts}
                showNewDomain={showNewDomain}
              />
            </div>
            
            <div className="mt-8">
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Assessment Note (Optional)</label>
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                readOnly={readOnly}
                placeholder={readOnly ? "No note provided." : "Add notes..."}
                className={`w-full h-24 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all resize-none placeholder:text-gray-400 ${readOnly ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
              />
            </div>

            {!readOnly && (
              <div className="mt-8 space-y-4">
                <button 
                  onClick={handleSubmit}
                  disabled={!platformStatus || platformStatus === 'NOT_ASSESSED'}
                  className="w-full py-4 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-200 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Icons.CheckCircle className="w-5 h-5" />
                  Submit Assessment
                </button>
                
                <button 
                  onClick={onClose}
                  className="w-full py-3 bg-white text-gray-600 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EligibilityFormModal;
