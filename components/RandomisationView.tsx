import React, { useState, useMemo } from 'react';
import { Icons } from './Icons';
import { EligibilityDomain, ParticipantAlert, DomainState } from '../types';

interface RandomisationViewProps {
  domains: EligibilityDomain[];
  onRandomise: (domainId?: string) => void;
  onWithdraw: () => void;
  alerts?: ParticipantAlert[];
  platformDomain?: DomainState;
  customEpisodeNames?: Record<string, { name: string; description?: string }>;
  onUpdateEpisodeName?: (episodeId: string, name: string, description: string) => void;
}

const STATE_DOMAIN_MAPPING: Record<string, string[]> = {
  'Negative': ['antibiotics'],
  'Positive': ['anticoagulation', 'respiratory'],
  'Unknown': ['statins', 'vasopressors']
};

const RandomisationBadge: React.FC<{ status: 'RANDOMISED' | 'DECLINED' | 'INELIGIBLE' | 'READY' | 'PENDING' | 'REQUESTED' | 'IN_PROGRESS' | 'PENDING_CONSENT' | 'PENDING_REVEAL' | 'WITHDRAWN' }> = ({ status }) => {
  switch (status) {
    case 'RANDOMISED':
      return (
        <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
          Randomised
        </span>
      );
    case 'DECLINED':
      return (
        <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-red-50 text-red-700 border-red-200">
          Consent declined
        </span>
      );
    case 'WITHDRAWN':
      return (
        <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-gray-50 text-gray-700 border-gray-200">
          Withdrawn
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-purple-50 text-purple-700 border-purple-200">
          In progress
        </span>
      );
    case 'PENDING_REVEAL':
      return (
        <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-purple-50 text-purple-700 border-purple-200">
          Pending reveal
        </span>
      );
    case 'READY':
      return (
        <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-brand-50 text-brand-700 border-brand-200 ring-1 ring-brand-500/20 shadow-sm animate-pulse">
          Eligible to randomise
        </span>
      );
    case 'PENDING_CONSENT':
      return (
        <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
          Draft
        </span>
      );
    case 'REQUESTED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-amber-50 text-amber-700 border-amber-200">
            Re-randomise needed
          </span>
        );
    case 'INELIGIBLE':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
            Not eligible
          </span>
        );
    case 'PENDING':
    default:
      return (
        <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-gray-100 text-gray-400 border border-gray-200">
          Not Applicable
        </span>
      );
  }
};

