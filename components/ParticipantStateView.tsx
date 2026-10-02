import React, { useState } from 'react';
import { Icons } from './Icons';
import { EligibilityDomain, ParticipantAlert } from '../types';
import { FormModal } from './FormModal';

interface ParticipantStateViewProps {
  domains: EligibilityDomain[];
  onRandomise?: (domainId: string) => void;
  alerts?: ParticipantAlert[];
  onUpdateDomain?: (id: string, updates: Partial<EligibilityDomain>) => void;
}

interface Change {
  field: string;
  from?: string;
  to: string;
}

interface HistoryItem {
  id: string;
  date: string;
  time: string;
  user: string;
  role: string;
  domainId: string;
  type: 'create' | 'update';
  details?: string;
  changes?: Change[];
}

// Mock history data linked by domainId
const MOCK_HISTORY_DATA: HistoryItem[] = [
    {
        id: 'h1',
        date: '25.09.2025',
        time: '14:30',
        user: 'Dr. Sarah Chan',
        role: 'PI',
        domainId: 'respiratory', 
        type: 'update',
        details: 'Clinical assessment update',
        changes: [
            { field: 'COPD Status', from: 'Unknown', to: 'No' },
            { field: 'FEV1 Strata', to: '75-100%' }
        ]
    },
    {
        id: 'h2',
        date: '24.09.2025',
        time: '11:00',
        user: 'Dr. Sarah Chan',
        role: 'PI',
        domainId: 'respiratory',
        type: 'create',
        details: 'Initial assessment started.'
    },
    {
        id: 'h3',
        date: '24.09.2025',
        time: '09:15',
        user: 'James Wilson',
        role: 'Research Nurse',
        domainId: 'antibiotics',
        type: 'create',
        details: 'Initial assessment completed. Eligibility status set to ELIGIBLE.'
    },
    {
        id: 'h3b',
        date: '24.09.2025',
        time: '09:10',
        user: 'James Wilson',
        role: 'Research Nurse',
        domainId: 'antibiotics',
        type: 'update',
        details: 'Correction of severity',
        changes: [
            { field: 'Sepsis Severity', from: 'Mild', to: 'Moderate' }
        ]
    },
    {
        id: 'h4',
        date: '23.09.2025',
        time: '16:45',
        user: 'James Wilson',
        role: 'Research Nurse',
        domainId: 'anticoagulation',
        type: 'update',
        details: 'Updated lab values',
        changes: [
             { field: 'Platelet Count', from: '45', to: '155' }
        ]
    },
     {
        id: 'h5',
        date: '23.09.2025',
        time: '10:00',
        user: 'System',
        role: 'Auto',
        domainId: 'anticoagulation',
        type: 'create',
        details: 'Lab results imported via EHR integration.'
    },
    {
        id: 'h6',
        date: '22.09.2025',
        time: '14:20',
        user: 'System',
        role: 'Auto',
        domainId: 'statins',
        type: 'create',
        details: 'Initial assessment started.'
    }
];

// Configuration for scales
const DOMAIN_SCALES: Record<string, { key: string; steps: string[]; label: string; colors?: string[] }[]> = {
    respiratory: [
        { 
            key: 'FEV1', 
            label: 'FEV1 Severity',
            steps: ['75-100%', '50-74%', '< 50%'],
            colors: ['bg-green-500', 'bg-yellow-500', 'bg-red-500']
        },
        {
            key: 'Vent',
            label: 'Ventilation Support',
            steps: ['None', 'Non-Invasive', 'Invasive'],
            colors: ['bg-green-500', 'bg-yellow-500', 'bg-red-500']
        }
    ],
    antibiotics: [
        { 
            key: 'Sepsis', 
            label: 'Sepsis Severity',
            steps: ['Mild', 'Moderate', 'Severe', 'Septic Shock'],
            colors: ['bg-green-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-600']
        },
        {
            key: 'Lactate',
            label: 'Lactate Level',
            steps: ['0-2', '2.1-4', '> 4'],
            colors: ['bg-green-500', 'bg-yellow-500', 'bg-red-500']
        }
    ],
    anticoagulation: [
        {
            key: 'Plt',
            label: 'Platelet Count',
            steps: ['> 150', '101-150', '50-100', '< 50'],
            colors: ['bg-green-500', 'bg-yellow-400', 'bg-orange-500', 'bg-red-500']
        }
    ],
    statins: [
        {
            key: 'Cholesterol',
            label: 'Cholesterol Level',
            steps: ['Normal', 'Elevated', 'High'],
            colors: ['bg-green-500', 'bg-yellow-500', 'bg-red-500']
        }
    ],
    vasopressors: [
        {
            key: 'MAP',
            label: 'MAP Target',
            steps: ['> 75', '65-75', '< 65'],
            colors: ['bg-green-500', 'bg-green-500', 'bg-red-500']
        }
    ]
};

