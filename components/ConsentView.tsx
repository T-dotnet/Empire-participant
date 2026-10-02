import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import { EligibilityDomain, EligibilityStatus, ParticipantAlert, ConsentRecord, Note } from '../types';

interface ConsentViewProps {
  domains: EligibilityDomain[];
  consentRecords?: ConsentRecord[];
  notes?: Note[];
  onRequestConsent?: () => void;
  onRevokeConsent?: () => void;
  onSimulateSign?: () => void;
  onRandomise?: () => void;
  onViewConsent?: (version: string) => void;
  onToggleActive?: (id: string, isActive: boolean) => void;
  onAddNote?: (episode: any, initialTab?: 'view' | 'process' | 'outcome') => void;
  eligibilityCloseToExpire?: boolean;
  alerts?: ParticipantAlert[];
  platformStateDetails?: string;
  consentRecipient?: string;
  customEpisodeNames?: Record<string, { name: string; description?: string }>;
  onUpdateEpisodeName?: (episodeId: string, name: string, description: string) => void;
}

const STATE_DOMAIN_MAPPING: Record<string, string[]> = {
  'Negative': ['antibiotics'],
  'Positive': ['anticoagulation', 'respiratory'],
  'Unknown': ['statins', 'vasopressors']
};

const ConsentStatusBadge: React.FC<{ 
  label: string; 
  subLabel?: string;
  type: 'draft' | 'presented' | 'obtained' | 'declined' | 'expired' | 'withdrawn' | 'randomised' | 'awaiting' | 'consented' | 'in-progress' | 'not-started';
}> = ({ label, subLabel, type }) => {
  const baseClasses = "inline-flex flex-col items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border tracking-wide whitespace-nowrap";
  
  let colorClasses = "bg-gray-100 text-gray-500 border-gray-200"; // Default to draft/not started
  
  switch (type) {
    case 'withdrawn':
      colorClasses = "bg-gray-100 text-gray-600 border-gray-300";
      break;
    case 'declined':
      colorClasses = "bg-red-50 text-red-700 border-red-200";
      break;
    case 'obtained':
    case 'consented':
    case 'randomised':
      colorClasses = "bg-green-50 text-green-700 border-green-200";
      break;
    case 'presented':
    case 'awaiting':
    case 'in-progress':
      colorClasses = "bg-blue-50 text-blue-700 border-blue-200";
      break;
    case 'expired':
      colorClasses = "bg-orange-50 text-orange-700 border-orange-200";
      break;
    case 'draft':
    case 'not-started':
    default:
      colorClasses = "bg-gray-100 text-gray-500 border-gray-200";
      break;
  }

  const displayLabel = label === 'Obtained' ? 'Signed' : label;

  return (
    <span className={`${baseClasses} ${colorClasses}`}>
      <span>{displayLabel}</span>
      {subLabel && <span className="font-normal normal-case opacity-70">{subLabel}</span>}
    </span>
  );
};

