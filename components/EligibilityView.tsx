import React, { useState, useMemo, useEffect } from 'react';
import { Icons } from './Icons';
import { EligibilityDomain, EligibilityStatus, ParticipantAlert, EligibilityRecord, Note, STATE_DOMAIN_MAPPING, EligibilityHistoryItem } from '../types';
import EligibilityHistory from './EligibilityHistory';

interface EligibilityViewProps {
  domains: EligibilityDomain[];
  eligibilityRecords?: EligibilityRecord[];
  notes?: Note[];
  onAssessEligibility?: (domainIds?: string[]) => void;
  onViewAssessment?: (record: EligibilityRecord) => void;
  onToggleActive?: (id: string, isActive: boolean) => void;
  onAddNote?: (episode: any, initialTab?: 'view' | 'process' | 'outcome') => void;
  alerts?: ParticipantAlert[];
  platformStateDetails?: string;
  showNewDomain?: boolean;
}

const EligibilityStatusBadge: React.FC<{ status: EligibilityStatus }> = ({ status }) => {
  const baseClasses = "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border tracking-wide whitespace-nowrap";
  
  switch (status) {
    case 'ELIGIBLE':
      return <span className={`${baseClasses} bg-green-50 text-green-700 border-green-200`}>Eligible</span>;
    case 'COMPLETED':
      return <span className={`${baseClasses} bg-green-100 text-green-800 border-green-300`}>Completed</span>;
    case 'NOT_ELIGIBLE':
      return <span className={`${baseClasses} bg-red-50 text-red-700 border-red-200`}>Not Eligible</span>;
    case 'IN_PROGRESS':
      return <span className={`${baseClasses} bg-blue-50 text-blue-700 border-blue-200`}>In Progress</span>;
    case 'NOT_COMPLETED':
      return <span className={`${baseClasses} bg-yellow-50 text-yellow-700 border-yellow-200`}>Not Completed</span>;
    case 'EXPIRED':
      return <span className={`${baseClasses} bg-orange-50 text-orange-700 border-orange-200`}>Expired</span>;
    case 'NOT_ASSESSED':
    default:
      return <span className={`${baseClasses} bg-gray-100 text-gray-500 border-gray-200`}>Not Assessed</span>;
  }
};