// --- Data Collection Mock Data & Types ---
interface DataForm {
    id: string;
    name: string;
    progress: number;
    status: 'Completed' | 'In Progress' | 'Not Started' | 'Locked' | 'Query';
    date: string;
}

const ONGOING_FORMS: DataForm[] = [
    { id: 'f1', name: 'Demographics', progress: 100, status: 'Completed', date: '25.09.2025' },
    { id: 'f4', name: 'Labs (Baseline)', progress: 85, status: 'In Progress', date: '25.09.2025' },
    { id: 'f5', name: 'Concomitant Medications', progress: 40, status: 'Query', date: 'Today' },
    { id: 'f7', name: 'Randomisation', progress: 100, status: 'Locked', date: '25.09.2025' },
];

const FRESH_FORMS: DataForm[] = [
    { id: 'f7', name: 'Randomisation', progress: 100, status: 'Completed', date: 'Today' },
    { id: 'f1', name: 'Demographics', progress: 0, status: 'Not Started', date: '-' },
    { id: 'f2', name: 'Baseline Assessment', progress: 0, status: 'Not Started', date: '-' },
    { id: 'f4', name: 'Labs (Baseline)', progress: 0, status: 'Not Started', date: '-' },
    { id: 'f5', name: 'Concomitant Medications', progress: 0, status: 'Not Started', date: '-' },
];

const FORM_STATUS_OPTIONS = ['All', 'Completed', 'In Progress', 'Not Started', 'Query', 'Locked'];

const STATUS_PRIORITY: Record<string, number> = {
    'Query': 0,
    'In Progress': 1,
    'Not Started': 2,
    'Completed': 3,
    'Locked': 4
};

// --- Helper Functions ---

