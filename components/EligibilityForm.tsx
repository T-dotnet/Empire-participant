
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icons } from './Icons';
import { EligibilityStatus, ParticipantAlert, DomainState } from '../types';

interface InputFieldProps {
  label: string;
  type?: 'select' | 'text' | 'date' | 'number';
  value: string | number | undefined;
  onChange: (val: string) => void;
  options?: string[];
  unit?: string;
  error?: string;
  readOnly?: boolean;
  visible?: boolean;
  initialHistory?: { value: string; timestamp: string }[];
  showEditActions?: boolean;
  confirmable?: boolean;
}

const getFormattedTimestamp = () => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
  return `${dateStr} ${timeStr}`;
};

const InputField: React.FC<InputFieldProps> = ({ 
  label, 
  type = "select",
  value,
  onChange,
  options = [],
  unit,
  error,
  readOnly,
  visible = true,
  initialHistory = [],
  showEditActions = false,
  confirmable = false
}) => {
  const [history, setHistory] = useState<{value: string, timestamp: string}[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [tempValue, setTempValue] = useState('');
  const [draftValue, setDraftValue] = useState<string>('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  
  // Local state for immediate typing feedback without triggering parent updates/history
  const [localValue, setLocalValue] = useState(String(value || ''));

  // Sync localValue with external value updates (e.g. from parent/site changes)
  useEffect(() => {
    if (!isAdding && !isDrafting) {
        setLocalValue(String(value || ''));
    }
  }, [value, isAdding, isDrafting]);

  // Sync internal history state with external value changes
  useEffect(() => {
     if (!isDrafting) {
         let startHistory = [...initialHistory];
         const currentStrValue = String(value || '');
         const lastHistoryValue = startHistory.length > 0 ? startHistory[startHistory.length - 1].value : undefined;

         if (value !== undefined && value !== '' && lastHistoryValue !== currentStrValue) {
             // Only add timestamp if we are not in initial entry phase OR if it's an update to an existing record
             const shouldAddTimestamp = showEditActions || initialHistory.length > 0;
             startHistory.push({ 
               value: currentStrValue, 
               timestamp: shouldAddTimestamp ? getFormattedTimestamp() : '' 
             });
         } else if (startHistory.length === 0 && !confirmable && value) {
             startHistory.push({ value: currentStrValue, timestamp: showEditActions ? getFormattedTimestamp() : '' });
         } else if (startHistory.length === 0 && confirmable && !value) {
             startHistory.push({ value: '', timestamp: '' });
         }
         
         setHistory(startHistory);
         if (confirmable && startHistory.length > 0) {
             setDraftValue(startHistory[startHistory.length - 1].value);
         }
     }
  }, [value, initialHistory, confirmable, isDrafting, showEditActions]);

  // RESET: If edit actions are hidden, ensure we are not in an adding state
  useEffect(() => {
    if (!showEditActions) {
      setIsAdding(false);
    }
  }, [showEditActions]);

  const handleStartAdd = () => { 
    setIsAdding(true); 
    setTempValue(String(value || '')); 
  };
  const handleCancelAdd = () => { 
    setIsAdding(false); 
    setTempValue(''); 
  };
  const handleSaveAdd = () => {
      const now = getFormattedTimestamp();
      setHistory(prev => [...prev, { value: tempValue, timestamp: now }]);
      onChange(tempValue);
      setIsAdding(false);
      setTempValue('');
  };

  const handleUpdateCurrent = (val: string) => {
      if (confirmable) {
          setDraftValue(val);
          setIsDrafting(true);
          setHistory(prev => {
              const newHist = [...prev];
              if (newHist.length > 0) {
                newHist[newHist.length - 1].value = val;
                newHist[newHist.length - 1].timestamp = ''; 
              } else {
                 newHist.push({ value: val, timestamp: '' });
              }
              return newHist;
          });
      } else {
          setHistory(prev => {
              const newHist = [...prev];
              // If we are in initial entry (no edit actions), don't set a timestamp yet
              const timestamp = (showEditActions || initialHistory.length > 0) ? getFormattedTimestamp() : '';
              if (newHist.length > 0) { 
                newHist[newHist.length - 1].value = val;
                newHist[newHist.length - 1].timestamp = timestamp;
              } 
              else { newHist.push({ value: val, timestamp: timestamp }); }
              return newHist;
          });
          onChange(val);
      }
  };

  const handleConfirmDraft = () => {
      onChange(draftValue);
      setIsDrafting(false);
      setHistory(prev => {
          const newHist = [...prev];
          if (newHist.length > 0) {
              newHist[newHist.length - 1].timestamp = getFormattedTimestamp();
          }
          return newHist;
      });
  };

  const handleCancelDraft = () => {
      setDraftValue(String(value || ''));
      setIsDrafting(false);
      setHistory(prev => {
          const newHist = [...prev];
          if (newHist.length > 0) {
              newHist[newHist.length - 1].value = String(value || '');
              newHist[newHist.length - 1].timestamp = value ? getFormattedTimestamp() : ''; 
          }
          return newHist;
      });
  };

  if (!visible) return null;
  
  const currentItem = history.length > 0 ? history[history.length - 1] : { value: String(value || ''), timestamp: '' };
  const historyList = history.slice(0, -1).reverse();
  
  // LOCKING RULE: 
  // 1. Locked if explicitly readOnly (assessment pushed)
  // 2. Locked if it has an observation (timestamp) AND edit actions are enabled (push/consent flow active)
  // 3. Foundation fields for new participants (timestamp is empty) stay editable until readOnly is true
  const isInputLocked = !isAdding && !isDrafting && (readOnly || (currentItem.timestamp !== '' && showEditActions));

  return (
    <div className="flex flex-row items-start py-8 animate-in fade-in duration-300">
       <div className="w-1/3 pr-6 pt-2.5">
          <label className={`text-sm font-semibold ${error ? 'text-red-600' : 'text-gray-800'}`}>{label}</label>
          {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}
       </div>
       
       <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-4">
              
              {isAdding && (
                <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                   <div className="w-64">
                      <div className="px-3 py-2 text-sm bg-gray-50 text-gray-500 border border-gray-200 rounded-lg italic flex justify-between items-center opacity-70">
                        <span className="truncate">{currentItem.value || 'None'}</span>
                        {unit && <span className="text-[9px] font-bold opacity-60 ml-1">{unit}</span>}
                      </div>
                   </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="w-64 relative">
                          {type === 'select' ? (
                             <div className="relative">
                                <select
                                    value={isAdding ? tempValue : (history.length > 0 ? history[history.length - 1].value : String(value || ''))}
                                    onChange={(e) => isAdding ? setTempValue(e.target.value) : handleUpdateCurrent(e.target.value)}
                                    disabled={isInputLocked}
                                    className={`appearance-none block w-full pl-3 pr-10 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all
                                        ${isInputLocked ? 'bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-900 border-gray-300'}
                                        ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}
                                    `}
                                >
                                    <option value="">Select...</option>
                                    {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                    <Icons.ChevronDown className="w-4 h-4" />
                                </div>
                             </div>
                          ) : (
                             <div className="relative">
                                <input
                                    type={type}
                                    value={isAdding ? tempValue : localValue}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (isAdding) setTempValue(val);
                                        else setLocalValue(val);
                                    }}
                                    onBlur={() => {
                                        if (!isAdding && localValue !== String(value || '')) {
                                            handleUpdateCurrent(localValue);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            if (isAdding) handleSaveAdd();
                                            else handleUpdateCurrent(localValue);
                                        }
                                    }}
                                    disabled={isInputLocked}
                                    className={`block w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all
                                        ${isInputLocked ? 'bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-900 border-gray-300'}
                                        ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}
                                    `}
                                />
                                {unit && (
                                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 bg-gray-50 rounded-r-lg border-l border-gray-200">
                                    <span className="text-[10px] font-bold">{unit}</span>
                                  </div>
                                )}
                             </div>
                          )}
                      </div>

                      {(isAdding || isDrafting) ? (
                          <div className="flex items-center gap-2">
                              <button 
                                onClick={isAdding ? handleSaveAdd : handleConfirmDraft} 
                                className={`p-1.5 rounded-full bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:scale-95 transition-all`}
                                title="Confirm Observation"
                              >
                                  <Icons.Check className="w-4 h-4 stroke-white" strokeWidth={3} />
                              </button>
                              <button 
                                onClick={isAdding ? handleCancelAdd : handleCancelDraft} 
                                className="p-1.5 rounded-full bg-white text-gray-400 border border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all shadow-sm active:scale-95" 
                                title="Cancel"
                              >
                                  <Icons.X className="w-4 h-4" strokeWidth={3} />
                              </button>
                          </div>
                      ) : (
                          <div className="flex items-center gap-2">
                              {currentItem.timestamp !== '' && (
                                <div className="flex items-center text-[10px] text-gray-500 font-bold tracking-tight bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-200 shadow-sm animate-in fade-in slide-in-from-right-1">
                                    <Icons.CheckCircle className="w-3.5 h-3.5 mr-2 text-green-500 flex-shrink-0" />
                                    <span className="tabular-nums">{currentItem.timestamp}</span>
                                </div>
                              )}
                              {showEditActions && !isAdding && !isDrafting && (
                                  <button 
                                    onClick={handleStartAdd} 
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-300 text-gray-600 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50 transition-all shadow-sm active:scale-95 group" 
                                    title="Edit observation"
                                  >
                                     <Icons.Plus className="w-3.5 h-3.5 text-gray-400 group-hover:text-brand-500" />
                                     <span className="text-xs font-bold uppercase tracking-tight">Edit</span>
                                  </button>
                              )}
                          </div>
                      )}
                  </div>
                  
                  {historyList.length > 0 && (
                    <div className="mt-1 flex flex-col items-start">
                        <button 
                        onClick={() => setShowFullHistory(!showFullHistory)}
                        className="flex items-center text-[10px] font-bold text-gray-400 hover:text-brand-600 uppercase tracking-widest transition-colors py-1"
                        >
                        {showFullHistory ? 'Hide History' : `VIEW HISTORY (${historyList.length})`}
                        <Icons.ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showFullHistory ? 'rotate-180' : ''}`} />
                        </button>

                        {showFullHistory && (
                            <div className="w-full max-sm mt-2 bg-gray-50 p-3 rounded-lg border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Observation History</div>
                                {historyList.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-200 last:border-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-700">{item.value || 'None'}</span>
                                        {unit && <span className="text-[9px] text-gray-400">{unit}</span>}
                                    </div>
                                    <span className="text-[10px] text-gray-400 tabular-nums">{item.timestamp}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                  )}
              </div>
          </div>
       </div>
    </div>
  );
};

const getRange = (val: string, type: 'fev1' | 'lactate' | 'platelet' | 'aptt' | 'map' | 'weight') => {
  const v = parseFloat(val);
  if (isNaN(v)) return val;
  switch (type) {
    case 'lactate':
      if (v <= 2) return '0-2';
      if (v <= 4) return '2.1-4';
      return '> 4';
    case 'platelet':
      if (v < 50) return '< 50';
      if (v <= 100) return '50-100';
      if (v <= 150) return '101-150';
      return '> 150';
    case 'aptt':
      if (v <= 1.5) return '0-1.5';
      if (v <= 2.5) return '1.6-2.5';
      return '> 2.5';
    case 'map':
      if (v < 65) return '< 65';
      if (v <= 75) return '65-75';
      return '> 75';
    case 'weight':
        if (v <= 50) return '0-50';
        if (v <= 70) return '51-70';
        if (v <= 90) return '71-90';
        if (v <= 110) return '91-110';
        return '111+';
    default:
      return val;
  }
};

interface EligibilityFormProps {
  onStatusUpdate: (statusMap: Record<string, { status: EligibilityStatus; stateDetails?: string; strataDetails?: string }>) => void;
  onValuesUpdate?: (values: Record<string, any>) => void;
  initialData?: Record<string, EligibilityStatus>;
  domainData?: Record<string, DomainState>;
  initialValues?: Record<string, any>;
  previousValues?: Record<string, any>;
  showNewDomain: boolean;
  alerts?: ParticipantAlert[];
  visibleDomains: string[];
  canEdit?: boolean;
  isConsentUnlocked?: boolean;
}

const EligibilityForm: React.FC<EligibilityFormProps> = ({ 
  onStatusUpdate, 
  onValuesUpdate,
  initialData, 
  domainData, 
  initialValues,
  previousValues,
  showNewDomain, 
  alerts = [], 
  visibleDomains,
  canEdit = true,
  isConsentUnlocked = false
}) => {
  const initialStatusRef = useRef(initialData || {});
  const onStatusUpdateRef = useRef(onStatusUpdate);
  const onValuesUpdateRef = useRef(onValuesUpdate);
  
  useEffect(() => {
    onStatusUpdateRef.current = onStatusUpdate;
  }, [onStatusUpdate]);

  useEffect(() => {
    onValuesUpdateRef.current = onValuesUpdate;
  }, [onValuesUpdate]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyHistoryFields, setShowOnlyHistoryFields] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  useEffect(() => {
    initialStatusRef.current = initialData || {};
  }, [initialData]);

  // RESET logic: If consent tab is not unlocked, reset the "Reassess" filter effect
  useEffect(() => {
    if (!isConsentUnlocked) {
      setShowOnlyHistoryFields(false);
    }
  }, [isConsentUnlocked]);

  const isLockedByState = (domainId: string) => {
      if (!canEdit) return true;
      return false;
  };

  const rangeToNumber = (rangeStr: string, type: 'lactate' | 'platelet' | 'map' | 'aptt' | 'weight' | 'age'): string => {
     if (!rangeStr) return '';
     const match = rangeStr.match(/\(([\d.]+)\)/);
     if (match) return match[1];
     switch(type) {
         case 'lactate':
             if (rangeStr.includes('0-2')) return '1.5';
             if (rangeStr.includes('2.1-4')) return '3.0';
             if (rangeStr.includes('> 4')) return '5.0';
             break;
         case 'platelet':
             if (rangeStr.includes('> 150')) return '200';
             if (rangeStr.includes('101-150')) return '125';
             if (rangeStr.includes('50-100')) return '75';
             if (rangeStr.includes('< 50')) return '30';
             break;
         case 'map':
             if (rangeStr.includes('> 75')) return '80';
             if (rangeStr.includes('65-75')) return '70';
             if (rangeStr.includes('< 65')) return '60';
             break;
         case 'aptt':
             if (rangeStr.includes('0-1.5')) return '1.0';
             if (rangeStr.includes('1.6-2.5')) return '2.0';
             if (rangeStr.includes('> 2.5')) return '3.0';
             break;
         case 'weight':
             if (rangeStr.includes('0-50')) return '45';
             if (rangeStr.includes('51-70')) return '60';
             if (rangeStr.includes('71-90')) return '80';
             if (rangeStr.includes('91-110')) return '100';
             if (rangeStr.includes('111+')) return '120';
             break;
         case 'age':
             const rawAgeMatch = rangeStr.match(/\d+/);
             return rawAgeMatch ? rawAgeMatch[0] : '';
     }
     return '';
  }

  const getDefaultsFromDomainData = (data?: Record<string, DomainState>) => {
    const defaults: Record<string, any> = {
        age: '', weight: '', pregnant: '', consent_capacity: '', sars_cov_2: '',
        suspected_infection: '', antibiotics_24h: '', allergy: '', sepsis_severity: '', lactate: '',
        active_bleeding: '', platelet_count: '', aptt_ratio: '',
        taking_statins: '', liver_disease: '', cholesterol_level: '',
        shock_present: '', vasopressor_use: '', map_target: ''
    };
    
    const extract = (str: string, prefix: string) => { 
        if (!str || !str.includes(prefix)) return undefined; 
        const after = str.split(prefix)[1];
        if (!after) return undefined;
        return after.trim().split(',')[0]; 
    }

    const processDomainValues = (domainId: string, parsers: Record<string, (details: string, strata: string) => string | undefined>) => {
        const d = data?.[domainId];
        if (!d) return;

        Object.entries(parsers).forEach(([field, parser]) => {
             const val = parser(d.stateDetails || '', d.strataDetails || '');
             if (val !== undefined && val !== '') defaults[field] = val;
        });
    };

    if (data) {
        const platform = data['platform'];
        if (platform) {
            // Platform foundation fields stay UNTOUCHED even if expired
            const firstPart = (platform.stateDetails || '').split(',')[0].trim();
            if (firstPart.includes(':')) {
                defaults.sars_cov_2 = '';
            } else {
                defaults.sars_cov_2 = firstPart;
            }
            defaults.age = rangeToNumber(extract(platform.strataDetails || '', 'Age:') || '', 'age');
            defaults.weight = rangeToNumber(extract(platform.strataDetails || '', 'Weight:') || '', 'weight');
            
            const hasExplicitPregnancy = (platform.stateDetails || '').includes('Pregnant:');
            const hasExplicitConsent = (platform.stateDetails || '').includes('Consent:');

            if (hasExplicitPregnancy) defaults.pregnant = extract(platform.stateDetails!, 'Pregnant:');
            if (hasExplicitConsent) defaults.consent_capacity = extract(platform.stateDetails!, 'Consent:');

            const isLegacyCompleted = platform.eligibility === 'ELIGIBLE' || platform.eligibility === 'NOT_ELIGIBLE';
            const isFreshParticipant = !platform.stateDetails && platform.eligibility === 'NOT_ASSESSED';

            if (isLegacyCompleted && !isFreshParticipant) {
                if (defaults.age && !defaults.pregnant) defaults.pregnant = 'No';
                if (defaults.age && !defaults.consent_capacity) defaults.consent_capacity = 'Yes';
                if (!defaults.sars_cov_2) defaults.sars_cov_2 = 'Negative';
            }
        }

        // Apply previous values if they exist and haven't been set by domain data
        if (previousValues) {
            if (!defaults.pregnant && previousValues.pregnant) {
                defaults.pregnant = previousValues.pregnant;
            }
            if (!defaults.consent_capacity && previousValues.consent_capacity) {
                defaults.consent_capacity = previousValues.consent_capacity;
            }
        }

        processDomainValues('antibiotics', {
            suspected_infection: (s) => (s.includes('Infection') || s.includes('Sepsis')) && s !== 'No Infection' ? 'Yes' : (s === 'No Infection' ? 'No' : undefined),
            antibiotics_24h: (s) => s === 'Prior Antibiotics' ? 'Yes' : 'No',
            allergy: (s) => s === 'Allergy' ? 'Yes' : 'No',
            sepsis_severity: (s) => extract(s, 'Sepsis:'),
            lactate: (s, st) => rangeToNumber(extract(st, 'Lactate:') || '', 'lactate')
        });
        processDomainValues('anticoagulation', {
             active_bleeding: (s) => s === 'Active Bleeding' ? 'Yes' : (s === 'No Bleeding' ? 'No' : undefined),
             platelet_count: (s, st) => rangeToNumber(extract(st, 'Plt:') || '', 'platelet'),
             aptt_ratio: (s, st) => rangeToNumber(extract(st, 'APTT:') || '', 'aptt')
        });
        processDomainValues('statins', {
             liver_disease: (s) => s === 'Liver Disease' ? 'Yes' : (s.includes('No Liver Disease') || s.includes('Statins') ? 'No' : undefined),
             taking_statins: (s) => extract(s, 'Statins:'),
             cholesterol_level: (s, st) => extract(s, 'Cholesterol:')
        });
        processDomainValues('vasopressors', {
             shock_present: (s) => s === 'Shock Present' ? 'Yes' : (s === 'No Shock' ? 'No' : undefined),
             vasopressor_use: (s, st) => {
                 const extracted = extract(st, 'Vaso Use:');
                 const rawMatch = extracted?.match(/\((.+)\)/);
                 if (rawMatch) return rawMatch[1];
                 return extracted === 'Yes' ? 'Yes' : extracted; 
             },
             map_target: (s, st) => rangeToNumber(extract(st, 'MAP:') || '', 'map')
        });
    }
    return defaults;
  };

  const initialDefaults = useMemo(() => getDefaultsFromDomainData(domainData), [domainData, previousValues]);

  const [values, setValues] = useState<Record<string, any>>(() => {
    if (initialValues) return initialValues;
    return initialDefaults;
  });

  const [eligibleDomains, setEligibleDomains] = useState<string[]>([]);
  
  // Sync values with domainData if we are in read-only mode
  useEffect(() => {
    if (!canEdit) {
      if (initialValues) {
        setValues(initialValues);
      } else {
        setValues(getDefaultsFromDomainData(domainData));
      }
    }
  }, [domainData, canEdit, initialValues]);

  const histories = useMemo(() => {
      const fieldHistories: Record<string, any[]> = {};
      const extract = (str: string, prefix: string) => { if (!str || !str.includes(prefix)) return undefined; return str.split(prefix)[1].trim().split(',')[0]; }
      const processDomainHistory = (domainId: string, parsers: Record<string, (details: string, strata: string) => string | undefined>) => {
          const d = domainData?.[domainId];
          if (!d || !d.history || d.history.length === 0) return;
          Object.entries(parsers).forEach(([field, parser]) => {
              const hist = d.history?.map(h => {
                  const val = parser(h.stateDetails || '', h.timestamp || '');
                  if (val !== undefined) return { value: val, timestamp: h.timestamp };
                  return null;
              }).filter(Boolean);
              
              const filteredHist: any[] = [];
              hist?.forEach(entry => {
                  if (entry && (filteredHist.length === 0 || filteredHist[filteredHist.length - 1].value !== entry.value)) {
                      filteredHist.push(entry);
                  }
              });

              if (filteredHist && filteredHist.length > 0) fieldHistories[field] = filteredHist || [];
          });
      };
      if (domainData) {
          processDomainHistory('platform', { 
              sars_cov_2: (s) => s,
              weight: (s, st) => rangeToNumber(extract(st, 'Weight:') || '', 'weight'),
              age: (s, st) => rangeToNumber(extract(st, 'Age:') || '', 'age')
          });
          processDomainHistory('antibiotics', {
              suspected_infection: (s) => (s.includes('Infection') || s.includes('Sepsis')) && s !== 'No Infection' ? 'Yes' : (s === 'No Infection' ? 'No' : undefined),
              antibiotics_24h: (s) => s === 'Prior Antibiotics' ? 'Yes' : 'No',
              allergy: (s) => s === 'Allergy' ? 'Yes' : 'No',
              sepsis_severity: (s) => extract(s, 'Sepsis:'),
              lactate: (s, st) => rangeToNumber(extract(st, 'Lactate:') || '', 'lactate')
          });
          processDomainHistory('anticoagulation', {
              active_bleeding: (s) => s === 'Active Bleeding' ? 'Yes' : (s === 'No Bleeding' ? 'No' : undefined),
              platelet_count: (s, st) => rangeToNumber(extract(st, 'Plt:') || '', 'platelet'),
              aptt_ratio: (s, st) => rangeToNumber(extract(st, 'APTT:') || '', 'aptt')
          });
          processDomainHistory('statins', {
              liver_disease: (s) => s === 'Liver Disease' ? 'Yes' : (s.includes('No Liver Disease') || s.includes('Statins') ? 'No' : undefined),
              taking_statins: (s) => extract(s, 'Statins:'),
              cholesterol_level: (s, st) => extract(s, 'Cholesterol:')
          });
          processDomainHistory('vasopressors', {
              shock_present: (s) => s === 'Shock Present' ? 'Yes' : (s === 'No Shock' ? 'No' : undefined),
              vasopressor_use: (s, st) => {
                  const extracted = extract(st, 'Vaso Use:');
                  const rawMatch = extracted?.match(/\((.+)\)/);
                  if (rawMatch) return rawMatch[1];
                  return extracted === 'Yes' ? 'Yes' : extracted; 
              },
              map_target: (s, st) => rangeToNumber(extract(st, 'MAP:') || '', 'map')
          });
      }
      return fieldHistories;
  }, [domainData]);

  const isVisible = (domainId: string) => !visibleDomains || visibleDomains.includes(domainId);
  const match = (label: string, hasHistory = false) => {
    if (showOnlyHistoryFields && !hasHistory) return false;
    if (!searchTerm) return true;
    return label.toLowerCase().includes(searchTerm.toLowerCase());
  };

  useEffect(() => {
    const statusMap: Record<string, { status: EligibilityStatus; stateDetails?: string; strataDetails?: string }> = {};
    const newErrors: Record<string, string> = {};
    
    // platformStatus is a local variable used within this effect to track the overall eligibility of the platform section.
    let platformStatus: EligibilityStatus = 'NOT_ASSESSED';
    // REQUIREMENT: Platform eligibility depends on Age, Weight, Pregnant, Consent.
    // SARS-CoV-2 is for State definition only.
    const platformParamsPresent = values.age && values.weight && values.pregnant && values.consent_capacity;

    if (platformParamsPresent) {
        if (values.pregnant === 'Yes') { newErrors.pregnant = "Pregnancy is exclusionary"; platformStatus = 'NOT_ELIGIBLE'; }
        else if (values.consent_capacity === 'No') { newErrors.consent_capacity = "Must have capacity"; platformStatus = 'NOT_ELIGIBLE'; }
        else if (values.age && parseInt(values.age) < 18) { newErrors.age = "Must be > 18"; platformStatus = 'NOT_ELIGIBLE'; }
        else { platformStatus = 'ELIGIBLE'; }
    } else if (values.age || values.weight || values.pregnant || values.consent_capacity) {
        platformStatus = 'IN_PROGRESS';
    }
    
    let platformStrataParts = [];
    if (values.age) {
        const age = parseInt(values.age);
        let ageStrata = '';
        if (age < 18) ageStrata = '0-17';
        else if (age <= 25) ageStrata = '18-25';
        else if (age <= 35) ageStrata = '26-35';
        else if (age <= 45) ageStrata = '36-45';
        else if (age <= 55) ageStrata = '46-55';
        else if (age <= 65) ageStrata = '56-65';
        else ageStrata = '66+';
        platformStrataParts.push(`Age: ${ageStrata} (${values.age})`);
    }
    if (values.weight) {
        const weightStrata = getRange(values.weight, 'weight');
        platformStrataParts.push(`Weight: ${weightStrata}kg (${values.weight})`);
    }
    const platformStrata = platformStrataParts.join(', ');

    const platformStateParts = [];
    if (values.sars_cov_2) platformStateParts.push(values.sars_cov_2);
    if (values.pregnant === 'Yes') platformStateParts.push(`Pregnant: ${values.pregnant}`);
    if (values.consent_capacity === 'No') platformStateParts.push(`Consent: ${values.consent_capacity}`);

    const platformStateDetails = platformStateParts.join(', ');

    statusMap.platform = { 
        status: platformStatus, 
        stateDetails: platformStateDetails,
        strataDetails: platformStrata
    };

    const evaluateDomain = (
        domainName: string, 
        rules: () => { status: EligibilityStatus, errs: Record<string, string>, stateDetails?: string, strataDetails?: string }
    ) => {
        // REQUIREMENT: Keep domain status not assessed yet until SARS-CoV-2 Status has a value
        if (!values.sars_cov_2) {
            statusMap[domainName] = { status: 'NOT_ASSESSED' };
            return;
        }

        const result = rules();
        Object.assign(newErrors, result.errs);
        let finalStatus: EligibilityStatus = result.status;
        
        if (platformStatus === 'NOT_ELIGIBLE') { 
            finalStatus = 'NOT_ELIGIBLE'; 
        } else if (platformStatus !== 'ELIGIBLE') { 
            if (finalStatus === 'ELIGIBLE') finalStatus = 'IN_PROGRESS'; 
        }

        const d = domainData?.[domainName];
        let isDomainExpired = false;
        if (d?.createdOn) {
            const parts = d.createdOn.split('.');
            if (parts.length === 3) {
                const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                const now = new Date();
                const diffTime = now.getTime() - date.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 30) {
                    isDomainExpired = true;
                }
            }
        }

        if (isDomainExpired && (finalStatus === 'ELIGIBLE' || finalStatus === 'IN_PROGRESS')) {
            finalStatus = 'EXPIRED';
        }
        
        statusMap[domainName] = { status: finalStatus, stateDetails: result.stateDetails, strataDetails: result.strataDetails };
    };

    evaluateDomain('antibiotics', () => {
        let s: EligibilityStatus = 'IN_PROGRESS';
        const e: Record<string, string> = {};
        let stateD = '';
        let strataD = '';
        if (values.sars_cov_2 !== 'Negative') return { status: 'NOT_ELIGIBLE', errs: {}, stateDetails: `SARS-CoV-2 ${values.sars_cov_2}` };

        if (!values.suspected_infection) return { status: 'NOT_ASSESSED', errs: {} };
        if (values.suspected_infection === 'No') { e.suspected_infection = "Must have infection"; stateD = "No Infection"; return { status: 'NOT_ELIGIBLE', errs: e, stateDetails: stateD }; } 
        if (!values.allergy || !values.antibiotics_24h) return { status: 'IN_PROGRESS', errs: {}, stateDetails: "Infection" };
        if (values.allergy === 'Yes') { e.allergy = "Known allergy"; s = 'NOT_ELIGIBLE'; stateD = "Allergy"; }
        else if (values.antibiotics_24h === 'Yes') { e.antibiotics_24h = "Already on antibiotics"; s = 'NOT_ELIGIBLE'; stateD = "Prior Antibiotics"; }
        else { stateD = "Infection"; }
        if (s === 'NOT_ELIGIBLE') return { status: s, errs: e, stateDetails: stateD };
        if (values.sepsis_severity && values.lactate) { 
            s = 'ELIGIBLE'; 
            stateD = `Sepsis: ${values.sepsis_severity}`;
            strataD = `Lactate: ${getRange(values.lactate, 'lactate')} (${values.lactate})`;
        } else { s = 'IN_PROGRESS'; }
        return { status: s, errs: e, stateDetails: stateD, strataDetails: strataD };
    });

    evaluateDomain('anticoagulation', () => {
        let s: EligibilityStatus = 'IN_PROGRESS';
        const e: Record<string, string> = {};
        let stateD = '';
        let strataD = '';
        if (values.sars_cov_2 !== 'Positive') return { status: 'NOT_ELIGIBLE', errs: {}, stateDetails: `SARS-CoV-2 ${values.sars_cov_2}` };

        if (!values.active_bleeding) return { status: 'NOT_ASSESSED', errs: {} };
        if (values.active_bleeding === 'Yes') { e.active_bleeding = "Active bleeding"; stateD = "Active Bleeding"; return { status: 'NOT_ELIGIBLE', errs: e, stateDetails: stateD }; }
        stateD = "No Bleeding";
        if (values.platelet_count && values.aptt_ratio) {
            if (parseInt(values.platelet_count) < 50) { e.platelet_count = "Platelets too low"; s = 'NOT_ELIGIBLE'; } 
            else { s = 'ELIGIBLE'; }
            strataD = `Plt: ${getRange(values.platelet_count, 'platelet')} (${values.platelet_count}), APTT: ${getRange(values.aptt_ratio, 'aptt')} (${values.aptt_ratio})`;
        } else { s = 'IN_PROGRESS'; }
        return { status: s, errs: e, stateDetails: stateD, strataDetails: strataD };
    });

    evaluateDomain('statins', () => {
        let s: EligibilityStatus = 'IN_PROGRESS';
        const e: Record<string, string> = {};
        if (values.sars_cov_2 !== 'Unknown') return { status: 'NOT_ELIGIBLE', errs: {}, stateDetails: `SARS-CoV-2 ${values.sars_cov_2}` };
        if (!values.liver_disease) return { status: 'NOT_ASSESSED', errs: {} }; 
        if (values.liver_disease === 'Yes') { e.liver_disease = "Liver disease"; return { status: 'NOT_ELIGIBLE', errs: e, stateDetails: "Liver Disease" }; }
        
        let stateD = values.taking_statins ? `Statins: ${values.taking_statins}` : "No Liver Disease";
        let strataD = values.cholesterol_level ? `Cholesterol: ${values.cholesterol_level}` : "";

        if (values.cholesterol_level) { s = 'ELIGIBLE'; } else { s = 'IN_PROGRESS'; }
        return { status: s, errs: e, stateDetails: stateD, strataDetails: strataD };
    });

    evaluateDomain('vasopressors', () => {
        let s: EligibilityStatus = 'IN_PROGRESS';
        const e: Record<string, string> = {};
        let stateD = '';
        let strataD = '';
        if (values.sars_cov_2 !== 'Unknown') return { status: 'NOT_ELIGIBLE', errs: {}, stateDetails: `SARS-CoV-2 ${values.sars_cov_2}` };
        if (!values.shock_present) return { status: 'NOT_ASSESSED', errs: {} };
        if (values.shock_present === 'No') { e.shock_present = "Must have shock"; stateD = "No Shock"; return { status: 'NOT_ELIGIBLE', errs: e, stateDetails: stateD }; }
        stateD = "Shock Present";
        if (values.vasopressor_use && values.map_target) { 
            s = 'ELIGIBLE'; 
            strataD = `Vaso Use: Yes (${values.vasopressor_use}), MAP: ${getRange(values.map_target, 'map')} (${values.map_target})`;
        } else { s = 'IN_PROGRESS'; }
        return { status: s, errs: e, stateDetails: stateD, strataDetails: strataD };
    });

    onStatusUpdateRef.current(statusMap);
    if (onValuesUpdateRef.current) onValuesUpdateRef.current(values);
    setErrors(newErrors);

    const eligible = Object.entries(statusMap)
      .filter(([id, data]) => id !== 'platform' && data.status === 'ELIGIBLE')
      .map(([id]) => id);
    
    setEligibleDomains(prev => {
        if (JSON.stringify(prev) === JSON.stringify(eligible)) return prev;
        return eligible;
    });
  }, [values, showNewDomain]);

  const handleChange = (field: string, val: string) => { setValues(prev => ({ ...prev, [field]: val })); };
  
  const platformBasicsProvided = !!(values.age && values.weight && values.pregnant && values.consent_capacity);
  const platformComplete = platformBasicsProvided && !!values.sars_cov_2;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col p-8 pb-32">
        <div className="mb-8 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Icons.Search className="h-5 w-5 text-gray-400" /></div>
                <input type="text" className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition duration-150 ease-in-out" placeholder="Search criteria..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"><Icons.X className="h-4 w-4" /></button>}
            </div>
            {isConsentUnlocked && (
                <button 
                  onClick={() => setShowOnlyHistoryFields(!showOnlyHistoryFields)} 
                  className={`flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${showOnlyHistoryFields ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  <Icons.Filter className={`w-4 h-4 mr-2 ${showOnlyHistoryFields ? 'text-brand-600' : 'text-gray-400'}`} />
                  Reassess
                </button>
            )}
        </div>

        <div id="section-platform" className="mb-8 scroll-mt-32">
            <div className="flex flex-col">
                <InputField 
                    label="Participant Age" 
                    type="number" 
                    unit="yrs" 
                    value={values.age} 
                    onChange={(v) => handleChange('age', v)} 
                    error={errors.age} 
                    readOnly={isLockedByState('platform') || !!initialDefaults.age} 
                    visible={match("Participant Age", !!histories.age)} 
                    initialHistory={histories.age}
                    showEditActions={isConsentUnlocked}
                    confirmable={false}
                />
                <InputField 
                    label="Weight" 
                    type="number" 
                    unit="kg" 
                    value={values.weight} 
                    onChange={(v) => handleChange('weight', v)} 
                    readOnly={isLockedByState('platform') || !!initialDefaults.weight} 
                    visible={match("Weight", true)} 
                    initialHistory={histories.weight}
                    showEditActions={isConsentUnlocked}
                    confirmable={false}
                />
                <InputField label="Capacity to Consent?" type="select" options={['Yes', 'No']} value={values.consent_capacity} onChange={(v) => handleChange('consent_capacity', v)} error={errors.consent_capacity} readOnly={isLockedByState('platform') || !!initialDefaults.consent_capacity} visible={match("Capacity to Consent?")} />
                <InputField label="Is participant pregnant?" type="select" options={['Yes', 'No', 'Unknown']} value={values.pregnant} onChange={(v) => handleChange('pregnant', v)} error={errors.pregnant} readOnly={isLockedByState('platform') || !!initialDefaults.pregnant} visible={match("Is participant pregnant?")} />
                
                {platformBasicsProvided && (
                    <div className="mt-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="border-t border-gray-100"></div>
                        <InputField 
                            label="SARS-CoV-2 Status" 
                            type="select" 
                            options={['Positive', 'Negative', 'Unknown']} 
                            value={values.sars_cov_2} 
                            onChange={(v) => handleChange('sars_cov_2', v)} 
                            readOnly={isLockedByState('platform')} 
                            visible={match("SARS-CoV-2 Status", true)} 
                            initialHistory={histories.sars_cov_2} 
                            showEditActions={isConsentUnlocked}
                            confirmable={false} 
                        />
                        <div className="border-b border-gray-100"></div>
                    </div>
                )}
            </div>
        </div>

        {platformComplete && values.sars_cov_2 === 'Negative' && isVisible('antibiotics') && (
            <div id="section-antibiotics" className="mb-8 scroll-mt-32 transition-opacity animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex flex-col">
                    <InputField label="Suspected Infection?" type="select" options={['Yes', 'No']} value={values.suspected_infection} onChange={(v) => handleChange('suspected_infection', v)} error={errors.suspected_infection} readOnly={isLockedByState('antibiotics')} visible={match("Suspected Infection?")} />
                    {values.suspected_infection === 'Yes' && (
                        <>
                            <InputField label="Antibiotics > 24h?" type="select" options={['Yes', 'No']} value={values.antibiotics_24h} onChange={(v) => handleChange('antibiotics_24h', v)} error={errors.antibiotics_24h} readOnly={isLockedByState('antibiotics')} visible={match("Antibiotics > 24h?")} />
                            <InputField label="Known Allergy?" type="select" options={['Yes', 'No']} value={values.allergy} onChange={(v) => handleChange('allergy', v)} error={errors.allergy} readOnly={isLockedByState('antibiotics')} visible={match("Known Allergy?")} />
                        </>
                    )}
                    {values.suspected_infection === 'Yes' && values.antibiotics_24h === 'No' && values.allergy === 'No' && (
                        <>
                            <InputField label="Sepsis Severity" type="select" options={['Mild', 'Moderate', 'Severe', 'Septic Shock']} value={values.sepsis_severity} onChange={(v) => handleChange('sepsis_severity', v)} readOnly={isLockedByState('antibiotics')} visible={match("Sepsis Severity", true)} initialHistory={histories.sepsis_severity} showEditActions={isConsentUnlocked} confirmable={false} />
                            <InputField label="Lactate Level" type="number" unit="mmol/L" value={values.lactate} onChange={(v) => handleChange('lactate', v)} readOnly={isLockedByState('antibiotics')} visible={match("Lactate Level", true)} initialHistory={histories.lactate} showEditActions={isConsentUnlocked} confirmable={false} />
                        </>
                    )}
                </div>
            </div>
        )}

        {platformComplete && values.sars_cov_2 === 'Positive' && isVisible('anticoagulation') && (
            <div id="section-anticoagulation" className="mb-8 scroll-mt-32 transition-opacity animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex flex-col">
                    <InputField label="Active Bleeding?" type="select" options={['Yes', 'No']} value={values.active_bleeding} onChange={(v) => handleChange('active_bleeding', v)} error={errors.active_bleeding} readOnly={isLockedByState('anticoagulation')} visible={match("Active Bleeding?")} />
                    {values.active_bleeding === 'No' && (
                        <>
                            <InputField label="Platelet Count" type="number" unit="x10^9/L" value={values.platelet_count} onChange={(v) => handleChange('platelet_count', v)} error={errors.platelet_count} readOnly={isLockedByState('anticoagulation')} visible={match("Platelet Count", true)} initialHistory={histories.platelet_count} showEditActions={isConsentUnlocked} confirmable={false} />
                            <InputField label="APTT Ratio" type="number" value={values.aptt_ratio} onChange={(v) => handleChange('aptt_ratio', v)} readOnly={isLockedByState('anticoagulation')} visible={match("APTT Ratio", true)} initialHistory={histories.aptt_ratio} showEditActions={isConsentUnlocked} confirmable={false} />
                        </>
                    )}
                </div>
            </div>
        )}

        {platformComplete && values.sars_cov_2 === 'Positive' && isVisible('respiratory') && (
            <div id="section-respiratory" className="mb-8 scroll-mt-32 transition-opacity animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex flex-col">
                    <InputField label="Hypoxemia Present?" type="select" options={['Yes', 'No']} value={values.hypoxemia} onChange={(v) => handleChange('hypoxemia', v)} error={errors.hypoxemia} readOnly={isLockedByState('respiratory')} visible={match("Hypoxemia Present?")} />
                    {values.hypoxemia === 'Yes' && (
                        <>
                            <InputField label="SpO2 Level" type="number" unit="%" value={values.spo2_level} onChange={(v) => handleChange('spo2_level', v)} error={errors.spo2_level} readOnly={isLockedByState('respiratory')} visible={match("SpO2 Level", true)} initialHistory={histories.spo2_level} showEditActions={isConsentUnlocked} confirmable={false} />
                        </>
                    )}
                </div>
            </div>
        )}

        {platformComplete && values.sars_cov_2 === 'Unknown' && isVisible('statins') && (
            <div id="section-statins" className="mb-8 scroll-mt-32 transition-opacity animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex flex-col">
                    <InputField label="Severe Liver Disease?" type="select" options={['Yes', 'No']} value={values.liver_disease} onChange={(v) => handleChange('liver_disease', v)} error={errors.liver_disease} readOnly={isLockedByState('statins')} visible={match("Severe Liver Disease?")} />
                    {values.liver_disease === 'No' && (
                        <InputField label="Currently on Statins?" type="select" options={['Yes', 'No']} value={values.taking_statins} onChange={(v) => handleChange('taking_statins', v)} readOnly={isLockedByState('statins')} visible={match("Currently on Statins?")} />
                    )}
                    {values.liver_disease === 'No' && values.taking_statins && (
                        <InputField label="Cholesterol Level" type="select" options={['Normal', 'Elevated', 'High']} value={values.cholesterol_level} onChange={(v) => handleChange('cholesterol_level', v)} readOnly={isLockedByState('statins')} visible={match("Cholesterol Level", true)} initialHistory={histories.cholesterol_level} showEditActions={isConsentUnlocked} confirmable={false} />
                    )}
                </div>
            </div>
        )}

        {platformComplete && values.sars_cov_2 === 'Unknown' && isVisible('vasopressors') && (
            <div id="section-vasopressors" className="mb-0 scroll-mt-32 transition-opacity animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex flex-col">
                    <InputField label="Shock Present?" type="select" options={['Yes', 'No']} value={values.shock_present} onChange={(v) => handleChange('shock_present', v)} error={errors.shock_present} readOnly={isLockedByState('vasopressors')} visible={match("Shock Present?")} />
                    {values.shock_present === 'Yes' && (
                        <>
                            <InputField label="Current Vasopressor Use?" type="text" value={values.vasopressor_use} onChange={(v) => handleChange('vasopressor_use', v)} readOnly={isLockedByState('vasopressors')} visible={match("Current Vasopressor Use?", true)} initialHistory={histories.vasopressor_use} showEditActions={isConsentUnlocked} confirmable={false} />
                            <InputField label="MAP Target" type="number" unit="mmHg" value={values.map_target} onChange={(v) => handleChange('map_target', v)} readOnly={isLockedByState('vasopressors')} visible={match("MAP Target", true)} initialHistory={histories.map_target} showEditActions={isConsentUnlocked} confirmable={false} />
                        </>
                    )}
                </div>
            </div>
        )}

        {eligibleDomains.length > 0 && (
            <div className="mt-12 pt-12 border-t border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h3 className="text-lg font-serif text-gray-900 mb-6">Coordinator Confirmation</h3>
                
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-3">
                        <label className="text-sm font-medium text-gray-700">
                            Is the research coordinator acting for the best interest of the participant?
                        </label>
                    </div>

                    <div className="space-y-4 pt-2 border-t border-gray-100">
                        {eligibleDomains.map(domainId => {
                            const domainName = (domainId === 'antibiotics' ? 'Antibiotics' : 
                                              domainId === 'anticoagulation' ? 'Anticoagulation' : 
                                              domainId === 'statins' ? 'Statins' : 
                                              domainId === 'vasopressors' ? 'Vasopressors' : 
                                              domainId === 'respiratory' ? 'Respiratory' : domainId);
                            const fieldName = `confirm_${domainId}`;
                            return (
                                <div key={domainId} className="flex items-center justify-between py-2 max-w-md">
                                    <span className="text-sm font-medium text-gray-700">{domainName}</span>
                                    <div className="flex gap-4">
                                        {['Yes', 'No'].map((option) => (
                                            <label key={option} className="flex items-center gap-2 cursor-pointer group">
                                                <input
                                                    type="radio"
                                                    name={fieldName}
                                                    value={option}
                                                    checked={values[fieldName] === option}
                                                    onChange={(e) => {
                                                        const newVal = e.target.value;
                                                        setValues(prev => {
                                                            const next = { ...prev, [fieldName]: newVal };
                                                            // If any domain is confirmed "Yes", set best_interest to "Yes"
                                                            const anyConfirmed = Object.keys(next).some(k => k.startsWith('confirm_') && next[k] === 'Yes');
                                                            if (anyConfirmed) {
                                                                next.best_interest = 'Yes';
                                                            } else {
                                                                // If they are all "No" or unselected, we might want to keep it "No" or undefined
                                                                // But usually if they are here, they are acting in best interest if they say Yes to any
                                                                next.best_interest = 'No';
                                                            }
                                                            return next;
                                                        });
                                                    }}
                                                    disabled={!canEdit}
                                                    className="w-4 h-4 text-brand-600 border-gray-300 focus:ring-brand-500 cursor-pointer disabled:cursor-not-allowed"
                                                />
                                                <span className="text-sm text-gray-600 group-hover:text-gray-900">{option}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default EligibilityForm;
