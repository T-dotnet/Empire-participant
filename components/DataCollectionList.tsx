import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { Participant, Site } from '../types';

interface DataCollectionListProps {
  participants: Participant[];
  currentSite: Site;
  sites: Site[];
  onSiteChange: (siteId: string) => void;
  onFormClick: (form: any) => void;
}

const DataCollectionList: React.FC<DataCollectionListProps> = ({ 
  participants, 
  currentSite, 
  sites, 
  onSiteChange,
  onFormClick
}) => {
  const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false);
  
  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({
    Status: [],
    'Form Name': []
  });
  const [openFilterDropdown, setOpenFilterDropdown] = useState<string | null>(null);
  
  // Sorting & Grouping State
  // Default Sort: Due Date Descending (Most recent/Future first - e.g. Tomorrow, Today)
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'dueDate', direction: 'desc' });
  const [groupByParticipant, setGroupByParticipant] = useState(true); // Default to grouped view
  
  // Track expanded groups.
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const filterContainerRef = useRef<HTMLDivElement>(null);
  const siteDropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterContainerRef.current && !filterContainerRef.current.contains(event.target as Node)) {
        setOpenFilterDropdown(null);
      }
      if (siteDropdownRef.current && !siteDropdownRef.current.contains(event.target as Node)) {
        setIsSiteDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleGroup = (participantId: string) => {
    setExpandedGroups(prev => ({
        ...prev,
        [participantId]: !prev[participantId]
    }));
  };

  // Mock aggregated data derived from participants with templateIds mapping to FormModal
  const forms = [
    // Queries (Total queries: 2+1+3+1+5 = 12)
    { id: 'f-101', templateId: 'f5', participantId: '9JD3R', formName: 'Concomitant Medications', status: 'Query', dueDate: '24.09.2025', queryCount: 2, updatedBy: 'Dr. Sarah Chan' },
    { id: 'f-201', templateId: 'f4', participantId: 'K4L9P', formName: 'Labs (Baseline)', status: 'Query', dueDate: '26.09.2025', queryCount: 1, updatedBy: 'James Wilson' },
    { id: 'f-202', templateId: 'f2', participantId: 'X9A2B', formName: 'Baseline Assessment', status: 'Query', dueDate: '23.09.2025', queryCount: 3, updatedBy: 'Research Nurse' },
    { id: 'f-203', templateId: 'f1', participantId: 'B5T8N', formName: 'Demographics', status: 'Query', dueDate: '22.09.2025', queryCount: 1, updatedBy: 'Dr. Sarah Chan' },
    { id: 'f-204', templateId: 'f99', participantId: '9JD3R', formName: 'Adverse Events', status: 'Query', dueDate: 'Today', queryCount: 5, updatedBy: 'Safety Monitor' },

    // Overdue (Total: 5)
    { id: 'f-105', templateId: 'f2', participantId: 'M29QW', formName: 'Baseline Assessment', status: 'Overdue', dueDate: '20.09.2025', queryCount: 0, updatedBy: '-' },
    { id: 'f-301', templateId: 'f4', participantId: 'M29QW', formName: 'Labs (Baseline)', status: 'Overdue', dueDate: '20.09.2025', queryCount: 0, updatedBy: '-' },
    { id: 'f-302', templateId: 'f5', participantId: 'M29QW', formName: 'Concomitant Medications', status: 'Overdue', dueDate: '20.09.2025', queryCount: 0, updatedBy: '-' },
    { id: 'f-303', templateId: 'f1', participantId: 'V8N1X', formName: 'Demographics', status: 'Overdue', dueDate: '19.09.2025', queryCount: 0, updatedBy: '-' },
    { id: 'f-304', templateId: 'f2', participantId: '1CKEM', formName: 'Baseline Assessment', status: 'Overdue', dueDate: '21.09.2025', queryCount: 0, updatedBy: '-' },

    // In Progress (Sample set)
    { id: 'f-102', templateId: 'f4', participantId: 'X9A2B', formName: 'Labs (Baseline)', status: 'In Progress', dueDate: '25.09.2025', queryCount: 0, updatedBy: 'James Wilson' },
    { id: 'f-106', templateId: 'f99', participantId: 'K4L9P', formName: 'Adverse Events', status: 'In Progress', dueDate: 'Today', queryCount: 0, updatedBy: 'Dr. Sarah Chan' },
    { id: 'f-401', templateId: 'f5', participantId: 'X9A2B', formName: 'Concomitant Medications', status: 'In Progress', dueDate: '26.09.2025', queryCount: 0, updatedBy: 'James Wilson' },
    { id: 'f-402', templateId: 'f1', participantId: '1CKEM', formName: 'Demographics', status: 'In Progress', dueDate: '27.09.2025', queryCount: 0, updatedBy: 'Research Nurse' },
    { id: 'f-403', templateId: 'f2', participantId: 'K4L9P', formName: 'Daily Vitals', status: 'In Progress', dueDate: 'Today', queryCount: 0, updatedBy: 'Nurse Ratched' },
    { id: 'f-404', templateId: 'f4', participantId: 'B5T8N', formName: 'Labs (Day 1)', status: 'In Progress', dueDate: 'Tomorrow', queryCount: 0, updatedBy: 'Lab Tech' },
    { id: 'f-405', templateId: 'f99', participantId: '9JD3R', formName: 'Protocol Deviation', status: 'In Progress', dueDate: 'Today', queryCount: 0, updatedBy: 'CRA' },
    { id: 'f-406', templateId: 'f2', participantId: 'B5T8N', formName: 'Baseline Assessment', status: 'In Progress', dueDate: '26.09.2025', queryCount: 0, updatedBy: 'Research Nurse' },
    { id: 'f-407', templateId: 'f5', participantId: 'K4L9P', formName: 'Concomitant Medications', status: 'In Progress', dueDate: '28.09.2025', queryCount: 0, updatedBy: 'Dr. Sarah Chan' },
    { id: 'f-408', templateId: 'f1', participantId: 'X9A2B', formName: 'Demographics', status: 'In Progress', dueDate: '29.09.2025', queryCount: 0, updatedBy: 'Research Nurse' },

    // New (Not Started)
    { id: 'f-601', templateId: 'f1', participantId: '3M7ZQ', formName: 'Demographics', status: 'New', dueDate: '30.09.2025', queryCount: 0, updatedBy: '-' },
    { id: 'f-602', templateId: 'f2', participantId: '3M7ZQ', formName: 'Baseline Assessment', status: 'New', dueDate: '30.09.2025', queryCount: 0, updatedBy: '-' },
    { id: 'f-603', templateId: 'f4', participantId: '3M7ZQ', formName: 'Labs (Baseline)', status: 'New', dueDate: '30.09.2025', queryCount: 0, updatedBy: '-' },
    { id: 'f-604', templateId: 'f5', participantId: '7F4PL', formName: 'Follow-up Visit', status: 'New', dueDate: '05.10.2025', queryCount: 0, updatedBy: '-' },

    // Completed / Locked
    { id: 'f-103', templateId: 'f7', participantId: '9JD3R', formName: 'Randomisation', status: 'Locked', dueDate: '25.09.2025', queryCount: 0, updatedBy: 'System' },
    { id: 'f-104', templateId: 'f1', participantId: 'B5T8N', formName: 'Demographics', status: 'Completed', dueDate: '21.09.2025', queryCount: 0, updatedBy: 'Research Nurse' },
    { id: 'f-501', templateId: 'f1', participantId: '9JD3R', formName: 'Demographics', status: 'Completed', dueDate: '15.09.2025', queryCount: 0, updatedBy: 'Dr. Sarah Chan' },
    { id: 'f-502', templateId: 'f2', participantId: '9JD3R', formName: 'Baseline Assessment', status: 'Completed', dueDate: '15.09.2025', queryCount: 0, updatedBy: 'Dr. Sarah Chan' },
    { id: 'f-503', templateId: 'f4', participantId: '9JD3R', formName: 'Labs (Baseline)', status: 'Completed', dueDate: '15.09.2025', queryCount: 0, updatedBy: 'James Wilson' },
    { id: 'f-504', templateId: 'f1', participantId: 'K4L9P', formName: 'Demographics', status: 'Completed', dueDate: '18.09.2025', queryCount: 0, updatedBy: 'Research Nurse' },
    { id: 'f-505', templateId: 'f7', participantId: 'K4L9P', formName: 'Randomisation', status: 'Locked', dueDate: '20.09.2025', queryCount: 0, updatedBy: 'System' },
    { id: 'f-506', templateId: 'f1', participantId: '7F4PL', formName: 'Demographics', status: 'Completed', dueDate: '10.09.2025', queryCount: 0, updatedBy: 'Dr. Sarah Chan' },
    { id: 'f-507', templateId: 'f2', participantId: '7F4PL', formName: 'Baseline Assessment', status: 'Completed', dueDate: '11.09.2025', queryCount: 0, updatedBy: 'Dr. Sarah Chan' },
  ];

  const STATUS_OPTIONS = ['Query', 'Overdue', 'New', 'In Progress', 'Completed', 'Locked'];
  const FORM_NAME_OPTIONS = Array.from(new Set(forms.map(f => f.formName))).sort();

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
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedForms = useMemo(() => {
    let result = forms.filter(form => {
        const participant = participants.find(p => p.id === form.participantId);
        
        // Exclude forms if participant is not in the current list
        if (!participant) return false;

        const displayUid = participant.randomisedId ? participant.uid.replace('SCR', 'PAR') : participant.uid;
        const displayId = participant.randomisedId || participant.id;
        const fullId = `${displayUid}-${displayId}`;
        const q = searchQuery.toLowerCase();
        
        // Search
        const matchesSearch =
            form.formName.toLowerCase().includes(q) ||
            fullId.toLowerCase().includes(q) ||
            displayId.toLowerCase().includes(q) ||
            form.updatedBy.toLowerCase().includes(q) ||
            form.status.toLowerCase().includes(q);

        if (!matchesSearch) return false;

        // Status Filter
        if (activeFilters['Status'].length > 0 && !activeFilters['Status'].includes(form.status)) {
            return false;
        }

        // Form Name Filter
        if (activeFilters['Form Name'].length > 0 && !activeFilters['Form Name'].includes(form.formName)) {
            return false;
        }

        return true;
    });

    if (sortConfig !== null) {
      result.sort((a, b) => {
        if (sortConfig.key === 'participant') {
             const partA = participants.find(p => p.id === a.participantId);
             const partB = participants.find(p => p.id === b.participantId);
             
             const idA = partA ? (partA.randomisedId || partA.id) : a.participantId;
             const idB = partB ? (partB.randomisedId || partB.id) : b.participantId;
             
             if (idA < idB) return sortConfig.direction === 'asc' ? -1 : 1;
             if (idA > idB) return sortConfig.direction === 'asc' ? 1 : -1;
             return 0;
        }
        if (sortConfig.key === 'dueDate') {
            const parseDate = (d: string) => {
                // Fixed Reference Date: 25 Sep 2025
                const CURRENT_MOCK_YEAR = 2025;
                const CURRENT_MOCK_MONTH = 8; // Sep (0-indexed)
                const CURRENT_MOCK_DAY = 25;
                
                if (d === 'Tomorrow') return new Date(CURRENT_MOCK_YEAR, CURRENT_MOCK_MONTH, CURRENT_MOCK_DAY + 1).getTime();
                if (d === 'Today') return new Date(CURRENT_MOCK_YEAR, CURRENT_MOCK_MONTH, CURRENT_MOCK_DAY).getTime(); 
                const [day, month, year] = d.split('.').map(Number);
                return new Date(year, month - 1, day).getTime();
            };
            const dateA = parseDate(a.dueDate);
            const dateB = parseDate(b.dueDate);
            
             if (dateA < dateB) return sortConfig.direction === 'asc' ? -1 : 1;
             if (dateA > dateB) return sortConfig.direction === 'asc' ? 1 : -1;
             return 0;
        }
        if (sortConfig.key === 'status') {
            const indexA = STATUS_OPTIONS.indexOf(a.status);
            const indexB = STATUS_OPTIONS.indexOf(b.status);
            
            // If status not found, push to end
            const valA = indexA === -1 ? 999 : indexA;
            const valB = indexB === -1 ? 999 : indexB;

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
       }
        return 0;
      });
    }

    return result;
  }, [forms, searchQuery, activeFilters, participants, sortConfig]);

  const groupedForms = useMemo(() => {
    if (!groupByParticipant) return null;
    
    // Group by formName (as "episode")
    const groups: Record<string, typeof forms> = {};
    sortedForms.forEach(form => {
        if (!groups[form.formName]) groups[form.formName] = [];
        groups[form.formName].push(form);
    });
    
    return groups;
  }, [sortedForms, groupByParticipant]);

  const sortedGroupKeys = useMemo(() => {
      if (!groupedForms) return [];
      const keys = new Set<string>();
      sortedForms.forEach(f => keys.add(f.formName));
      return Array.from(keys).sort();
  }, [groupedForms, sortedForms]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'Locked': return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'In Progress': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'New': return 'bg-brand-50 text-brand-700 border-brand-200';
      case 'Query': return 'bg-red-50 text-red-700 border-red-200';
      case 'Overdue': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-0 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div className="relative" ref={siteDropdownRef}>
          <h1 
            className="text-3xl font-serif font-medium text-gray-900 flex items-center gap-2 cursor-pointer"
            onClick={() => setIsSiteDropdownOpen(!isSiteDropdownOpen)}
          >
            Data entry / {currentSite.name}
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
          <p className="text-sm text-gray-500 mt-1">Overview of eCRF progress and queries</p>
        </div>
        
        <div className="flex space-x-3">
             <button className="flex items-center px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:brand-700 shadow-sm">
                <Icons.Printer className="w-4 h-4 mr-2" />
                Report
             </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Open Queries</span>
                <Icons.AlertCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">12</div>
            <div className="text-xs text-red-600 mt-1 flex items-center">
                <span className="font-medium">+2</span>
                <span className="ml-1 text-gray-400">since yesterday</span>
            </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Overdue Forms</span>
                <Icons.Clock className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">5</div>
            <div className="text-xs text-orange-600 mt-1 flex items-center">
                <span className="font-medium">Action required</span>
            </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase">In Progress</span>
                <Icons.FileText className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">28</div>
             <div className="text-xs text-gray-400 mt-1 flex items-center">
                <span>Across all participants</span>
            </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Completion Rate</span>
                <Icons.CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">94%</div>
            <div className="text-xs text-green-600 mt-1 flex items-center">
                <Icons.ArrowUpDown className="w-3 h-3 mr-1 rotate-45" />
                <span>+1.2%</span>
            </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex flex-1 items-center gap-4 flex-wrap">
              <div ref={filterContainerRef} className="flex flex-wrap items-center gap-3 relative">
                {['Status', 'Form Name'].map((filter) => {
                  const isActive = activeFilters[filter]?.length > 0;
                  const isOpen = openFilterDropdown === filter;
                  
                  return (
                    <div key={filter} className="relative group/filter">
                      <button 
                        onClick={() => setOpenFilterDropdown(isOpen ? null : filter)}
                        className={`flex items-center px-4 py-2 border rounded-full text-sm whitespace-nowrap transition-colors
                          ${isActive || isOpen ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}
                        `}
                      >
                        {filter}
                        {isActive && (
                          <span className="ml-2 bg-brand-200 text-brand-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {activeFilters[filter].length}
                          </span>
                        )}
                        <Icons.ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''} ${isActive ? 'text-brand-500' : 'text-gray-400'}`} />
                      </button>

                      {/* Dropdown Menu */}
                      {isOpen && (
                        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-30 p-2">
                          <div className="flex flex-col max-h-80 overflow-y-auto custom-scrollbar p-1">
                              {(filter === 'Status' ? STATUS_OPTIONS : FORM_NAME_OPTIONS).map((option) => {
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
                                      {option}
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
              </div>

              {/* Group By Participant Toggle */}
              <div className="flex items-center space-x-2 border-l border-gray-200 pl-4 h-8">
                <button 
                    onClick={() => setGroupByParticipant(!groupByParticipant)}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${groupByParticipant ? 'bg-brand-600' : 'bg-gray-200'}`}
                >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${groupByParticipant ? 'translate-x-4' : 'translate-x-0'}`}></span>
                </button>
                <span className="text-sm text-gray-600">Group by participant</span>
            </div>
          </div>

          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icons.Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
              placeholder="Search forms, IDs..."
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
        <table className="min-w-full divide-y divide-gray-200">
            {/* Header is ONLY visible when NOT grouped by participant */}
            {!groupByParticipant && (
                <thead className="bg-gray-50">
                    <tr>
                        <th 
                            className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider cursor-pointer group"
                            onClick={() => handleSort('participant')}
                        >
                            <div className="flex items-center">
                                Participant
                                <Icons.ArrowUpDown className="w-3 h-3 ml-1 text-gray-400 group-hover:text-gray-600" />
                            </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Form Name</th>
                        <th 
                            className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider cursor-pointer group"
                            onClick={() => handleSort('status')}
                        >
                            <div className="flex items-center">
                                Status
                                <Icons.ArrowUpDown className="w-3 h-3 ml-1 text-gray-400 group-hover:text-gray-600" />
                            </div>
                        </th>
                        <th 
                            className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider cursor-pointer group"
                            onClick={() => handleSort('dueDate')}
                        >
                            <div className="flex items-center">
                                Due Date
                                <Icons.ArrowUpDown className="w-3 h-3 ml-1 text-gray-400 group-hover:text-gray-600" />
                            </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Queries</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Last Updated By</th>
                    </tr>
                </thead>
            )}
            <tbody className="bg-white divide-y divide-gray-200">
                {groupByParticipant && groupedForms ? (
                    // Grouped View (Grouped by formName as "episode")
                    sortedGroupKeys.map(formName => {
                        const episodeForms = groupedForms[formName];
                        
                        // Calculate status counts
                        const statusCounts = episodeForms.reduce((acc, form) => {
                            const s = form.status; 
                            if (acc[s] !== undefined) acc[s]++;
                            return acc;
                        }, { 'Query': 0, 'Overdue': 0, 'New': 0, 'In Progress': 0, 'Completed': 0, 'Locked': 0 } as Record<string, number>);
                        
                        const isExpanded = expandedGroups[formName];

                        return (
                            <React.Fragment key={formName}>
                                {/* Group Header Row (Episode) */}
                                <tr 
                                    className="bg-white border-b border-gray-100 hover:bg-gray-50 transition-all cursor-pointer group"
                                    onClick={() => toggleGroup(formName)}
                                >
                                    <td colSpan={6} className="px-6 py-4">
                                        <div className="flex items-center justify-between">
                                            {/* Left Group */}
                                            <div className="flex items-center gap-4">
                                                <button 
                                                    className={`p-2 rounded-lg transition-all duration-200 ${
                                                        !isExpanded ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-brand-100 text-brand-600'
                                                    }`}
                                                >
                                                    <Icons.ChevronDown className={`w-4 h-4 transition-transform duration-200 ${!isExpanded ? '-rotate-90' : ''}`} />
                                                </button>
                                                
                                                <div className="flex items-center gap-3">
                                                     <div className="flex flex-col">
                                                        <div className="font-bold text-base text-gray-900">{formName}</div>
                                                     </div>
                                                </div>
                                            </div>

                                            {/* Right Group */}
                                            <div className="flex items-center gap-8">
                                                 <div className="flex items-center gap-2 px-6 border-l border-r border-gray-100">
                                                    {/* Status Bubbles */}
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ring-2 ring-white transition-colors ${statusCounts['Query'] > 0 ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-400'}`} title="Queries">
                                                        {statusCounts['Query']}
                                                    </div>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ring-2 ring-white transition-colors ${statusCounts['Overdue'] > 0 ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-gray-100 text-gray-400'}`} title="Overdue">
                                                        {statusCounts['Overdue']}
                                                    </div>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ring-2 ring-white transition-colors ${statusCounts['New'] > 0 ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'}`} title="New">
                                                        {statusCounts['New']}
                                                    </div>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ring-2 ring-white transition-colors ${statusCounts['In Progress'] > 0 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}`} title="In Progress">
                                                        {statusCounts['In Progress']}
                                                    </div>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ring-2 ring-white transition-colors ${statusCounts['Completed'] > 0 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`} title="Completed">
                                                        {statusCounts['Completed']}
                                                    </div>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ring-2 ring-white transition-colors ${statusCounts['Locked'] > 0 ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-400'}`} title="Locked">
                                                        {statusCounts['Locked']}
                                                    </div>
                                                 </div>

                                                 <div className="text-center min-w-[3rem]">
                                                    <span className="block text-xl font-bold text-gray-900 leading-none">{episodeForms.length}</span>
                                                    <span className="text-[10px] text-gray-400 uppercase font-bold">Docs</span>
                                                 </div>
                                                 
                                                 <div className="text-gray-300">
                                                    <Icons.FileText className="w-5 h-5" />
                                                 </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                                {/* Form Rows - Render only if EXPANDED */}
                                {isExpanded && (
                                    <>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider pl-10">Participant</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Queries</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated By</th>
                                            <th className="hidden"></th>
                                        </tr>
                                        {episodeForms.map(form => {
                                            const participant = participants.find(p => p.id === form.participantId);
                                            const displayUid = participant?.randomisedId ? participant.uid.replace('SCR', 'PAR') : participant?.uid;
                                            const displayId = participant?.randomisedId || form.participantId;
                                            const fullParticipantId = participant ? `${displayUid}-${displayId}` : form.participantId;

                                            return (
                                                <tr 
                                                    key={form.id} 
                                                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                                                    onClick={() => onFormClick({ ...form, participantId: fullParticipantId })}
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium pl-10 border-l-4 border-l-transparent hover:border-l-brand-200">
                                                        {fullParticipantId}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getStatusColor(form.status)}`}>
                                                            {form.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {form.dueDate}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {form.status === 'Query' ? (
                                                            <div className="flex items-center text-red-600 text-xs font-bold">
                                                                <Icons.AlertCircle className="w-4 h-4 mr-1.5" />
                                                                {form.queryCount} Open
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 text-sm">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {form.updatedBy}
                                                    </td>
                                                    <td className="hidden"></td> 
                                                </tr>
                                            );
                                        })}
                                    </>
                                )}
                            </React.Fragment>
                        );
                    })
                ) : (
                    // Standard Flat View
                    sortedForms.map(form => {
                        const participant = participants.find(p => p.id === form.participantId);
                        const displayUid = participant?.randomisedId ? participant.uid.replace('SCR', 'PAR') : participant?.uid;
                        const displayId = participant?.randomisedId || participant?.id || form.participantId;
                        const fullParticipantId = participant ? `${displayUid}-${displayId}` : form.participantId;
                        
                        return (
                            <tr 
                                key={form.id} 
                                className="hover:bg-gray-50 cursor-pointer transition-colors"
                                onClick={() => onFormClick({ ...form, participantId: fullParticipantId })}
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div>
                                            <div className={`text-xs mb-0.5 ${participant?.randomisedId ? 'text-brand-600 font-semibold' : 'text-gray-500'}`}>{displayUid}</div>
                                            <div className={`font-bold ${participant?.randomisedId ? 'text-lg text-brand-900' : 'text-base text-gray-900'}`}>{displayId}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                                    {form.formName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getStatusColor(form.status)}`}>
                                        {form.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {form.dueDate}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {form.status === 'Query' ? (
                                        <div className="flex items-center text-red-600 text-xs font-bold">
                                            <Icons.AlertCircle className="w-4 h-4 mr-1.5" />
                                            {form.queryCount} Open
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 text-sm">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {form.updatedBy}
                                </td>
                            </tr>
                        );
                    })
                )}

                {sortedForms.length === 0 && (
                    <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                            <div className="flex flex-col items-center justify-center">
                                <p className="mb-2">No forms found matching your criteria.</p>
                                <button 
                                    onClick={() => {
                                        setSearchQuery('');
                                        setActiveFilters({ Status: [], 'Form Name': [] });
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
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-sm text-gray-500">
            <span>Showing {sortedForms.length} forms</span>
            <div className="flex space-x-2">
                <button className="hover:text-gray-900"><Icons.ChevronLeft className="w-4 h-4" /></button>
                <button className="hover:text-gray-900"><Icons.ChevronRight className="w-4 h-4" /></button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DataCollectionList;