const getHighestStatus = (domain: EligibilityDomain) => {
    if (domain.randomisationStatus === 'RANDOMISED') {
        return { label: 'Randomised', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', barColor: 'bg-emerald-500' };
    }
    if (domain.randomisationStatus === 'RANDOMISATION_REQUESTED') {
        return { label: 'Re-randomise needed', color: 'bg-amber-100 text-amber-800 border-amber-200', barColor: 'bg-amber-500' };
    }
    
    if (domain.consentStatus === 'WITHDRAWN') {
        return { label: 'Withdrawn', color: 'bg-gray-100 text-gray-700 border-gray-300', barColor: 'bg-gray-500' };
    }
    if (domain.consentStatus === 'DECLINED') {
        return { label: 'Consent Declined', color: 'bg-red-50 text-red-700 border-red-200', barColor: 'bg-red-500' };
    }
    if (domain.status === 'EXPIRED') {
        return { label: 'Expired', color: 'bg-orange-50 text-orange-700 border-orange-200', barColor: 'bg-orange-500' };
    }
    if (domain.consentStatus === 'OBTAINED') {
        return { label: 'Consent Signed', color: 'bg-blue-50 text-blue-700 border-blue-200', barColor: 'bg-blue-500' };
    }
    if (domain.consentStatus === 'SIG_REQUESTED') {
         return { label: 'Awaiting consent', color: 'bg-amber-50 text-amber-700 border-amber-200', barColor: 'bg-amber-500' };
    }
    if (domain.consentStatus === 'SIG_PENDING') {
         return { label: 'In progress', color: 'bg-blue-50 text-blue-700 border-blue-200', barColor: 'bg-blue-500' };
    }
    if (domain.consentStatus === 'PENDING_CONSENT') {
         return { label: 'Consent Pending', color: 'bg-blue-50 text-blue-700 border-blue-200', barColor: 'bg-blue-500' };
    }

    if (domain.status === 'ELIGIBLE') {
        return { label: 'Eligible', color: 'bg-green-50 text-green-700 border-green-200', barColor: 'bg-green-500' };
    }
    if (domain.status === 'NOT_ELIGIBLE') {
        return { label: 'Not Eligible', color: 'bg-red-50 text-red-700 border-red-200', barColor: 'bg-red-500' };
    }
    if (domain.status === 'IN_PROGRESS') {
        return { label: 'In Progress', color: 'bg-purple-50 text-purple-700 border-purple-200', barColor: 'bg-purple-500' };
    }

    return { label: 'Not Assessed', color: 'bg-gray-100 text-gray-600 border-gray-200', barColor: 'bg-gray-300' };
};

const SeverityStepper: React.FC<{ steps: string[]; current: string; label: string; colors?: string[] }> = ({ steps, current, label, colors }) => {
    // Find index of current value
    const currentIndex = steps.findIndex(s => s.toLowerCase() === current?.toLowerCase());
    
    return (
        <div className="w-full">
            <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">{label}</h5>
            <div className="relative flex items-center justify-between w-full mb-2 px-2">
                {/* Connecting Line */}
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10 rounded-full"></div>
                
                {/* Progress Line (colored) */}
                {currentIndex !== -1 && (
                     <div 
                        className={`absolute left-0 top-1/2 transform -translate-y-1/2 h-1 -z-10 rounded-full transition-all duration-500 ease-out
                           ${colors ? colors[currentIndex] : 'bg-brand-500'}
                        `}
                        style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
                     ></div>
                )}

                {steps.map((step, idx) => {
                    const isActive = idx === currentIndex;
                    const isPassed = idx <= currentIndex;
                    
                    let circleColorClass = 'bg-gray-200 border-gray-200 text-gray-400'; // Default inactive
                    
                    if (isActive) {
                        circleColorClass = colors ? `${colors[idx]} border-white text-white shadow-md scale-110` : 'bg-brand-600 border-white text-white shadow-md scale-110';
                    } else if (isPassed) {
                         circleColorClass = 'bg-gray-400 border-gray-400 text-white';
                    }

                    return (
                        <div key={step} className="flex flex-col items-center group relative">
                             {/* Step Circle */}
                             <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300 z-10 ${circleColorClass}`}>
                             </div>
                             
                             {/* Step Label - Centered below circle with fixed width to allow wrapping */}
                             <div className={`absolute top-6 left-1/2 transform -translate-x-1/2 w-24 text-center text-[10px] font-medium leading-tight transition-colors duration-300 ${isActive ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
                                 {step}
                             </div>
                        </div>
                    );
                })}
            </div>
            {/* Spacer for labels */}
            <div className="h-8"></div>
        </div>
    );
};

const DomainTimeline: React.FC<{ domainId: string, history: HistoryItem[] }> = ({ domainId, history }) => {
    const domainHistory = history.filter(h => h.domainId === domainId);
    
    if (domainHistory.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-6 text-gray-400 bg-gray-50 rounded-lg border border-gray-100 border-dashed">
                <Icons.Clock className="w-4 h-4 mb-1 opacity-50" />
                <span className="text-xs">No history recorded</span>
            </div>
        );
    }

    return (
        <div className="relative border-l-2 border-gray-200 ml-2 space-y-6 my-2">
            {domainHistory.map((item) => (
                <div key={item.id} className="relative pl-6 group">
                    <div className={`absolute -left-[5px] top-1.5 w-[8px] h-[8px] rounded-full ring-4 ring-white
                        ${item.type === 'create' ? 'bg-green-500' : 'bg-brand-500'}
                    `}></div>
                    <div className="flex flex-col">
                         <div className="flex items-center text-[10px] text-gray-500 mb-1 font-medium">
                            <span className="text-gray-900 mr-2">{item.date}</span>
                            <span className="mr-2 text-gray-400">{item.time}</span>
                            <div className="flex items-center">
                                <span className="w-1 h-1 rounded-full bg-gray-300 mr-2"></span>
                                <span className="text-gray-500">{item.user}</span>
                            </div>
                        </div>
                        
                        {item.changes && item.changes.length > 0 ? (
                            <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden mt-1">
                                {item.details && (
                                     <div className="bg-gray-50 px-2 py-1 border-b border-gray-100 text-[10px] text-gray-500 uppercase tracking-wide font-semibold">
                                        {item.details}
                                     </div>
                                )}
                                <div className="p-1">
                                    {item.changes.map((change, idx) => (
                                        <div key={idx} className="flex items-center p-1.5 hover:bg-gray-50 rounded transition-colors text-xs">
                                            <span className="font-medium text-gray-500 w-1/3 truncate pr-2" title={change.field}>
                                                {change.field}
                                            </span>
                                            <div className="flex items-center flex-1 w-2/3 min-w-0">
                                                {change.from && (
                                                    <>
                                                        <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded line-through decoration-red-300 truncate max-w-[40%] text-[10px]">
                                                            {change.from}
                                                        </span>
                                                        <Icons.ChevronRight className="w-3 h-3 text-gray-300 mx-1 flex-shrink-0" />
                                                    </>
                                                )}
                                                <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded font-medium truncate max-w-[50%] text-[10px]">
                                                    {change.to}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 italic mt-1">
                                {item.details}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

const DomainHistoryCard: React.FC<{ domain: EligibilityDomain, onRandomise?: (id: string) => void }> = ({ domain, onRandomise }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Parse state/strata details into a map
    const getCurrentValues = () => {
        const values: Record<string, string> = {};
        const allDetails = [domain.stateDetails, domain.strataDetails].filter(Boolean).join(', ');
        
        allDetails.split(',').forEach(pair => {
            const [key, val] = pair.split(':').map(s => s.trim());
            if (key && val) values[key] = val;
        });
        return values;
    };

    const currentValues = getCurrentValues();
    const domainScales = DOMAIN_SCALES[domain.id];
    
    // Determine if we have applicable scales to show
    const applicableScales = domainScales?.filter(scale => currentValues[scale.key]);
    const hasScales = applicableScales && applicableScales.length > 0;
    
    const statusConfig = getHighestStatus(domain);

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md mb-6">
            {/* Header */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-6 py-4 border-b border-gray-100 bg-white flex items-center justify-between hover:bg-gray-50 transition-colors focus:outline-none text-left"
            >
                <div className="flex items-center gap-4">
                    <div className={`w-2 h-10 rounded-full ${statusConfig.barColor}`}></div>
                    <div>
                        <h4 className="text-lg font-bold text-gray-900">{domain.name}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Last updated: {domain.createdOn || '25.09.2025'}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide border
                        ${statusConfig.color}
                    `}>
                        {statusConfig.label}
                    </div>
                    <Icons.ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* Content Body */}
            {isOpen && (
                <div className="p-6 bg-white animate-in slide-in-from-top-2 duration-200">
                    
                    {/* Primary Content: Scales & State */}
                    <div className="mb-8 relative">
                         {hasScales ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                 {applicableScales.map(scale => (
                                     <SeverityStepper 
                                        key={scale.key} 
                                        steps={scale.steps} 
                                        current={currentValues[scale.key]} 
                                        label={scale.label} 
                                        colors={scale.colors}
                                     />
                                 ))}
                             </div>
                         ) : (
                             <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex flex-wrap gap-2">
                                 {/* Fallback for domains without scales or missing data */}
                                 {Object.entries(currentValues).length > 0 ? (
                                     Object.entries(currentValues).map(([k, v]) => (
                                         <div key={k} className="flex flex-col bg-white border border-gray-200 px-3 py-2 rounded shadow-sm">
                                             <span className="text-[10px] text-gray-400 uppercase font-bold">{k}</span>
                                             <span className="text-sm font-medium text-gray-900">{v}</span>
                                         </div>
                                     ))
                                 ) : (
                                     <span className="text-sm text-gray-500 italic">No specific state details recorded.</span>
                                 )}
                             </div>
                         )}

                         {/* Strata text details removed per request */}
                    </div>

                    {/* Secondary Content: History Toggle */}
                    <div className="border-t border-gray-100 pt-4">
                        <button 
                            onClick={() => setShowHistory(!showHistory)}
                            className="flex items-center text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors focus:outline-none"
                        >
                            {showHistory ? 'Hide Audit Log' : 'View Audit Log / History'}
                            <Icons.ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                        </button>

                        {showHistory && (
                            <div className="mt-4 pl-4 border-l-2 border-brand-100 animate-in fade-in duration-300">
                                <DomainTimeline domainId={domain.id} history={MOCK_HISTORY_DATA} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Data Collection Panel Component ---
const DataCollectionPanel: React.FC<{ 
    hasRandomised: boolean; 
    isJustRandomised: boolean;
    onFormClick: (form: DataForm) => void;
}> = ({ hasRandomised, isJustRandomised, onFormClick }) => {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('All');
    const [sortBy, setSortBy] = useState<'priority' | 'name' | 'date'>('priority');

    // Select which set of forms to display
    const formsSource = isJustRandomised ? FRESH_FORMS : ONGOING_FORMS;

    // 1. Filter
    const filteredForms = formsSource.filter(f => {
        const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'All' || f.status === filter;
        return matchesSearch && matchesFilter;
    });

    // 2. Sort
    const sortedForms = [...filteredForms].sort((a, b) => {
        if (sortBy === 'priority') {
            const pA = STATUS_PRIORITY[a.status] ?? 99;
            const pB = STATUS_PRIORITY[b.status] ?? 99;
            if (pA !== pB) return pA - pB;
            // secondary sort by name
            return a.name.localeCompare(b.name);
        } else if (sortBy === 'name') {
            return a.name.localeCompare(b.name);
        } else if (sortBy === 'date') {
            const parse = (d: string) => d === 'Today' ? new Date().getTime() : (d === '-' ? 0 : new Date(d.split('.').reverse().join('-')).getTime());
            return parse(b.date) - parse(a.date);
        }
        return 0;
    });

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
            case 'Signed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'In Progress': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'Query': return 'bg-red-50 text-red-700 border-red-200';
            case 'Locked': return 'bg-gray-100 text-gray-500 border-gray-200';
            case 'Not Started': return 'bg-gray-50 text-gray-500 border-gray-200';
            default: return 'bg-gray-50 text-gray-500 border-gray-200';
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm h-fit lg:sticky lg:top-24">
            <div className="p-4 border-b border-gray-100">
                <div className="flex justify-between items-start mb-1">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Data Collection</h3>
                        <p className="text-xs text-gray-500">eCRF completion status</p>
                    </div>
                </div>
                
                {hasRandomised && (
                    <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
                         {/* Search */}
                        <div className="relative">
                            <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search forms..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-gray-50 focus:bg-white transition-colors"
                            />
                        </div>
                        
                        <div className="flex gap-2">
                             {/* Filter */}
                            <div className="flex-1 min-w-0">
                                 <select 
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:border-brand-500 cursor-pointer w-full"
                                 >
                                    {FORM_STATUS_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                 </select>
                            </div>
                            
                            {/* Sort */}
                            <div className="flex-1 min-w-0">
                                 <select 
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:border-brand-500 cursor-pointer w-full"
                                 >
                                    <option value="priority">Sort: Status</option>
                                    <option value="name">Sort: Name</option>
                                    <option value="date">Sort: Date</option>
                                 </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto custom-scrollbar">
                {!hasRandomised ? (
                    <div className="p-8 text-center bg-gray-50/50">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Icons.Lock className="w-5 h-5 text-gray-400" />
                        </div>
                        <h4 className="text-sm font-medium text-gray-900 mb-1">Locked</h4>
                        <p className="text-xs text-gray-500 max-w-[200px] mx-auto leading-relaxed">
                            Data collection forms will become available once the participant is randomised into a domain.
                        </p>
                    </div>
                ) : (
                    sortedForms.length > 0 ? sortedForms.map(form => (
                        <div 
                            key={form.id} 
                            onClick={() => onFormClick(form)}
                            className="p-4 hover:bg-gray-50 transition-colors group cursor-pointer animate-in fade-in duration-300"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-sm font-medium text-gray-900 group-hover:text-brand-600 transition-colors">{form.name}</span>
                                {form.status === 'Locked' && <Icons.Lock className="w-3 h-3 text-gray-400 mt-1" />}
                                {form.status === 'Query' && <Icons.AlertCircle className="w-3 h-3 text-red-500 mt-1" />}
                            </div>
                            
                            <div className="flex items-center justify-between mb-2">
                                 <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${getStatusColor(form.status)}`}>
                                     {form.status}
                                 </span>
                                 <span className="text-[10px] text-gray-400">{form.date}</span>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                 <div 
                                    className={`h-full rounded-full ${
                                        form.status === 'Not Started' ? 'bg-transparent' :
                                        form.progress === 100 ? 'bg-green-500' : 
                                        form.status === 'Query' ? 'bg-red-400' : 
                                        'bg-brand-500'
                                    }`}
                                    style={{ width: `${form.progress}%` }}
                                 ></div>
                            </div>
                            <div className="flex justify-end mt-1">
                                <span className="text-[10px] text-gray-400 font-medium">{form.progress}%</span>
                            </div>
                        </div>
                    )) : (
                        <div className="p-8 text-center">
                            <p className="text-sm text-gray-500">No forms found</p>
                        </div>
                    )
                )}
            </div>
            
            {hasRandomised && (
                <div className="p-3 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-center">
                     <button className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center">
                        View All Data
                        <Icons.ChevronRight className="w-3 h-3 ml-1" />
                     </button>
                </div>
            )}
        </div>
    );
};

const ParticipantStateView: React.FC<ParticipantStateViewProps> = ({ domains, onRandomise, alerts = [], onUpdateDomain }) => {
  const [selectedForm, setSelectedForm] = useState<{id: string, name: string, status: string} | null>(null);
  
  // Store form data locally for persistence
  const [formData, setFormData] = useState<Record<string, any>>({});

  const hasRandomised = domains.some(d => d.randomisationStatus === 'RANDOMISED' || d.randomisationStatus === 'RANDOMISATION_REQUESTED');
  
  const today = new Date().toISOString().split('T')[0].split('-').reverse().join('.');
  
  const isJustRandomised = domains.some(d => d.randomisationStatus === 'RANDOMISED' && d.randomisedDate === today);

  const handleFormSave = (data: any) => {
    // 1. Save to local state for persistence
    if (data.formId) {
        setFormData(prev => ({ ...prev, [data.formId]: data }));
    }

    // 2. Business Logic: Hemoglobin (g/L) over 115 affects Respiratory domain state
    if (data.formId === 'f4' && data.hemoglobin) {
        const val = parseInt(data.hemoglobin);
        if (val > 115) {
            // Find the respiratory domain to check its current status
            const respiratoryDomain = domains.find(d => d.id === 'respiratory');
            
            if (respiratoryDomain && onUpdateDomain) {
                const updates: Partial<EligibilityDomain> = {
                    strataDetails: 'FEV1: 50-74%' 
                };
                
                // Logic to trigger re-randomisation removed.

                onUpdateDomain('respiratory', updates);
            }
        }
    }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
         {/* Alert Banner */}
          {alerts.length > 0 && (
            <div className="mb-6 space-y-3">
              {alerts.map((alert, idx) => {
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column (2/3) */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">Clinical State Overview</h3>
                        <p className="text-sm text-gray-500">Current severity levels and stratification progression.</p>
                    </div>
                    <button className="text-sm text-gray-600 hover:text-brand-600 font-medium flex items-center bg-white px-3 py-1.5 border border-gray-200 rounded-lg shadow-sm hover:shadow transition-all">
                        <Icons.Printer className="w-4 h-4 mr-2" />
                        Print Report
                    </button>
                </div>

                {domains.map((domain) => (
                    <DomainHistoryCard key={domain.id} domain={domain} onRandomise={onRandomise} />
                ))}

                {domains.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-xl border border-gray-200 border-dashed">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Icons.Search className="w-5 h-5 text-gray-400" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-900">No domains assessed</h3>
                        <p className="text-sm text-gray-500 mt-1">Start eligibility assessment to generate state records.</p>
                    </div>
                )}
            </div>

            {/* Right Column (1/3) */}
            <div className="lg:col-span-1">
                <DataCollectionPanel 
                    hasRandomised={hasRandomised} 
                    isJustRandomised={isJustRandomised} 
                    onFormClick={(form) => setSelectedForm(form)}
                />
            </div>
        </div>

        {/* eCRF Form Modal */}
        <FormModal 
          isOpen={!!selectedForm} 
          onClose={() => setSelectedForm(null)} 
          formId={selectedForm?.id || ''} 
          formName={selectedForm?.name || ''} 
          status={selectedForm?.status || ''} 
          onSave={handleFormSave}
          initialData={selectedForm ? formData[selectedForm.id] : undefined}
        />
    </div>
  );
};

export default ParticipantStateView;