const EligibilityView: React.FC<EligibilityViewProps> = ({ 
  domains, 
  eligibilityRecords = [],
  onAssessEligibility,
  onViewAssessment,
  onToggleActive,
  onAddNote,
  alerts = [],
  platformStateDetails,
  notes = [],
  showNewDomain = false
}) => {
  const [showHistory, setShowHistory] = useState<Record<string, boolean>>({});
  const [expandedEpisodes, setExpandedEpisodes] = useState<Record<string, boolean>>({});
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        return null;
      }
      return { key, direction: 'asc' };
    });
  };

  const toggleHistory = (episodeId: string) => {
    setShowHistory(prev => ({
      ...prev,
      [episodeId]: !prev[episodeId]
    }));
  };

  const toggleVersion = (id: string, isActive: boolean = true) => {
    if (!isActive) return;
    setExpandedVersions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Group records into episodes based on isClosed flag
  const groupedEpisodes = useMemo(() => {
    const episodes: { id: string; rows: EligibilityRecord[] }[] = [];
    if (eligibilityRecords.length === 0) return episodes;

    // Sort records by timestamp ascending (oldest first)
    const sortedRecords = [...eligibilityRecords].sort((a, b) => {
        const toSortable = (dStr: string) => {
            if (!dStr) return '';
            const parts = dStr.split(' ');
            const datePart = parts[0];
            const timePart = parts[1] || '00:00';
            const amPm = parts[2] || '';
            
            const dateComponents = datePart.split('.');
            if (dateComponents.length !== 3) return dStr;
            const [d, m, y] = dateComponents;
            
            let [hours, minutes] = timePart.split(/[:.]/).map(Number);
            if (isNaN(hours)) hours = 0;
            if (isNaN(minutes)) minutes = 0;

            if (amPm.toLowerCase() === 'pm' && hours < 12) hours += 12;
            if (amPm.toLowerCase() === 'am' && hours === 12) hours = 0;
            
            const hStr = hours.toString().padStart(2, '0');
            const minStr = minutes.toString().padStart(2, '0');
            
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')} ${hStr}:${minStr}`;
        };
        const sortA = toSortable(a.timestamp);
        const sortB = toSortable(b.timestamp);
        return sortA.localeCompare(sortB);
    });

    let currentEpisode: { id: string; rows: EligibilityRecord[] } | null = null;

    // Iterate oldest to newest to group
    sortedRecords.forEach((record) => {
      if (!currentEpisode) {
        // New episode
        currentEpisode = {
          id: `ep-${record.id}`,
          rows: [record]
        };
        episodes.push(currentEpisode);
      } else {
        // Add to current episode
        currentEpisode.rows.push(record);
      }

      // If this record is closed, the NEXT record (newer) will start a new episode
      if (record.isClosed) {
        currentEpisode = null;
      }
    });

    // Reverse episodes to show newest first, and reverse records within each episode to show newest first
    return episodes.reverse().map(episode => ({
      ...episode,
      rows: [...episode.rows].reverse()
    }));
  }, [eligibilityRecords]);

  const displayEpisodes = useMemo(() => {
    // Show all episodes, newest first
    return groupedEpisodes;
  }, [groupedEpisodes]);

  const getExpiryDate = (record: EligibilityRecord) => {
    try {
      const parts = record.timestamp.split(' ')[0].split('.');
      if (parts.length === 3) {
        const [d, m, y] = parts;
        const date = new Date(`${y}-${m}-${d}T00:00:00Z`);
        date.setDate(date.getDate() + 30);
        return date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).replace(/\//g, '.');
      }
      return '-';
    } catch (e) {
      return '-';
    }
  };

  return (
    <div className="space-y-6">
      {displayEpisodes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <h3 className="text-gray-900 font-medium mb-1">No assessments yet</h3>
          <p className="text-sm text-gray-500 max-w-xs">
            Start by assessing the participant's eligibility for the trial domains.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {displayEpisodes.map((episode) => {
            const episodeIndex = groupedEpisodes.indexOf(episode);
            const episodeNumber = groupedEpisodes.length - episodeIndex;
            const isExpanded = expandedEpisodes[episode.id] !== undefined ? expandedEpisodes[episode.id] : episodeIndex === 0;
            const isHistoryShown = showHistory[episode.id] ?? false;
            
            const latestRow = episode.rows[0];
            const isCompleted = latestRow.status === 'ELIGIBLE' || latestRow.status === 'INELIGIBLE';
            const isActiveEpisode = !isCompleted && latestRow.isActive !== false;
            
            return (
            <React.Fragment key={episode.id}>
            {episodeIndex > 0 && <hr className="border-gray-200 my-8" />}
            <div className="space-y-4">
              <div className="px-2 flex items-center justify-between">
                <div 
                  className="flex flex-col cursor-pointer flex-1"
                  onClick={() => setExpandedEpisodes(prev => ({ ...prev, [episode.id]: !isExpanded }))}
                >
                  <div className="flex items-center gap-2">
                    <Icons.ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                    <h2 className="text-xl font-serif text-gray-900">Eligibility episode {episodeNumber}</h2>
                  </div>
                  {episode.rows[episode.rows.length - 1]?.timestamp && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1 ml-7">
                      <span>Created on: {episode.rows[episode.rows.length - 1].timestamp.split(' ')[0]}</span>
                      {!isActiveEpisode && latestRow.timestamp && (
                        <>
                          <span className="text-gray-300">&bull;</span>
                          <span className="text-red-600 font-medium">Completed on {latestRow.timestamp.split(' ')[0]}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {episode.rows.length > 1 && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600">Show history</span>
                    <button 
                      onClick={() => setShowHistory(prev => ({ ...prev, [episode.id]: !isHistoryShown }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isHistoryShown ? 'bg-brand-600' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isHistoryShown ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                )}
              </div>

            {isExpanded && (
              <div className="flex flex-col gap-4">
                {/* Latest Row Card */}
                {episode.rows.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      {/* Render latest row as a card */}
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div>
                              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Assessment</div>
                              <button onClick={() => onViewAssessment?.(episode.rows[0])} className="font-bold text-sm text-gray-900 hover:underline">{episode.rows[0].id}</button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="w-full pt-6">
                          {(() => {
                            const filteredDomains = episode.rows[0].domainIds.filter(domainId => {
                              if (!showNewDomain && domainId === 'respiratory') return false;
                              const primaryState = episode.rows[0].stateDetails?.split(',')[0].trim() || 'Unknown';
                              const allowedDomains = STATE_DOMAIN_MAPPING[primaryState] || [];
                              return allowedDomains.includes(domainId);
                            });
                            return (
                              <>
                                <div className="flex items-center justify-between mb-4 px-6 pt-4">
                                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Domain Statuses</h4>
                                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{filteredDomains.length} Domains</span>
                                </div>
                                <div className="divide-y divide-gray-200 border-t border-gray-200 bg-gray-50/30 px-6">
                                  {filteredDomains.map(domainId => {
                                    const domainStatus = episode.rows[0].domainStatuses[domainId];
                                    const domainName = domains.find(d => d.id === domainId)?.name || domainId;
                                    return (
                                      <div key={domainId} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-sm text-gray-900">{domainName}</span>
                                          <span className="text-[10px] text-gray-400 uppercase tracking-widest">ID: {domainId}</span>
                                        </div>
                                        <div className="flex items-center gap-6">
                                          <div className="flex flex-col items-end">
                                            <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Eligibility</span>
                                            <div className="flex items-center">
                                              <EligibilityStatusBadge status={domainStatus} />
                                            </div>
                                          </div>
                                          <div className="h-6 w-px bg-gray-200" />
                                          <div className="flex flex-col items-end">
                                            <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Expiry</span>
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs text-gray-700">
                                                {domainStatus === 'ELIGIBLE' ? getExpiryDate(episode.rows[0]) : '—'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 px-2">
                      {/* Update episode button hidden per user request */}
                    </div>
                  </div>
                )}

                {/* History Table */}
                {episode.rows.length > 1 && (
                  <EligibilityHistory 
                    episode={episode}
                    onAddNote={onAddNote}
                    history={episode.rows.slice(1).map(record => ({
                      timestamp: record.timestamp,
                      status: record.status,
                      stateDetails: record.stateDetails,
                      strataDetails: record.strataDetails,
                      associatedDomains: record.domainIds.map(id => ({ name: id, status: record.domainStatuses[id] }))
                    }))}
                  />
                )}
              </div>
            )}
            </div>
            </React.Fragment>
          );})}
        </div>
      )}

      <hr className="border-gray-200 mt-8 mb-6" />

      {/* Footer with actions */}
      <div className="flex justify-between items-center px-2">
        <div className="text-sm text-gray-500 flex items-center">
          Showing <span className="font-medium">{eligibilityRecords.length}</span> documents
        </div>
      </div>
    </div>
  );
};

export default EligibilityView;
