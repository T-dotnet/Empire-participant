import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { Participant, Site, ParticipantAlert, DomainState, STATE_DOMAIN_MAPPING } from '../types';
import AddParticipantModal, { AddParticipantFormData } from './AddParticipantModal';

interface ParticipantListProps {
  participants: Participant[];
  onSelectParticipant: (participant: Participant) => void;
  onAddParticipant: (data: AddParticipantFormData) => void;
  sites: Site[];
  currentSite: Site;
  onSiteChange: (siteId: string) => void;
  showNewDomain: boolean;
  onToggleNewDomain: () => void;
  visibleDomains: string[];
  onToggleVisibleDomain: (domainId: string) => void;
}

type SortDirection = 'asc' | 'desc';
interface SortConfig {
  key: string;
  direction: SortDirection;
}

const FILTER_OPTIONS = {
  Status: [
    'New',
    'In progress',
    'Assessment completed',
    'Not started', 
    'Eligible to randomise', 
    'Consented',
    'Randomised', 
    'Not eligible',
    'Eligibility expired',
    'Withdrawn',
    'Consent declined'
  ],
  Eligibility: ['ELIGIBLE', 'NOT_ELIGIBLE', 'IN_PROGRESS', 'NOT_ASSESSED'],
  Consent: ['OBTAINED', 'DECLINED', 'PENDING_CONSENT', 'SIG_REQUESTED', 'SIG_PENDING', 'WITHDRAWN', 'NOT_APPLICABLE'],
  Randomisation: ['RANDOMISED', 'READY', 'NOT_READY'],
};

