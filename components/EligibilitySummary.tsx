import React, { useState } from 'react';
import { Icons } from './Icons';
import { EligibilityDomain, EligibilityStatus, ParticipantAlert } from '../types';

interface EligibilitySummaryProps {
  domains: EligibilityDomain[];
  onToggleDomain: (id: string) => void;
  onSelectDomain: (id: string) => void;
  activeDomainId?: string;
  alerts?: ParticipantAlert[];
  platformStatus?: EligibilityStatus;
  platformStateDetails?: string;
  platformStrataDetails?: string;
  showNewDomain?: boolean;
}

const EligibilitySummary: React.FC<EligibilitySummaryProps> = ({ 
  domains, 
  onSelectDomain, 
  activeDomainId, 
  alerts = [], 
  platformStatus, 
  platformStateDetails,
  platformStrataDetails,
  showNewDomain = false
}) => {
  // Track which state groups are expanded. Default all to expanded.
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: true
  });

  const toggleGroup = (index: number) => {
    setExpandedGroups(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };
  
  const getStatusLabelStyles = (domain: EligibilityDomain, alertLevel?: string) => {
    if (alertLevel === 'warning') {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    
    // If randomised, it's final
    if (domain.randomisationStatus === 'RANDOMISED') {
      return 'bg-green-50 text-green-700 border-green-200';
    }

    if (domain.consentStatus === 'OBTAINED') {
      return 'bg-green-50 text-green-700 border-green-200';
    }
    
    switch (domain.status) {
      case 'ELIGIBLE':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'NOT_ELIGIBLE':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'IN_PROGRESS':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'EXPIRED':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'NOT_ASSESSED':
      default:
        return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  const getStatusText = (domain: EligibilityDomain, alertLevel?: string) => {
    if (alertLevel === 'warning') return 'Needs Review';
    
    // If randomised, it's final
    if (domain.randomisationStatus === 'RANDOMISED') return 'Randomised';

    if (domain.consentStatus === 'OBTAINED') {
      return 'Consented';
    }
    
    switch (domain.status) {
      case 'ELIGIBLE': return 'Eligible';
      case 'NOT_ELIGIBLE': return 'Not Eligible';
      case 'IN_PROGRESS': return 'In Progress';
      case 'EXPIRED': return 'Eligibility expired';
      default: return 'Not Assessed Yet';
    }
  };

  const renderPlatformRow = () => {
    const status = platformStatus || 'NOT_ASSESSED';
    const mockDomain: EligibilityDomain = { id: 'platform', name: 'Platform', status };
    const labelStyles = getStatusLabelStyles(mockDomain);
    const statusText = getStatusText(mockDomain);

    const strataLabels = platformStrataDetails 
      ? platformStrataDetails.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    return (
      <div 
        className="px-4 py-5 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => onSelectDomain('section-platform')}
      >
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-900">
                  PLATFORM
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border tracking-wide whitespace-nowrap ${labelStyles}`}>
                  {statusText}
                </span>
            </div>

            {platformStateDetails && (
                <div className="flex justify-between items-center animate-in fade-in slide-in-from-top-1 duration-300">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      STATE
                    </span>
                    <span className="text-[10px] font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200 whitespace-nowrap">
                        {platformStateDetails}
                    </span>
                </div>
            )}
            
            {strataLabels.length > 0 && (
                <div className="flex justify-between items-start animate-in fade-in slide-in-from-top-1 duration-300">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pt-1">
                      Strata
                    </span>
                    <div className="flex flex-col items-end gap-1.5">
                        {strataLabels.map((label, idx) => (
                            <span key={idx} className="text-[10px] font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200 whitespace-nowrap">
                                {label}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
    );
  };

  const renderDomainRow = (domain: EligibilityDomain) => {
    const domainAlert = alerts.find(a => a.domainId === domain.id);
    const labelStyles = getStatusLabelStyles(domain, domainAlert?.level);
    const statusText = getStatusText(domain, domainAlert?.level);

    const getExpiryDate = (createdOn?: string) => {
      if (!createdOn) return null;
      const parts = createdOn.split('.');
      if (parts.length !== 3) return null;
      const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      date.setDate(date.getDate() + 30);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
    };

    const expiryDate = domain.status === 'EXPIRED' ? getExpiryDate(domain.createdOn) : null;

    return (
      <div 
        key={domain.id} 
        className="flex flex-col px-4 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer animate-in fade-in slide-in-from-top-1 duration-200"
        onClick={() => onSelectDomain(`section-${domain.id}`)}
      >
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-gray-900">
            {domain.name}
          </span>
          
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border tracking-wide whitespace-nowrap ${labelStyles}`}>
            {statusText}
          </span>
        </div>
        {expiryDate && (
          <div className="mt-1 flex items-center text-[10px] text-orange-600 font-medium">
            <Icons.Clock className="w-3 h-3 mr-1" />
            Expired on {expiryDate}
          </div>
        )}
      </div>
    );
  };

  const allDomainGroups = [
    { label: 'STATE: Negative', ids: ['antibiotics'] },
    { label: 'STATE: Positive', ids: showNewDomain ? ['anticoagulation', 'respiratory'] : ['anticoagulation'] },
    { label: 'STATE: Unknown', ids: ['statins', 'vasopressors'] }
  ];

  // Filter groups based on current platform state details (e.g. "Negative", "Positive")
  // Extract just the SARS-CoV-2 status (first part before comma)
  const sarsStatus = platformStateDetails ? platformStateDetails.split(',')[0].trim() : '';

  const domainGroups = sarsStatus 
    ? allDomainGroups.filter(g => g.label.toLowerCase().includes(sarsStatus.toLowerCase()))
    : [];

  return (
    <div className="space-y-1 pr-2">
      <div className="flex items-center justify-between px-1 mb-5">
         <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.1em]">
            Eligibility Status
         </h3>
      </div>
      
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
         {renderPlatformRow()}
         
         {domainGroups.map((group, groupIdx) => {
             const groupDomains = domains.filter(d => group.ids.includes(d.id));
             if (groupDomains.length === 0) return null;
             const isExpanded = expandedGroups[groupIdx];
             
             return (
                 <div key={groupIdx} className="border-b border-gray-100 last:border-0">
                     <button 
                        onClick={() => toggleGroup(groupIdx)}
                        className="w-full bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between hover:bg-gray-100 transition-colors focus:outline-none group"
                     >
                         <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{group.label}</span>
                         <Icons.ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-300 ${isExpanded ? '' : '-rotate-90'}`} />
                     </button>
                     {isExpanded && (
                        <div className="divide-y divide-gray-100">
                            {groupDomains.map(d => renderDomainRow(d))}
                        </div>
                     )}
                 </div>
             );
         })}
      </div>
    </div>
  );
};

export default EligibilitySummary;