const ConsentView: React.FC<ConsentViewProps> = ({ 
  domains, 
  consentRecords = [],
  onRequestConsent, 
  onRevokeConsent, 
  onSimulateSign, 
  onRandomise, 
  onViewConsent,
  onToggleActive,
  onAddNote,
  eligibilityCloseToExpire,
  alerts = [],
  platformStateDetails,
  consentRecipient,
  customEpisodeNames,
  onUpdateEpisodeName,
  notes = []
}) => {
  const hasPendingSignatures = domains.some(d => d.consentStatus === 'SIG_REQUESTED' || d.consentStatus === 'SIG_PENDING') || consentRecords.some(r => r.status === 'SIG_REQUESTED' || r.status === 'SIG_PENDING');
  
  // Filter alerts relevant to displayed domains or general alerts
  const relevantAlerts = alerts.filter(a => !a.domainId || domains.some(d => d.id === a.domainId));
  const hasExpired = domains.some(d => d.status === 'EXPIRED');

  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [showHistory, setShowHistory] = useState<Record<string, boolean>>({});
  const [expandedEpisodes, setExpandedEpisodes] = useState<Record<string, boolean>>({});
  const [editingEpisode, setEditingEpisode] = useState<{ id: string; name: string; description: string } | null>(null);

  const handleResetAlert = () => {
    localStorage.removeItem('hideDeactivationAlert');
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        return null;
      }
      return { key, direction: 'asc' };
    });
  };

  const toggleVersion = (version: string, isActive: boolean = true) => {
    if (!isActive) return;
    setExpandedVersions(prev => ({
      ...prev,
      [version]: !prev[version]
    }));
  };

  // Group domains by version for the "Unknown" row (domains not yet in a record)
  const groupedDomains = useMemo(() => {
    const groups: Record<string, EligibilityDomain[]> = {};
    domains.forEach(d => {
      const version = d.consentVersion || 'Unknown';
      if (!groups[version]) groups[version] = [];
      groups[version].push(d);
    });
    return groups;
  }, [domains]);

  // Combine grouped domains with consent records
  const allRows = useMemo(() => {
    const rows: { 
      id: string; 
      version: string; 
      domains: EligibilityDomain[]; 
      recipient?: string; 
      status?: string; 
      date?: string; 
      isRecord: boolean;
      situation?: string;
      isActive?: boolean;
      isAnalogue?: boolean;
      processTime?: string;
      processDateTime?: string;
      siteSideSelections?: string[];
      otherTextEntries?: {role: string, name: string}[];
      processDate?: string;
      processNote?: string;
      note?: string;
      outcomeDate?: string;
    }[] = [];
    
    // Sort records by date descending
    const sortedRecords = [...consentRecords].sort((a, b) => {
      // Handle missing dates
      if (!a.date && !b.date) {
        return consentRecords.indexOf(b) - consentRecords.indexOf(a);
      }
      if (!a.date) return 1; // a has no date, so it's older, comes after b
      if (!b.date) return -1; // b has no date, so it's older, comes after a

      // Robust date comparison for DD.MM.YYYY HH:mm
      const toSortable = (dStr: string) => {
        const parts = dStr.split(' ');
        const datePart = parts[0];
        const timePart = parts[1] || '00:00';
        const dateComponents = datePart.split('.');
        if (dateComponents.length !== 3) return dStr; // Fallback
        const [d, m, y] = dateComponents;
        const pad = (n: string) => n.padStart(2, '0');
        return `${y}-${pad(m)}-${pad(d)} ${timePart}`;
      };
      
      const sortA = toSortable(a.date);
      const sortB = toSortable(b.date);
      
      if (sortA !== sortB) {
        return sortB.localeCompare(sortA);
      }
      
      // If dates are same, use processTime if available
      if (a.processTime && b.processTime) {
        if (a.processTime !== b.processTime) {
          return b.processTime.localeCompare(a.processTime);
        }
      } else if (a.processTime) {
        return -1; // a has time, b doesn't -> a is newer
      } else if (b.processTime) {
        return 1; // b has time, a doesn't -> b is newer
      }
      
      // Final tie-breaker: use original array position (later is newer)
      return consentRecords.indexOf(b) - consentRecords.indexOf(a);
    });

    // Add "Unknown" row if there are domains not in any record or explicitly pending
    // We put this at the top as it represents the newest "Draft" state for remaining domains
    if (groupedDomains['Unknown']) {
        const domainsNotInRecords = groupedDomains['Unknown'].filter(d => 
            !consentRecords.some(r => r.domainIds.includes(d.id))
        );
        if (domainsNotInRecords.length > 0) {
            rows.push({
                id: 'unknown-row',
                version: 'Unknown',
                domains: domainsNotInRecords,
                recipient: consentRecipient || 'Participant',
                situation: 'Standard',
                isRecord: false
            });
        }
    }

    // Add records (newest first)
    sortedRecords.forEach((record, index) => {
      const recordDomains = domains
        .filter(d => record.domainIds.includes(d.id))
        .map(d => ({
          ...d,
          consentStatus: (record.domainStatuses && record.domainStatuses[d.id]) ? record.domainStatuses[d.id] : record.status as any
        }));
      
      // Generate consecutive fallback times: 10:00, 09:55, 09:50...
      // We use the index in the sorted list to ensure they are consecutive and descending
      let fallbackTime = record.processTime;
      if (!fallbackTime) {
        const totalMinutes = 600 - (index * 5); // Start at 10:00 (600 mins) and subtract 5 mins per record
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        fallbackTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      }

      rows.push({
        id: record.id,
        version: record.version,
        domains: recordDomains,
        recipient: record.recipient,
        status: record.status,
        date: record.date,
        processDate: record.processDate,
        isRecord: true,
        situation: record.situation,
        isActive: record.isActive,
        isAnalogue: record.isAnalogue,
        processTime: fallbackTime,
        processDateTime: record.processDateTime,
        siteSideSelections: record.siteSideSelections,
        otherTextEntries: record.otherTextEntries,
        processNote: record.processNote,
        note: record.note,
        outcomeDate: (record.status === 'OBTAINED' || record.status === 'DECLINED') ? ((record.outcomeDate || record.processDate || record.date || '').split(' ')[0]) : undefined
      });
    });

    return rows;
  }, [consentRecords, groupedDomains, domains, consentRecipient]);

  const getRowState = (row: typeof allRows[0]) => {
    if (row.version === 'Unknown') {
      return platformStateDetails || 'Not started';
    }
    const domainIds = row.domains.map(d => d.id);
    if (domainIds.some(id => STATE_DOMAIN_MAPPING['Negative'].includes(id))) return 'Negative';
    if (domainIds.some(id => STATE_DOMAIN_MAPPING['Positive'].includes(id))) return 'Positive';
    if (domainIds.some(id => STATE_DOMAIN_MAPPING['Unknown'].includes(id))) return 'Unknown';
    return 'Not started';
  };

  const groupedEpisodes = useMemo(() => {
    const episodes: { id: string; rows: typeof allRows }[] = [];
    if (allRows.length === 0) return episodes;

    let currentRows: typeof allRows = [];
    
    // Iterate from oldest to newest to determine boundaries
    // allRows is newest first, so we reverse it
    const oldestToNewest = [...allRows].reverse();

    oldestToNewest.forEach((row, idx) => {
      if (row.version === 'Unknown') {
        // If we have accumulated rows before Unknown, save them as an episode
        if (currentRows.length > 0) {
          const anchorRow = currentRows[0];
          const seed = anchorRow.id;
          let hash = 0;
          for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash |= 0;
          }
          const episodeId = Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').substring(0, 6);
          
          episodes.unshift({
            id: episodeId,
            rows: [...currentRows].reverse() // Newest first within episode
          });
          currentRows = [];
        }
        // Unknown is always its own episode
        episodes.unshift({
          id: 'UNKNOWN',
          rows: [row]
        });
      } else {
        currentRows.push(row);
        const isCompleted = row.status === 'OBTAINED' || row.status === 'DECLINED' || row.status === 'WITHDRAWN' || row.status === 'CONSENTED';
        
        // If this row is completed, it's the end of an episode group
        // Any document created AFTER a completed one should be in a new group
        if (isCompleted || idx === oldestToNewest.length - 1) {
          // Generate a stable ID for this episode based on the row ID
          const anchorRow = currentRows[0];
          const seed = anchorRow.id;
          let hash = 0;
          for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash |= 0;
          }
          const episodeId = Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').substring(0, 6);
          
          episodes.unshift({
            id: episodeId,
            rows: [...currentRows].reverse() // Newest first within episode
          });
          currentRows = [];
        }
      }
    });

    // Now filter and sort the rows within each episode
    return episodes.map((episode, episodeIdx) => {
      const isHistoryShown = showHistory[episode.id] ?? false;
      
      const validRows = episode.rows.filter(row => row.status !== 'WITHDRAWN');

      let filteredRows = validRows.map((row, index) => ({ ...row, isFirstOfEpisode: index === 0 })).filter((row, index) => {
        if (!isHistoryShown && index > 0) return false;
        
        if (row.version === 'Unknown') {
          let stateLabel = platformStateDetails || 'Not started';
          const allowedIds = stateLabel !== 'Not started' ? STATE_DOMAIN_MAPPING[stateLabel] : [];
          
          const hasVisibleDomains = row.domains.some(d => 
            (allowedIds && allowedIds.includes(d.id)) || 
            d.consentStatus === 'PENDING_CONSENT'
          );
          
          if (!hasVisibleDomains) return false;
        }

        return true;
      });

      if (sortConfig) {
        filteredRows = [...filteredRows].sort((a, b) => {
          let valA: any = '';
          let valB: any = '';

          switch (sortConfig.key) {
            case 'episode':
              valA = a.recipient || '';
              valB = b.recipient || '';
              break;
            case 'status':
              valA = a.status || '';
              valB = b.status || '';
              break;
            case 'createdDate':
              valA = a.date ? a.date.split('.').reverse().join('-') : '';
              valB = b.date ? b.date.split('.').reverse().join('-') : '';
              break;
            case 'lastUpdate':
              valA = a.processDate ? a.processDate.split('.').reverse().join('-') : (a.date ? a.date.split('.').reverse().join('-') : '');
              valB = b.processDate ? b.processDate.split('.').reverse().join('-') : (b.date ? b.date.split('.').reverse().join('-') : '');
              break;
            case 'state':
              valA = getRowState(a);
              valB = getRowState(b);
              break;
            case 'outcomeDate':
              valA = a.outcomeDate ? a.outcomeDate.split('.').reverse().join('-') : '';
              valB = b.outcomeDate ? b.outcomeDate.split('.').reverse().join('-') : '';
              break;
          }

          if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }

      return {
        ...episode,
        rows: filteredRows,
        originalRows: validRows
      };
    }).filter(episode => episode.rows.length > 0);
  }, [allRows, showHistory, platformStateDetails, sortConfig]);

  const renderedRows = useMemo(() => {
    return groupedEpisodes.flatMap(episode => episode.rows);
  }, [groupedEpisodes]);

  const getEpisodeName = (row: typeof allRows[0]) => {
    const recipient = row.recipient || consentRecipient || 'Participant';
    const situation = row.situation || 'Standard';
    return `${recipient} ${situation}`;
  };

  const topRow = renderedRows.length > 0 ? renderedRows[0] : null;

  useEffect(() => {
    if (topRow && topRow.isActive !== false) {
      setExpandedVersions(prev => {
        if (prev[topRow.version]) return prev;
        return { ...prev, [topRow.version]: true };
      });
    }
  }, [topRow?.version, topRow?.isActive]);

  // Collapse rows that become deactivated
  useEffect(() => {
    const inactiveVersions = renderedRows.filter(r => r.isActive === false).map(r => r.version);
    setExpandedVersions(prev => {
      let changed = false;
      const next = { ...prev };
      inactiveVersions.forEach(v => {
        if (next[v]) {
          delete next[v];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [renderedRows]);

  const getExpiryDate = (domain: EligibilityDomain) => {
    if (!domain.createdOn) return '22.10.2025';
    try {
      let date;
      if (domain.createdOn.includes('.')) {
        const parts = domain.createdOn.split(' ')[0].split('.');
        if (parts.length === 3) {
          const [d, m, y] = parts;
          date = new Date(`${y}-${m}-${d}T00:00:00Z`);
        } else {
          date = new Date(domain.createdOn);
        }
      } else {
        date = new Date(domain.createdOn);
      }
      
      if (isNaN(date.getTime())) {
        return '22.10.2025';
      }

      date.setDate(date.getDate() + 30);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '.');
    } catch (e) {
      return '22.10.2025';
    }
  };

  const renderConsentTable = (rows: typeof renderedRows, episode: any, isActiveEpisode: boolean, isOutcomeButtonDisabled: boolean) => {
    const latestRow = rows[0];
    const historyRows = rows.slice(1);

    const renderRowContent = (row: typeof renderedRows[0], isCard: boolean) => {
      const isExpanded = expandedVersions[row.version] !== undefined ? expandedVersions[row.version] : row.isFirstOfEpisode;
      const isGroupExpired = hasExpired;
      const isGroupCloseToExpire = eligibilityCloseToExpire;
      let displayDomains = row.domains;
      
      if (row.version === 'Unknown') {
        let stateLabel = platformStateDetails || 'Not started';
        const allowedIds = stateLabel !== 'Not started' ? STATE_DOMAIN_MAPPING[stateLabel] : [];
        displayDomains = row.domains.filter(d => 
          (allowedIds && allowedIds.includes(d.id)) || 
          d.consentStatus === 'PENDING_CONSENT'
        );
      }

      return (
        <div key={row.id} className="group/row">
          <div 
            className={`${isCard ? 'flex flex-col md:flex-row md:items-center justify-between gap-6 p-6' : 'grid grid-cols-1 md:grid-cols-[1.8fr,1fr,1fr,120px] gap-4 px-6 py-4 items-center'} transition-colors ${
              row.isActive === false 
                ? 'bg-gray-100 cursor-default' 
                : (row.isFirstOfEpisode ? 'hover:bg-gray-50 bg-white' : 'bg-white')
            } ${row.isFirstOfEpisode ? 'cursor-pointer' : ''} ${!row.isFirstOfEpisode ? 'bg-gray-50/30' : ''}`}
            onClick={() => row.isFirstOfEpisode && toggleVersion(row.version, row.isActive !== false)}
          >
            {/* Document Column */}
            <div className={`flex items-center gap-4 ${isCard ? 'flex-1' : ''}`}>
              <div className="flex flex-col min-w-0">
                {/* Doc ID (small grey) */}
                <span className="text-[10px] text-gray-400 font-mono">{row.version}</span>
                
                {/* Recipient + scenarios (bold black) */}
                {row.recipient || consentRecipient ? (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (row.version !== 'Unknown') onViewConsent?.(row.version);
                      }}
                      className={`font-bold text-left truncate transition-colors text-sm text-gray-900`}
                    >
                      <span className="capitalize">{row.recipient || consentRecipient}</span>
                      {row.situation && (
                        <span className="ml-1">{row.situation}</span>
                      )}
                    </button>
                ) : (
                  <span className="text-sm text-gray-400 italic">Not set</span>
                )}
              </div>
            </div>

            {/* State, Status, Outcome Date Columns */}
            <div className={`flex items-center ml-auto ${isCard ? 'gap-6' : 'gap-12'}`}>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">State</span>
                <div className="flex items-center">
                  <span className="text-xs text-gray-700">{getRowState(row)}</span>
                </div>
              </div>
              <div className="h-6 w-px bg-gray-200" />
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</span>
                <div className="flex items-center">
                  {(() => {
                    const anyExpired = displayDomains.some(d => d.status === 'EXPIRED');
                    if (anyExpired) return <ConsentStatusBadge label="Eligibility Expired" type="expired" />;
                    const allWithdrawn = displayDomains.length > 0 && displayDomains.every(d => d.consentStatus === 'WITHDRAWN');
                    if (allWithdrawn) return <ConsentStatusBadge label="Withdrawn" type="withdrawn" />;
                    if (row.isRecord) {
                      // Prioritize explicit status
                      if (row.status === 'OBTAINED' || row.status === 'CONSENTED') return <ConsentStatusBadge label="Signed" type="obtained" />;
                      if (row.status === 'DECLINED') return <ConsentStatusBadge label="Declined" type="declined" />;

                      // Fallback to note-based checks
                      if (row.note && row.note.trim() !== '') {
                        const hasConsented = row.domains.some(d => d.consentStatus === 'OBTAINED' || d.consentStatus === 'CONSENTED');
                        if (hasConsented) return <ConsentStatusBadge label="Signed" type="obtained" />;
                        const allDeclined = row.domains.length > 0 && row.domains.every(d => d.consentStatus === 'DECLINED');
                        if (allDeclined) return <ConsentStatusBadge label="Declined" type="declined" />;
                      }
                      
                      if (row.processNote && row.processNote.trim() !== '') return <ConsentStatusBadge label="Presented" type="presented" />;
                      if (row.status === 'SIG_REQUESTED') return <ConsentStatusBadge label="Awaiting" type="awaiting" />;
                      if (row.status === 'SIG_PENDING') return <ConsentStatusBadge label="Presented" type="presented" />;
                    }
                    return <ConsentStatusBadge label="Draft" type="draft" />;
                  })()}
                </div>
              </div>
              {isCard && (
                <>
                  <div className="h-6 w-px bg-gray-200" />
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">
                      Outcome Date
                    </span>
                    <div className="flex items-center gap-2 text-gray-500">
                      <span className="text-xs font-medium">
                        {row.outcomeDate || '-'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Actions Column */}
            {/* Actions column removed per user request */}
          </div>

          {/* Associated Domains (Expanded) */}
          {isExpanded && row.isFirstOfEpisode && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Associated Domains</h4>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{displayDomains.length} Domains</span>
              </div>
              <div className="divide-y divide-gray-200 border-t border-gray-200">
                {displayDomains.map(domain => (
                  <div key={domain.id} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm text-gray-900">{domain.name}</span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-widest">ID: {domain.id}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Eligibility</span>
                        <div className="flex items-center">
                          {(() => {
                            if (domain.status === 'ELIGIBLE') return <ConsentStatusBadge label="Eligible" type="consented" />;
                            if (domain.status === 'EXPIRED') return <ConsentStatusBadge label="Expired" type="expired" />;
                            if (domain.status === 'IN_PROGRESS') return <ConsentStatusBadge label="In progress" type="in-progress" />;
                            if (domain.status === 'NOT_ELIGIBLE') return <ConsentStatusBadge label="Not eligible" type="declined" />;
                            return <ConsentStatusBadge label="Not assessed" type="not-started" />;
                          })()}
                        </div>
                      </div>
                      <div className="h-6 w-px bg-gray-200" />
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Expiry</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${
                            (isGroupExpired || domain.status === 'EXPIRED' || isGroupCloseToExpire) ? 'text-orange-600' : 'text-gray-700'
                          }`}>
                            {getExpiryDate(domain)}
                          </span>
                          {(isGroupExpired || domain.status === 'EXPIRED' || isGroupCloseToExpire) && <Icons.Clock className="w-3.5 h-3.5 text-orange-500 animate-pulse" />}
                        </div>
                      </div>
                      <div className="h-6 w-px bg-gray-200" />
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Consent</span>
                        <div className="flex items-center">
                          {(() => {
                            if (domain.consentStatus === 'OBTAINED' || domain.consentStatus === 'CONSENTED') return <ConsentStatusBadge label="Consented" type="consented" />;
                            if (domain.consentStatus === 'SIG_REQUESTED') return <ConsentStatusBadge label="Awaiting" type="awaiting" />;
                            if (domain.consentStatus === 'SIG_PENDING') return <ConsentStatusBadge label="In progress" type="in-progress" />;
                            if (domain.consentStatus === 'DECLINED') return <ConsentStatusBadge label="Declined" type="declined" />;
                            if (domain.status === 'EXPIRED') return <ConsentStatusBadge label="Expired" type="expired" />;
                            if (domain.consentStatus === 'WITHDRAWN') return <ConsentStatusBadge label="Withdrawn" type="withdrawn" />;
                            return <ConsentStatusBadge label="Not started" type="not-started" />;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="flex flex-col gap-4">
        {/* Latest Row Card */}
        {latestRow && (
          <div className="flex flex-col gap-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {renderRowContent(latestRow, true)}
            </div>
          </div>
        )}

        {/* History Table */}
        {historyRows.length > 0 && (
          <div className="flex flex-col gap-2 mt-2">
            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest px-2">History</h4>
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
              <div className="flex flex-col divide-y divide-gray-200">
                {historyRows.map(row => (
                  <div key={row.id} className="flex flex-col">
                    {renderRowContent(row, false)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
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
               icon = <Icons.AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />;
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

      {/* Tables grouped by episodes */}
      {groupedEpisodes.length === 0 ? (
        <div className="text-center py-10 text-gray-500 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="mb-4">No consent records found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedEpisodes.map((episode, idx) => {
            const episodeNumber = groupedEpisodes.length - idx;
            const isExpanded = expandedEpisodes[episode.id] !== undefined ? expandedEpisodes[episode.id] : idx === 0;
            const isHistoryShown = showHistory[episode.id] ?? false;
            const hasPendingSignaturesForEpisode = episode.rows.some((row: any) => 
              row.domains.some((d: any) => d.consentStatus === 'SIG_REQUESTED' || d.consentStatus === 'SIG_PENDING')
            );
            
            const latestRow = episode.rows[0];
            const isAwaitingConsent = latestRow.status === 'PENDING_CONSENT' || latestRow.status === 'AWAITING_CONSENT';
            const isOutcomeButtonDisabled = hasPendingSignaturesForEpisode || isAwaitingConsent;

            const latestRowHasProcessData = latestRow ? (
              latestRow.processDateTime || 
              (latestRow.siteSideSelections && latestRow.siteSideSelections.length > 0) || 
              (latestRow.otherTextEntries && latestRow.otherTextEntries.length > 0) ||
              latestRow.processNote
            ) : false;
            const isCompleted = latestRow.status === 'OBTAINED' || latestRow.status === 'DECLINED' || latestRow.status === 'WITHDRAWN' || latestRow.status === 'CONSENTED';
            const isActiveEpisode = !isCompleted && latestRow.isActive !== false;
            
            const hasProcessData = episode.originalRows.some((r: any) => 
              r.processDateTime || 
              (r.siteSideSelections && r.siteSideSelections.length > 0) || 
              (r.otherTextEntries && r.otherTextEntries.length > 0)
            );
            
            return (
              <React.Fragment key={episode.id}>
              {idx > 0 && <hr className="border-gray-200 my-8" />}
              <div className="space-y-4">
                <div className="px-2 flex items-center justify-between">
                  <div 
                    className="flex flex-col cursor-pointer flex-1"
                    onClick={() => setExpandedEpisodes(prev => ({ ...prev, [episode.id]: !isExpanded }))}
                  >
                    {customEpisodeNames?.[episode.id] ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Icons.ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                          <h2 className="text-xl font-serif text-gray-900">{customEpisodeNames[episode.id].name}</h2>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingEpisode({ id: episode.id, name: customEpisodeNames[episode.id].name, description: customEpisodeNames[episode.id].description || '' });
                            }}
                            className="p-1 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-all"
                            title="Edit episode name"
                          >
                            <Icons.Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {customEpisodeNames[episode.id].description && (
                          <p className="text-sm text-gray-500 mt-0.5 italic ml-7">{customEpisodeNames[episode.id].description}</p>
                        )}
                        {episode.rows[episode.rows.length - 1]?.date && (
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1 ml-7">
                            <span>Created on: {episode.rows[episode.rows.length - 1].date?.split(' ')[0]}</span>
                            {!isActiveEpisode && latestRow.date && (
                              <>
                                <span className="text-gray-300">&bull;</span>
                                <span className="text-red-600 font-medium flex items-center gap-1">Completed on {latestRow.date.split(' ')[0]}</span>
                              </>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <Icons.ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                          <h2 className="text-xl font-serif text-gray-900">Consent episode {episodeNumber}</h2>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingEpisode({ id: episode.id, name: '', description: '' });
                            }}
                            className="p-1 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-all"
                            title="Edit episode name"
                          >
                            <Icons.Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {episode.rows[episode.rows.length - 1]?.date && (
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1 ml-7">
                            <span>Created on: {episode.rows[episode.rows.length - 1].date?.split(' ')[0]}</span>
                            {!isActiveEpisode && latestRow.date && (
                              <>
                                <span className="text-gray-300">&bull;</span>
                                <span className="text-red-600 font-medium flex items-center gap-1">Completed on {latestRow.date.split(' ')[0]}</span>
                              </>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    {episode.originalRows.length > 1 && (
                      <div className="flex items-center gap-3 pr-6 border-r border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Show history</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowHistory(prev => ({ ...prev, [episode.id]: !isHistoryShown }));
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isHistoryShown ? 'bg-brand-600' : 'bg-gray-200'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isHistoryShown ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {isActiveEpisode ? (
                        <>
                          {latestRow.version !== 'Unknown' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRequestConsent?.();
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all uppercase tracking-wider bg-white border border-brand-600 text-brand-600 hover:bg-brand-50 shadow-sm active:scale-95"
                              >
                                <Icons.Plus className="w-3.5 h-3.5" />
                                New document
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddNote?.({ ...episode, isHistorical: false }, 'process');
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all uppercase tracking-wider bg-purple-600 border border-purple-600 text-white hover:bg-purple-700 shadow-sm active:scale-95"
                              >
                                <Icons.MessageSquare className="w-3.5 h-3.5" />
                                Update episode
                              </button>
                            </>
                          )}
                          {/* Episode outcome button hidden per user request */}
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddNote?.({ ...episode, isHistorical: true }, 'view');
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all uppercase tracking-wider bg-white border border-gray-200 text-gray-600 shadow-sm active:scale-95"
                        >
                          <Icons.Eye className="w-3.5 h-3.5" />
                          See Details
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    {renderConsentTable(episode.rows, episode, isActiveEpisode, isOutcomeButtonDisabled)}
                  </div>
                )}
              </div>
            </React.Fragment>
            );
          })}
        </div>
      )}

      <hr className="border-gray-200 mt-8 mb-6" />

      {/* Footer with actions */}
      <div className="flex justify-between items-center px-2">
         <div className="text-sm text-gray-500 flex items-center">
           Showing <span className="font-medium">{renderedRows.length}</span> documents
           <button 
             onClick={handleResetAlert}
             className="text-[10px] text-gray-400 hover:text-brand-600 underline ml-4 transition-colors"
           >
             Reset deactivation alerts
           </button>
         </div>
         
         <div className="text-center">
           {hasPendingSignatures && (
             <button 
               onClick={onSimulateSign}
               className="text-sm text-brand-600 hover:text-brand-700 font-medium bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-full transition-colors"
             >
               Simulate participant signature
             </button>
           )}
          </div>

           {/* Pagination controls */}
           <div className="flex items-center space-x-6 text-sm text-gray-500 justify-self-end">
             <div className="flex items-center">
               <span className="mr-2">Items per page:</span>
               <div className="relative">
                  <select className="appearance-none bg-transparent pr-6 focus:outline-none cursor-pointer">
                    <option>1</option>
                    <option>5</option>
                    <option>10</option>
                  </select>
                  <Icons.ChevronDown className="w-3 h-3 absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none" />
               </div>
             </div>
             <div>
               1-5 of 10
             </div>
             <div className="flex items-center space-x-4">
               <button className="hover:text-gray-900"><Icons.ChevronLeft className="w-4 h-4" /></button>
               <button className="hover:text-gray-900"><Icons.ChevronRight className="w-4 h-4" /></button>
             </div>
           </div>
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
                    placeholder="e.g. Initial Consultation"
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
    </div>
  );
};

export default ConsentView;