const ParticipantList: React.FC<ParticipantListProps> = ({ 
  participants, 
  onSelectParticipant, 
  onAddParticipant, 
  sites, 
  currentSite, 
  onSiteChange,
  showNewDomain,
  onToggleNewDomain,
  visibleDomains,
  onToggleVisibleDomain
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false);
  const siteDropdownRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({
    Status: [],
    Eligibility: [],
    Consent: [],
    Randomisation: [],
  });
  const [openFilterDropdown, setOpenFilterDropdown] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'lastUpdated', direction: 'desc' });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const [isDomainView, setIsDomainView] = useState(true);

  // New state for domain visibility
  const [isDomainDropdownOpen, setIsDomainDropdownOpen] = useState(false);
  const domainDropdownRef = useRef<HTMLDivElement>(null);

  const filterContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterContainerRef.current && !filterContainerRef.current.contains(event.target as Node)) {
        setOpenFilterDropdown(null);
      }
      if (siteDropdownRef.current && !siteDropdownRef.current.contains(event.target as Node)) {
        setIsSiteDropdownOpen(false);
      }
      if (domainDropdownRef.current && !domainDropdownRef.current.contains(event.target as Node)) {
        setIsDomainDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute all available domains based on props
  const availableDomains = useMemo(() => {
    return ['antibiotics', 'anticoagulation', 'statins', 'vasopressors'];
  }, []);

  // Only use visible domains for rendering columns
  const domainKeys = useMemo(() => {
     return availableDomains.filter(d => visibleDomains.includes(d));
  }, [availableDomains, visibleDomains]);

  const domainLabels: Record<string, string> = {
    antibiotics: 'A',
    anticoagulation: 'AC',
    statins: 'S',
    vasopressors: 'V'
  };
  const domainNames: Record<string, string> = {
    antibiotics: 'Antibiotics',
    anticoagulation: 'Anticoagulation',
    statins: 'Statins',
    vasopressors: 'Vasopressors'
  };

  const toggleFilter = (category: string, value: string) => {
    setActiveFilters(prev => {
      const current = prev[category] || [];
      const updated = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      
      return { ...prev, [category]: updated };
    });
  };

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const filteredParticipants = useMemo(() => {
    let result = [...participants];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => {
        const dUid = p.randomisedId ? p.uid.replace('SCR', 'PAR') : p.uid;
        const dId = p.randomisedId || p.id;
        const fullId = `${dUid}-${dId}`;
        return dId.toLowerCase().includes(q) || 
               dUid.toLowerCase().includes(q) ||
               fullId.toLowerCase().includes(q) ||
               p.status.toLowerCase().includes(q);
      });
    }

    Object.entries(activeFilters).forEach(([category, values]) => {
      const selectedValues = values as string[];
      if (selectedValues.length === 0) return;

      if (category === 'Status') {
        result = result.filter(p => {
          return selectedValues.includes(p.status);
        });
      } else {
        result = result.filter(p => {
          return availableDomains.some(key => {
            const domain = p.domains[key];
            if (!domain) return false;
            
            let statusToCheck = '';
            if (category === 'Eligibility') statusToCheck = domain.eligibility;
            else if (category === 'Consent') statusToCheck = domain.consent;
            else if (category === 'Randomisation') statusToCheck = domain.randomisation;
            
            return selectedValues.includes(statusToCheck);
          });
        });
      }
    });

    result.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortConfig.key === 'participant') {
        valA = a.randomisedId || a.id;
        valB = b.randomisedId || b.id;
      } else if (sortConfig.key === 'lastUpdated') {
        const parseDate = (d: string) => {
          const parts = d.split('.');
          return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
        };
        valA = parseDate(a.lastUpdated);
        valB = parseDate(b.lastUpdated);
      } else if (sortConfig.key === 'status') {
        valA = FILTER_OPTIONS.Status.indexOf(a.status);
        valB = FILTER_OPTIONS.Status.indexOf(b.status);

        if (valA === -1) valA = 999;
        if (valB === -1) valB = 999;
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [participants, searchQuery, activeFilters, sortConfig, availableDomains]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilters, rowsPerPage]);

  const totalItems = filteredParticipants.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const paginatedParticipants = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredParticipants.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredParticipants, currentPage, rowsPerPage]);

  const renderAlertIcon = (alerts: ParticipantAlert[]) => {
    if (!alerts || alerts.length === 0) return null;

    const critical = alerts.find(a => a.level === 'critical');
    const warning = alerts.find(a => a.level === 'warning');
    const info = alerts.find(a => a.level === 'info');

    const activeAlert = critical || warning || info;
    if (!activeAlert) return null;

    let icon = <Icons.Info className="w-4 h-4 text-blue-500" />;
    let bgClass = "bg-blue-50";
    let iconClass = "text-blue-600";
    let borderClass = "border-blue-200";

    if (activeAlert.level === 'critical') {
      icon = <Icons.AlertCircle className="w-4 h-4 text-red-600" />;
      bgClass = "bg-red-50";
      iconClass = "text-red-600";
      borderClass = "border-red-200";
    } else if (activeAlert.level === 'warning') {
      icon = <Icons.Clock className="w-4 h-4 text-amber-600" />;
      bgClass = "bg-amber-50";
      iconClass = "text-amber-600";
      borderClass = "border-amber-200";
    }

    return (
      <div className="relative group/tooltip ml-3 flex-shrink-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${bgClass} ${borderClass} ${iconClass}`}>
          {icon}
        </div>
        <div className="absolute bottom-full left-0 mb-2 hidden group-hover/tooltip:block z-[60]">
            <div className="bg-gray-900 text-white text-xs py-3 px-4 rounded-lg shadow-xl relative w-72 whitespace-normal text-left">
              <p className="font-bold mb-1 text-sm">{activeAlert.title}</p>
              <p className="text-gray-200 leading-relaxed">{activeAlert.description}</p>
              <div className="absolute top-full left-4 -ml-1 border-4 border-transparent border-t-gray-900"></div>
            </div>
        </div>
      </div>
    );
  };

  const renderMiniBadge = (label: string, status: string, type: 'E' | 'C' | 'R', domainName?: string, eligibilityStatus?: string) => {
    let badgeClass = 'bg-gray-100 text-gray-400 border-gray-200';

    if (type === 'E') {
      if (status === 'EXPIRED') {
          badgeClass = 'bg-orange-100 text-orange-700 border-orange-200';
      } else if (status === 'ELIGIBLE') {
          badgeClass = 'bg-green-100 text-green-700 border-green-200';
      } else if (status === 'COMPLETED') {
          badgeClass = 'bg-green-100 text-green-800 border-green-300';
      } else if (status === 'NOT_ELIGIBLE') {
          badgeClass = 'bg-red-100 text-red-700 border-red-200';
      } else if (status === 'IN_PROGRESS') {
          badgeClass = 'bg-blue-100 text-blue-700 border-blue-200';
      } else if (status === 'NOT_COMPLETED') {
          badgeClass = 'bg-yellow-100 text-yellow-700 border-yellow-200';
      }
    } else if (type === 'C') {
      if (eligibilityStatus === 'NOT_ELIGIBLE') {
         badgeClass = 'bg-red-100 text-red-700 border-red-200';
      } else if ((status === 'PENDING_CONSENT' || status === 'SIG_REQUESTED' || status === 'SIG_PENDING' || status === 'AWAITING_CONSENT') && eligibilityStatus === 'EXPIRED') {
        badgeClass = 'bg-orange-100 text-orange-700 border-orange-200';
      } else if (status === 'OBTAINED') {
        badgeClass = 'bg-green-100 text-green-700 border-green-200';
      } else if (status === 'DECLINED') {
        badgeClass = 'bg-red-100 text-red-700 border-red-200';
      } else if (status === 'PENDING_CONSENT') {
         badgeClass = 'bg-gray-100 text-gray-600 border-gray-300';
      } else if (status === 'SIG_REQUESTED') {
        badgeClass = 'bg-amber-100 text-amber-700 border-amber-200';
      } else if (status === 'SIG_PENDING') {
        badgeClass = 'bg-blue-100 text-blue-700 border-blue-200';
      } else if (status === 'WITHDRAWN') {
        badgeClass = 'bg-gray-100 text-gray-600 border-gray-200';
      }
    } else if (type === 'R') {
      if (eligibilityStatus === 'NOT_ELIGIBLE') {
         badgeClass = 'bg-red-100 text-red-700 border-red-200';
      } else if (status === 'RANDOMISED') {
        badgeClass = 'bg-green-100 text-green-700 border-green-200';
      }
    }

    let statusText = status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
    if (status === 'SIG_PENDING') {
      statusText = 'In progress';
    } else if (status === 'SIG_REQUESTED') {
      statusText = 'Awaiting consent';
    }
    let finalTooltip = (status === 'EXPIRED' || (type === 'C' && (status === 'PENDING_CONSENT' || status === 'SIG_REQUESTED') && eligibilityStatus === 'EXPIRED')) ? 'Eligibility expired' : statusText;

    if ((type === 'C' || type === 'R') && eligibilityStatus === 'NOT_ELIGIBLE') {
        finalTooltip = 'Not eligible';
    }

    if (domainName) {
      finalTooltip = `${domainName}: ${finalTooltip}`;
    }

    return (
      <div key={`${label}-${type}-${Math.random()}`} className="relative group/tooltip flex items-center justify-center">
        <div className={`
          w-6 h-6 rounded text-[10px] font-bold border flex items-center justify-center cursor-default
          ${badgeClass}
        `}>
          {label}
        </div>
        
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover/tooltip:block z-50 whitespace-nowrap">
          <div className="bg-black text-white text-[10px] py-1 px-2 rounded shadow-lg relative">
            {finalTooltip}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div className="relative" ref={siteDropdownRef}>
            <h1 
              className="text-3xl font-serif font-medium text-gray-900 flex items-center gap-2 cursor-pointer"
              onClick={() => setIsSiteDropdownOpen(!isSiteDropdownOpen)}
            >
              Enrolment / {currentSite.name}
              <button className="p-1 rounded-full hover:bg-gray-100 text-gray-400">
                <Icons.ChevronDown className={`w-5 h-5 transition-transform ${isSiteDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </h1>
            {isSiteDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-40 p-2">
                {sites.map(site => (
                  <button
                    key={site.id}
                    onClick={() => {
                      onSiteChange(site.id);
                      setIsSiteDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between ${currentSite.id === site.id ? 'bg-brand-50 text-brand-700' : 'hover:bg-gray-50'}`}
                  >
                    <span>{site.name}</span>
                    {currentSite.id === site.id && <Icons.Check className="w-4 h-4 text-brand-600" />}
                  </button>
                ))}
              </div>
            )}
            <p className="text-sm text-gray-500 mt-1">Last update 25.09.2025 14:30</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 md:mt-0 px-6 py-2.5 bg-brand-600 text-white rounded-full font-medium text-sm hover:bg-brand-700 shadow-sm hover:shadow-md transition-all flex items-center"
          >
            Add participant
            <Icons.Check className="w-4 h-4 ml-2" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div ref={filterContainerRef} className="flex flex-wrap items-center gap-2 relative flex-grow">
            {['Status', 'Eligibility', 'Consent', 'Randomisation'].map((filter) => {
              const isActive = activeFilters[filter]?.length > 0;
              const isOpen = openFilterDropdown === filter;

              return (
                <div key={filter} className="relative group/filter">
                  <button 
                    onClick={() => setOpenFilterDropdown(isOpen ? null : filter)}
                    className={`flex items-center px-3 py-1.5 border rounded-full text-xs whitespace-nowrap transition-colors
                      ${isActive || isOpen ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}
                    `}
                  >
                    {filter}
                    {isActive && (
                      <span className="ml-1.5 bg-brand-200 text-brand-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        {activeFilters[filter].length}
                      </span>
                    )}
                    <Icons.ChevronDown className={`w-3.5 h-3.5 ml-1.5 transition-transform ${isOpen ? 'rotate-180' : ''} ${isActive ? 'text-brand-500' : 'text-gray-400'}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {isOpen && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-30 p-2">
                      <div className="flex flex-col max-h-80 overflow-y-auto custom-scrollbar p-1">
                        {(FILTER_OPTIONS as any)[filter]?.map((option: string) => {
                          const isChecked = activeFilters[filter]?.includes(option);
                          return (
                            <div
                              key={option}
                              onClick={() => toggleFilter(filter, option)}
                              className="flex items-center px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer w-full group"
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 flex-shrink-0 transition-colors ${isChecked ? 'bg-brand-600 border-brand-600' : 'bg-white border-gray-300 group-hover:border-gray-400'}`}>
                                {isChecked && <Icons.Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                              </div>
                              <span className="text-sm text-gray-700 select-none">
                                {option.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {activeFilters[filter]?.length > 0 && (
                        <div className="border-t border-gray-100 mt-2 pt-2 px-1">
                          <button
                            onClick={() => setActiveFilters(prev => ({ ...prev, [filter]: [] }))}
                            className="w-full text-left px-3 py-1 text-xs text-gray-500 hover:text-gray-700 font-medium rounded-md hover:bg-gray-50"
                          >
                            Clear selection
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            
            <div className="h-6 w-px bg-gray-200 mx-2 hidden md:block"></div>

            {/* Domains Filter */}
            <div className="relative" ref={domainDropdownRef}>
                 <button 
                    onClick={() => setIsDomainDropdownOpen(!isDomainDropdownOpen)}
                    className={`flex items-center px-3 py-1.5 border rounded-full text-xs whitespace-nowrap transition-colors
                      ${isDomainDropdownOpen || visibleDomains.length !== availableDomains.length ? 'bg-gray-50 border-gray-300 text-gray-900' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}
                    `}
                 >
                    <Icons.Columns className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                    Domains
                    <Icons.ChevronDown className={`w-3.5 h-3.5 ml-1.5 transition-transform ${isDomainDropdownOpen ? 'rotate-180' : ''}`} />
                 </button>
                 
                 {isDomainDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-30 p-2">
                         <div className="px-3 py-2 border-b border-gray-100 mb-1">
                             <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Visible Domains</h4>
                         </div>
                         <div className="flex flex-col max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {availableDomains.map(domain => {
                                const isChecked = visibleDomains.includes(domain);
                                return (
                                    <div
                                        key={domain}
                                        onClick={() => onToggleVisibleDomain(domain)}
                                        className="flex items-center px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer w-full group"
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 flex-shrink-0 transition-colors ${isChecked ? 'bg-brand-600 border-brand-600' : 'bg-white border-gray-300 group-hover:border-gray-400'}`}>
                                            {isChecked && <Icons.Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                                        </div>
                                        <span className="text-sm text-gray-700 select-none">
                                            {domainNames[domain]}
                                        </span>
                                    </div>
                                );
                            })}
                         </div>
                    </div>
                 )}
            </div>
            
            <div className="h-6 w-px bg-gray-200 mx-1 hidden lg:block"></div>

            <div className="flex items-center gap-2 ml-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Group by domain</span>
              <button
                onClick={() => setIsDomainView(!isDomainView)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isDomainView ? 'bg-brand-600' : 'bg-gray-300'}`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isDomainView ? 'translate-x-5' : 'translate-x-1'}`}
                />
              </button>
            </div>
          </div>

          <div className="relative w-full lg:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icons.Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-sm"
              placeholder="Search ID, UID, Status"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-gray-400 hover:text-gray-600"
              >
                <Icons.X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    scope="col" 
                    className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider cursor-pointer group"
                    onClick={() => handleSort('participant')}
                  >
                    <div className="flex items-center">
                      Participant
                      <Icons.ArrowUpDown className="w-3 h-3 ml-1 text-gray-400 group-hover:text-gray-600" />
                    </div>
                  </th>

                  {isDomainView ? (
                    // Domain View Columns
                    <>
                      {domainKeys.map(key => (
                        <th key={key} scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                          <div className="flex items-center">
                            {domainNames[key]}
                          </div>
                        </th>
                      ))}
                      <th 
                        scope="col" 
                        className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider cursor-pointer group"
                        onClick={() => handleSort('lastUpdated')}
                      >
                        <div className="flex items-center">
                          Last Updated
                          <Icons.ArrowUpDown className="w-3 h-3 ml-1 text-gray-400 group-hover:text-gray-600" />
                        </div>
                      </th>
                    </>
                  ) : (
                    // Type View Columns (Default)
                    <>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Eligibility
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Consent
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Randomisation
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider cursor-pointer group"
                        onClick={() => handleSort('lastUpdated')}
                      >
                        <div className="flex items-center">
                          Last Updated
                          <Icons.ArrowUpDown className="w-3 h-3 ml-1 text-gray-400 group-hover:text-gray-600" />
                        </div>
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedParticipants.map((participant) => {
                  const displayUid = participant.randomisedId ? participant.uid.replace('SCR', 'PAR') : participant.uid;
                  const displayId = participant.randomisedId || participant.id;

                  return (
                  <tr 
                    key={participant.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                    onClick={() => onSelectParticipant(participant)}
                  >
                    {/* Participant Cell (Always first) */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <div className={`text-xs ${participant.randomisedId ? 'text-brand-600 font-semibold' : 'text-gray-500'}`}>{displayUid}</div>
                            </div>
                            <div className={`font-bold ${participant.randomisedId ? 'text-lg text-brand-900' : 'text-base text-gray-900'}`}>{displayId}</div>
                          </div>
                        </div>

                        {renderAlertIcon(participant.activeAlerts)}

                      </div>
                    </td>

                    {isDomainView ? (
                      // Domain View Cells
                      <>
                        {domainKeys.map(key => {
                          const domain = participant.domains[key];
                          const sarsStatus = participant.domains['platform']?.stateDetails?.split(',')[0].trim() || '';
                          const allowedDomains = (STATE_DOMAIN_MAPPING as any)[sarsStatus] || [];
                          const isAllowed = allowedDomains.includes(key);

                          if (!domain) return <td key={key} className="px-6 py-4 whitespace-nowrap text-gray-300 text-xs">-</td>;
                          return (
                            <td key={key} className="px-6 py-4 whitespace-nowrap">
                               <div className="flex items-center gap-1.5">
                                 {/* Badges for E, C, R within this specific domain */}
                                 {renderMiniBadge('E', domain.eligibility, 'E', domainNames[key])}
                                 {renderMiniBadge('C', domain.consent, 'C', domainNames[key], domain.eligibility)}
                                 {renderMiniBadge('R', domain.randomisation, 'R', domainNames[key], domain.eligibility)}
                               </div>
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex flex-col">
                            <span className="text-gray-900 font-medium">{participant.status}</span>
                            <span className="text-xs text-gray-400">{participant.lastUpdated}</span>
                          </div>
                        </td>
                      </>
                    ) : (
                      // Type View Cells (Default)
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                           <div className="flex items-center gap-1.5">
                             {domainKeys.map(key => {
                               const domain = participant.domains[key];
                               const sarsStatus = participant.domains['platform']?.stateDetails?.split(',')[0].trim() || '';
                               const allowedDomains = (STATE_DOMAIN_MAPPING as any)[sarsStatus] || [];
                               const isAllowed = allowedDomains.includes(key);
                               return domain ? (
                                 <div key={key}>
                                   {renderMiniBadge(domainLabels[key], domain.eligibility, 'E', domainNames[key])}
                                 </div>
                               ) : null;
                             })}
                           </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                           <div className="flex items-center gap-1.5">
                             {domainKeys.map(key => {
                               const domain = participant.domains[key];
                               const sarsStatus = participant.domains['platform']?.stateDetails?.split(',')[0].trim() || '';
                               const allowedDomains = (STATE_DOMAIN_MAPPING as any)[sarsStatus] || [];
                               const isAllowed = allowedDomains.includes(key);
                               return domain ? (
                                 <div key={key}>
                                   {renderMiniBadge(domainLabels[key], domain.consent, 'C', domainNames[key], domain.eligibility)}
                                 </div>
                               ) : null;
                             })}
                           </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                           <div className="flex items-center gap-1.5">
                             {domainKeys.map(key => {
                               const domain = participant.domains[key];
                               const sarsStatus = participant.domains['platform']?.stateDetails?.split(',')[0].trim() || '';
                               const allowedDomains = (STATE_DOMAIN_MAPPING as any)[sarsStatus] || [];
                               const isAllowed = allowedDomains.includes(key);
                               return domain ? (
                                 <div key={key}>
                                   {renderMiniBadge(domainLabels[key], domain.randomisation, 'R', domainNames[key], domain.eligibility)}
                                 </div>
                               ) : null;
                             })}
                           </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex flex-col">
                            <span className="text-gray-900 font-medium">{participant.status}</span>
                            <span className="text-xs text-gray-400">{participant.lastUpdated}</span>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
                })}
                {paginatedParticipants.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-6 py-10 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <p className="mb-2">No participants found matching your criteria.</p>
                        <button 
                          onClick={() => {
                            setSearchQuery('');
                            setActiveFilters({
                              Status: [],
                              Eligibility: [],
                              Consent: [],
                              Randomisation: [],
                            });
                          }}
                          className="text-xs font-medium text-brand-600 hover:text-brand-800 hover:underline"
                        >
                          Clear all filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer / Pagination */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing <span className="font-medium">{paginatedParticipants.length}</span> of <span className="font-medium">{totalItems}</span> results
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-500">
               <div className="flex items-center">
                 <span className="mr-2">Rows per page:</span>
                 <div className="relative">
                    <select
                      value={rowsPerPage}
                      onChange={e => setRowsPerPage(Number(e.target.value))}
                      className="appearance-none bg-transparent pr-6 focus:outline-none cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                    <Icons.ChevronDown className="w-3 h-3 absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                 </div>
               </div>
               <div>
                  {totalItems > 0 ? `${(currentPage - 1) * rowsPerPage + 1}-${Math.min(currentPage * rowsPerPage, totalItems)}` : '0'} of {totalItems}
               </div>
               <div className="flex items-center space-x-4">
                 <button 
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed" 
                  disabled={currentPage === 1}
                 >
                   <Icons.ChevronLeft className="w-4 h-4" />
                 </button>
                 <button 
                   onClick={() => setCurrentPage(p => p + 1)}
                   className="hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed" 
                   disabled={currentPage >= totalPages}
                 >
                   <Icons.ChevronRight className="w-4 h-4" />
                  </button>
               </div>
             </div>
          </div>
        </div>

        {/* Simulation Toggle removed */}
      </div>

      <AddParticipantModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={(data) => {
          onAddParticipant(data);
          setIsAddModalOpen(false);
        }}
        currentSite={currentSite}
      />
    </>
  );
};

export default ParticipantList;