const RandomisationView: React.FC<RandomisationViewProps> = ({ 
  domains, 
  onRandomise, 
  onWithdraw, 
  alerts = [], 
  platformDomain,
  customEpisodeNames,
  onUpdateEpisodeName
}) => {
  const [editingEpisode, setEditingEpisode] = useState<{ id: string; name: string; description: string } | null>(null);
  const [expandedEpisodes, setExpandedEpisodes] = useState<Record<string, boolean>>({});
  const [showHistory, setShowHistory] = useState<Record<string, boolean>>({});
  const tableRows = useMemo(() => {
    if (!platformDomain) return [];

    const rows: { state: string; domain: EligibilityDomain; isCurrent: boolean; closedOn?: string }[] = [];

    // 1. Current State
    const currentState = platformDomain.stateDetails || 'Unknown';
    const currentSarsStatus = currentState.split(',')[0].trim();
    
    domains.forEach(d => {
        const currentDomainIds = STATE_DOMAIN_MAPPING[currentSarsStatus] || [];
        if (currentDomainIds.includes(d.id)) {
             rows.push({ state: currentState, domain: d, isCurrent: true });
        }
    });

    // 2. History States
    const history = platformDomain.history || [];
    const reversedHistory = [...history].reverse();
    reversedHistory.forEach((h) => {
        const state = h.stateDetails || 'Unknown';
        const sarsStatus = state.split(',')[0].trim();
        
        const domainIds = STATE_DOMAIN_MAPPING[sarsStatus] || [];
        domains.forEach(d => {
            if (domainIds.includes(d.id)) {
                rows.push({ state, domain: d, isCurrent: false, closedOn: h.timestamp });
            }
        });
    });

    return rows;
  }, [platformDomain, domains]);

  // Map domain status to view status strictly
  const getDomainStatus = (d: EligibilityDomain, isCurrent: boolean): 'RANDOMISED' | 'DECLINED' | 'INELIGIBLE' | 'READY' | 'PENDING' | 'REQUESTED' | 'IN_PROGRESS' | 'PENDING_CONSENT' | 'PENDING_REVEAL' | 'WITHDRAWN' => {
    if (!isCurrent && d.status === 'NOT_ELIGIBLE') return 'PENDING';

    if (isCurrent && d.status === 'IN_PROGRESS' && (d.consentStatus === 'OBTAINED')) {
        return 'PENDING_REVEAL';
    }

    // 1. Randomisation takes final priority
    if (d.randomisationStatus === 'RANDOMISATION_REQUESTED') return 'REQUESTED';
    if (d.randomisationStatus === 'RANDOMISED') return 'RANDOMISED';
    
    // 2. Eligibility blocking
    if (d.status === 'NOT_ELIGIBLE') return 'INELIGIBLE';
    
    // 3. Consent blocking/enabling
    if (d.consentStatus === 'DECLINED') return 'DECLINED';
    if (d.consentStatus === 'WITHDRAWN') return 'WITHDRAWN';
    
    // REQUIREMENT: Only domain with status obtained can be randomised
    if (d.status === 'ELIGIBLE' && (d.consentStatus === 'OBTAINED')) return 'READY';
    
    // 4. Intermediate states
    if (d.status === 'ELIGIBLE' && ['PENDING_CONSENT', 'SIG_REQUESTED', 'SIG_PENDING'].includes(d.consentStatus || '')) {
        return 'PENDING_CONSENT';
    }
    
    if (d.status === 'IN_PROGRESS') return 'IN_PROGRESS';
    
    return 'PENDING'; // Not Assessed Yet or fallback
  };

  const groupedRows = useMemo(() => {
    const groups: Record<string, { state: string; domain: EligibilityDomain; isCurrent: boolean }[]> = {};
    
    tableRows.forEach(row => {
      if (!groups[row.state]) {
        groups[row.state] = [];
      }
      groups[row.state].push(row);
    });
    
    return groups;
  }, [tableRows]);

  // Filter alerts relevant to displayed domains or general alerts
  const relevantAlerts = alerts.filter(a => !a.domainId || domains.some(d => d.id === a.domainId));

  // Helper to add 30 days to a date string (DD.MM.YYYY)
  const getExpiryDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const [datePart] = dateStr.split(' ');
      const [day, month, year] = datePart.split('.').map(Number);
      const date = new Date(year, month - 1, day);
      date.setDate(date.getDate() + 30);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '.');
    } catch (e) {
      return '-';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Alert Banner */}
      {relevantAlerts.length > 0 && (
        <div className="space-y-3">
          {relevantAlerts.map((alert, idx) => {
             let bgClass = "bg-blue-50 border-blue-200 text-blue-800";
             let icon = <Icons.Info className="w-5 h-5 text-blue-600 flex-shrink-0" />;
             
             if (alert.level === 'critical') {
               bgClass = "bg-red-50 border-red-200 text-red-800";
               icon = <Icons.AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />;
             } else if (alert.level === 'warning') {
               bgClass = "bg-amber-50 border-amber-200 text-amber-800";
               icon = <Icons.Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />;
             }

             return (
               <div key={idx} className={`flex items-start p-4 rounded-lg border ${bgClass} shadow-sm`}>
                 <div className="mr-3 mt-0.5">{icon}</div>
                 <div>
                   <h4 className="text-sm font-semibold">{alert.title}</h4>
                   <p className="text-sm mt-1 opacity-90">{alert.description}</p>
                 </div>
               </div>
             );
          })}
        </div>
      )}

      {/* Table Section */}
      <div className="space-y-10">
        {Object.entries(groupedRows).map(([state, rowsData], index) => {
          const rows = rowsData as { state: string; domain: EligibilityDomain; isCurrent: boolean; closedOn?: string }[];
          const episodeIndex = Object.keys(groupedRows).length - index;
          const randomisedDate = rows.find(r => r.domain.randomisedDate)?.domain.randomisedDate;
          const closedOnDate = rows.find(r => r.closedOn)?.closedOn;
          
          // Use state as a stable ID for custom names
          const episodeId = state;
          const customName = customEpisodeNames?.[episodeId];
          const isExpanded = expandedEpisodes[episodeId] !== undefined ? expandedEpisodes[episodeId] : index === 0;
          
          const uniqueDomains = Array.from(new Set(rows.map(r => r.domain.id)));
          const latestRows = uniqueDomains.map(id => rows.find(r => r.domain.id === id)!);
          const hasHistory = rows.length > latestRows.length;
          const isHistoryShown = showHistory[episodeId] ?? false;
          const displayRows = isHistoryShown ? rows : latestRows;
          
          return (
          <React.Fragment key={state}>
          {index > 0 && <hr className="border-gray-200 my-8" />}
          <div className="space-y-4">
            <div className="px-2 flex items-center justify-between">
              <div 
                className="flex flex-col cursor-pointer flex-1"
                onClick={() => setExpandedEpisodes(prev => ({ ...prev, [episodeId]: !isExpanded }))}
              >
                <div className="flex items-center gap-2">
                  <Icons.ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                  <h2 className="text-xl font-serif text-gray-900">
                    {customName?.name || `Randomisation episode ${episodeIndex}`}
                  </h2>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingEpisode({ 
                        id: episodeId, 
                        name: customName?.name || `Randomisation episode ${episodeIndex}`,
                        description: customName?.description || ''
                      });
                    }}
                    className="p-1 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-all"
                    title="Rename episode"
                  >
                    <Icons.Edit className="w-3.5 h-3.5" />
                  </button>
                </div>
                {customName?.description && (
                  <p className="text-sm text-gray-500 mt-0.5 italic ml-7">{customName.description}</p>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1 ml-7">
                  <span>State: {state}</span>
                  {randomisedDate && (
                    <>
                      <span className="text-gray-300">&bull;</span>
                      <span>Created on: {randomisedDate}</span>
                    </>
                  )}
                  {closedOnDate && (
                    <>
                      <span className="text-gray-300">&bull;</span>
                      <span className="text-red-600 font-medium">Completed on {closedOnDate.split(' ')[0]}</span>
                    </>
                  )}
                </div>
              </div>
              {hasHistory && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600">Show history</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowHistory(prev => ({ ...prev, [episodeId]: !isHistoryShown }));
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      isHistoryShown ? 'bg-brand-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isHistoryShown ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>
            {isExpanded && (
              <div className="flex flex-col gap-4">
                {/* Latest Row Card */}
                {latestRows.map((row) => (
                  <div key={row.domain.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4">
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="font-bold text-sm text-gray-900">{row.domain.name}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-10 text-xs text-gray-500">
                          <div className="flex flex-col items-end">
                             <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Reveal Expiry</span>
                             {getDomainStatus(row.domain, row.isCurrent) === 'PENDING_REVEAL' ? getExpiryDate(row.domain.randomisedDate) : '-'}
                          </div>
                          <div className="h-6 w-px bg-gray-200" />
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Status</span>
                            <RandomisationBadge status={getDomainStatus(row.domain, row.isCurrent)} />
                          </div>
                          <div className="h-6 w-px bg-gray-200" />
                          <div className="flex flex-col items-end">
                             <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Randomisation Date</span>
                             {row.domain.randomisedDate || '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* History Table */}
                {hasHistory && (
                  <div className="flex flex-col gap-2 mt-2">
                    <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest px-2">History</h4>
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
                      <div className="hidden md:grid grid-cols-[1.5fr,1fr,1fr,1fr] gap-4 px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <div className="text-xs font-bold text-gray-900 uppercase tracking-wider">Domain</div>
                        <div className="text-xs font-bold text-gray-900 uppercase tracking-wider">Status</div>
                        <div className="text-xs font-bold text-gray-900 uppercase tracking-wider">Reveal Expiry</div>
                        <div className="text-xs font-bold text-gray-900 uppercase tracking-wider">Randomisation Date</div>
                      </div>
                      <div className="flex flex-col divide-y divide-gray-200">
                        {rows.filter(r => !latestRows.includes(r)).map((row, idx) => {
                          const status = getDomainStatus(row.domain, row.isCurrent);
                          return (
                            <div key={`${row.domain.id}-${row.state}-${idx}`} className="grid grid-cols-1 md:grid-cols-[1.5fr,1fr,1fr,1fr] gap-4 px-6 py-4 items-center bg-gray-50/30">
                              <div className="text-sm font-medium text-gray-700">{row.domain.name}</div>
                              <div><RandomisationBadge status={status} /></div>
                              <div className="text-sm text-gray-500 font-mono">
                                {status === 'PENDING_REVEAL' ? getExpiryDate(randomisedDate) : '-'}
                              </div>
                              <div className="text-sm text-gray-500">{row.domain.randomisedDate || '-'}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
        </div>
        </React.Fragment>
        );
        })}
        {Object.keys(groupedRows).length === 0 && (
          <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 p-10 text-center text-sm text-gray-500">
            No domains available for current or history states.
          </div>
        )}
      </div>
      
      {/* Edit Episode Modal */}
      {editingEpisode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-serif text-gray-900">Edit Episode Name</h3>
              <button 
                onClick={() => setEditingEpisode(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Custom Episode Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={editingEpisode.name}
                    onChange={(e) => setEditingEpisode({ ...editingEpisode, name: e.target.value.slice(0, 50) })}
                    placeholder="e.g. Initial Randomisation"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-gray-900"
                  />
                  <div className="absolute right-3 bottom-3 text-[10px] font-medium text-gray-400">
                    {editingEpisode.name.length}/50
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Short Description
                </label>
                <div className="relative">
                  <textarea
                    value={editingEpisode.description}
                    onChange={(e) => setEditingEpisode({ ...editingEpisode, description: e.target.value.slice(0, 200) })}
                    placeholder="Add a brief description..."
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-gray-900 resize-none"
                  />
                  <div className="absolute right-3 bottom-3 text-[10px] font-medium text-gray-400">
                    {editingEpisode.description.length}/200
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setEditingEpisode(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onUpdateEpisodeName?.(editingEpisode.id, editingEpisode.name, editingEpisode.description);
                  setEditingEpisode(null);
                }}
                className="px-6 py-2 bg-brand-600 text-white text-sm font-bold rounded-xl hover:bg-brand-700 shadow-sm transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <hr className="border-gray-200 mt-8 mb-6" />

      {/* Footer / Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between rounded-xl shadow-sm border border-gray-200">
         <div className="text-sm text-gray-500">
           Showing <span className="font-medium">{domains.length}</span> domains
         </div>
         
         <div className="flex items-center space-x-6">
           <div className="flex items-center space-x-6 text-sm text-gray-500">
             <div className="flex items-center">
               <span className="mr-2">Items per page:</span>
               <div className="relative">
                  <select className="appearance-none bg-transparent pr-6 focus:outline-none cursor-pointer">
                    <option>1</option>
                    <option>4</option>
                    <option>10</option>
                  </select>
                  <Icons.ChevronDown className="w-3 h-3 absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none" />
               </div>
             </div>
             <div>
               1-{domains.length} of {domains.length}
             </div>
             <div className="flex items-center space-x-4">
               <button className="hover:text-gray-900"><Icons.ChevronLeft className="w-4 h-4" /></button>
               <button className="hover:text-gray-900"><Icons.ChevronRight className="w-4 h-4" /></button>
             </div>
           </div>
         </div>
      </div>
    </div>
  );
};

export default RandomisationView;