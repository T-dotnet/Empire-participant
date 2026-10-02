import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import { Note } from '../types';

const RC_OPTIONS = ['Dr. Sarah Chan', 'Dr. Emily Wong', 'Nurse John Smith', 'Prof. David Miller'];
const EXTRA_OPTIONS = ['Interpreter', 'Witness', 'Guardian', 'Legal Representative', 'Staff'];
const OTHER_OPTIONS = ['Participant', 'Parent or Guardian', 'Family Member', 'Interpreter', 'Witness', 'Legal Representative', 'Staff'];

export const parseNoteContent = (content: string) => {
  const match = content.match(/^\[(.*?) - (.*?)\]:\s*([\s\S]*)$/);
  if (match) {
    return {
      type: 'Consent Document',
      docName: match[1],
      docId: match[2],
      body: match[3]
    };
  }
  
  const lines = content.split('\n');
  let type = '';
  let docName = '';
  let docId = '';
  let time = '';
  let body = [];
  
  let inHeader = true;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && line.startsWith('[') && line.endsWith(']')) {
      type = line.substring(1, line.length - 1);
      continue;
    }
    
    if (inHeader) {
      if (line.startsWith('Doc: ') || line.startsWith('Event: ')) {
        docName = line.substring(line.indexOf(': ') + 2);
      } else if (line.startsWith('Doc ID: ') || line.startsWith('Event ID: ')) {
        docId = line.substring(line.indexOf(': ') + 2);
      } else if (line.startsWith('Time: ')) {
        time = line.substring(line.indexOf(': ') + 2);
      } else if (line.trim() === '') {
        inHeader = false;
      } else {
        inHeader = false;
        body.push(line);
      }
    } else {
      body.push(line);
    }
  }
  
  return {
    type: type || 'Note',
    docName,
    docId,
    time,
    body: body.join('\n').trim()
  };
};

const SearchableDropdown = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select...",
  disabled = false
}: { 
  options: string[], 
  value: string, 
  onChange: (val: string) => void,
  placeholder?: string,
  disabled?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm flex justify-between items-center transition-colors ${disabled ? 'bg-gray-50 cursor-not-allowed text-gray-500' : 'bg-white cursor-pointer hover:border-gray-400'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={value ? (disabled ? "text-gray-500" : "text-gray-900") : "text-gray-500"}>
          {value || placeholder}
        </span>
        <Icons.ChevronDown className="w-4 h-4 text-gray-400" />
      </div>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Icons.Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 transform -translate-y-1/2" />
              <input 
                type="text"
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded bg-gray-50 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <div 
                  key={opt}
                  className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  {opt}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-gray-400 italic">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string, type: 'general' | 'process' | 'outcome', data?: any) => void;
  notes?: Note[];
  episode?: any;
  consentRecipient?: string;
  readOnly?: boolean;
  initialTab?: 'view' | 'process' | 'outcome';
}

const NoteModal: React.FC<NoteModalProps> = ({ isOpen, onClose, onSave, notes = [], episode, consentRecipient, readOnly = false, initialTab }) => {
  const [activeTab, setActiveTab] = useState<'view' | 'process' | 'outcome'>('view');
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [isProcessDataOpen, setIsProcessDataOpen] = useState(true);
  const [isProcessNoteOpen, setIsProcessNoteOpen] = useState(true);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  
  // Process
  const [processDateTime, setProcessDateTime] = useState('');
  const [siteSideSelections, setSiteSideSelections] = useState<string[]>([]);
  const [otherTextEntries, setOtherTextEntries] = useState<{role: string, name: string}[]>([]);
  
  // Outcome
  const [outcomeStaffSelections, setOutcomeStaffSelections] = useState<string[]>([]);
  const [outcomeOtherTextEntries, setOutcomeOtherTextEntries] = useState<{role: string, name: string}[]>([]);
  const [outcomeDateTime, setOutcomeDateTime] = useState('');
  const [outcomeNote, setOutcomeNote] = useState('');
  const [domainVerifications, setDomainVerifications] = useState<Record<string, boolean | undefined>>({});
  const [showOutcomeConfirm, setShowOutcomeConfirm] = useState(false);
  const [quickNote, setQuickNote] = useState('');

  useEffect(() => {
    if (isOpen && episode && episode.rows && episode.rows.length > 0) {
      const firstDoc = episode.rows[0];
      setSelectedDocId(firstDoc.version);
      
      const initialVerifications: Record<string, boolean | undefined> = {};
      if (firstDoc.domains) {
        firstDoc.domains.forEach((d: any) => {
          if (d.consentStatus === 'OBTAINED') {
            initialVerifications[d.id] = true;
          } else {
            initialVerifications[d.id] = false;
          }
        });
      }
      setDomainVerifications(initialVerifications);
    }
  }, [isOpen, episode?.id]);

  useEffect(() => {
    if (episode && episode.rows && selectedDocId) {
      const selectedRow = episode.rows.find((r: any) => r.version === selectedDocId);
      if (selectedRow) {
        const initialVerifications: Record<string, boolean | undefined> = {};
        if (selectedRow.domains) {
          selectedRow.domains.forEach((d: any) => {
            if (d.consentStatus === 'OBTAINED') {
              initialVerifications[d.id] = true;
            } else {
              initialVerifications[d.id] = false;
            }
          });
        }
        setDomainVerifications(initialVerifications);
      }
    }
  }, [selectedDocId, episode]);

  const selectedRow = episode?.rows?.find((r: any) => r.version === selectedDocId);
  const hasProcessData = selectedRow ? (
    selectedRow.processDateTime || 
    (selectedRow.siteSideSelections && selectedRow.siteSideSelections.length > 0) || 
    (selectedRow.otherTextEntries && selectedRow.otherTextEntries.length > 0) ||
    selectedRow.processNote
  ) : false;

  useEffect(() => {
    if (selectedRow) {
      setProcessDateTime(selectedRow.processDateTime || '');
      setSiteSideSelections(selectedRow.siteSideSelections || []);
      setOtherTextEntries(selectedRow.otherTextEntries || []);
    } else {
      setProcessDateTime('');
      setSiteSideSelections([]);
      setOtherTextEntries([]);
    }
    setQuickNote('');
  }, [selectedRow]);

  useEffect(() => {
    if (isOpen) {
      if (readOnly) {
        setActiveTab('view');
      } else {
        if (initialTab === 'outcome') {
          setActiveTab('outcome');
        } else {
          setActiveTab('process');
        }
      }
      setShowOutcomeConfirm(false);
    }
  }, [isOpen, initialTab, hasProcessData, readOnly]);

  const filteredNotes = React.useMemo(() => {
    if (!episode || !episode.rows) return notes;
    const episodeDocIds = new Set(episode.rows.map((r: any) => r.version));
    let result = notes.filter(note => {
      const parsed = parseNoteContent(note.content);
      return parsed.docId && episodeDocIds.has(parsed.docId);
    });

    if (activeTab === 'process') {
      result = result.filter(note => {
        const parsed = parseNoteContent(note.content);
        return parsed.type === 'Process note' || parsed.type === 'Process data';
      });
    }

    // Sort notes: Process data first, then Process notes by time, then Consent Outcome last
    // (This order will be reversed in the UI)
    result.sort((a, b) => {
      const parsedA = parseNoteContent(a.content);
      const parsedB = parseNoteContent(b.content);

      const getOrder = (type: string) => {
        if (type === 'Process data') return 0;
        if (type === 'Process note') return 1;
        if (type === 'Outcome Note' || type === 'Consent Document') return 2;
        return 1;
      };

      const orderA = getOrder(parsedA.type);
      const orderB = getOrder(parsedB.type);

      if (orderA !== orderB) return orderA - orderB;

      // Same type, sort by timestamp
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    return result;
  }, [notes, episode, activeTab]);

  if (!isOpen) return null;

  const handleSave = (recordNote: boolean = true) => {
    let finalContent = '';
    
    let docName = '';
    if (episode && episode.rows) {
      const selectedRow = episode.rows.find((r: any) => r.version === selectedDocId);
      if (selectedRow) {
        const recipient = selectedRow.recipient || consentRecipient || 'Participant';
        const situation = selectedRow.situation || 'Standard';
        docName = `${recipient} ${situation}`;
      }
    }

    const docRef = `Doc: ${docName || 'Unknown'}\nDoc ID: ${selectedDocId || 'Unknown'}\nTime: ${new Date().toLocaleString('en-GB')}\n\n`;

    if (activeTab === 'process' || activeTab === 'view') {
      if (!quickNote.trim() && !processDateTime && siteSideSelections.length === 0 && otherTextEntries.length === 0) return;
      
      if (recordNote) {
        finalContent = `[Process data]\n${docRef}`;
        
        // Include process data details
        if (processDateTime) finalContent += `Date and time presented: ${processDateTime}\n`;
        if (siteSideSelections.length > 0) finalContent += `Site Staff Present: ${siteSideSelections.filter(Boolean).join(', ')}\n`;
        if (otherTextEntries.length > 0) {
          const otherStrings = otherTextEntries
            .filter(e => e.role)
            .map(e => e.name ? `${e.role} (${e.name})` : e.role);
          if (otherStrings.length > 0) {
            finalContent += `Other Attendees: ${otherStrings.join(', ')}\n`;
          }
        }
        
        if (quickNote.trim()) finalContent += `Note: ${quickNote.trim()}`;
      }
      
      onSave(finalContent.trim(), 'process', {
        docId: selectedDocId,
        processDateTime,
        siteSideSelections,
        otherTextEntries,
        processNote: quickNote.trim(),
        fromTab: activeTab
      });
      setQuickNote('');
    } else if (activeTab === 'outcome') {
      const hasVerifications = Object.values(domainVerifications).some(v => v !== undefined);
      const hasYes = Object.values(domainVerifications).some(v => v === true);
      
      if (!outcomeNote.trim() && !outcomeDateTime && !hasVerifications) return;
      
      if (recordNote) {
        finalContent = `[Outcome]\n${docRef}`;
        if (outcomeDateTime) finalContent += `Date & Time: ${outcomeDateTime}\n`;
        
        if (hasVerifications) {
          finalContent += `Participant Consented:\n`;
          const selectedRow = episode.rows.find((r: any) => r.version === selectedDocId);
          if (selectedRow && selectedRow.domains) {
            selectedRow.domains.forEach((d: any) => {
              if (domainVerifications[d.id] !== undefined) {
                finalContent += `  - ${d.name}: ${domainVerifications[d.id] ? 'YES' : 'NO'}\n`;
              }
            });
          }
        }

        if (hasYes) {
          if (outcomeStaffSelections.length > 0) finalContent += `Site Staff Present: ${outcomeStaffSelections.filter(Boolean).join(', ')}\n`;
          if (outcomeOtherTextEntries.length > 0) {
            const otherStrings = outcomeOtherTextEntries
              .filter(e => e.role)
              .map(e => e.name ? `${e.role} (${e.name})` : e.role);
            if (otherStrings.length > 0) {
              finalContent += `Other Attendees: ${otherStrings.join(', ')}\n`;
            }
          }
        }

        if (outcomeNote) finalContent += `Note: ${outcomeNote}`;
      }
      
      onSave(finalContent.trim(), 'outcome', {
        docId: selectedDocId,
        outcomeDateTime,
        outcomeNote: recordNote ? outcomeNote : '',
        domainVerifications,
        outcomeStaffSelections,
        outcomeOtherTextEntries
      });
    }
    
    // Reset fields
    if (activeTab === 'process') {
      setQuickNote('');
    } else if (activeTab === 'outcome') {
      setOutcomeStaffSelections([]);
      setOutcomeOtherTextEntries([]);
      setOutcomeDateTime('');
      setOutcomeNote('');
      setDomainVerifications({});
    }
  };

  const hasYes = Object.values(domainVerifications).some(v => v === true);

  const isSaveDisabled = () => {
    if (activeTab === 'process' || activeTab === 'view') return !quickNote.trim() && !processDateTime && siteSideSelections.length === 0 && otherTextEntries.length === 0;
    if (activeTab === 'outcome') {
      const hasVerifications = Object.values(domainVerifications).some(v => v !== undefined);
      
      if (!hasYes) {
        return !outcomeDateTime && !hasVerifications && !outcomeNote.trim();
      }
      return !outcomeNote.trim() && !outcomeDateTime && !hasVerifications;
    }
    return true;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col h-[800px] max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-gray-900">Consent details</h3>
            {episode && episode.rows && selectedDocId && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-medium text-gray-500">
                  {episode.rows.find((r: any) => r.version === selectedDocId)?.recipient || consentRecipient || 'Participant'} {episode.rows.find((r: any) => r.version === selectedDocId)?.situation || 'Standard'}
                </span>
                <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                  {selectedDocId}
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Icons.X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* Document Selection (Hidden) */}
          {/* The selected note is always the active one (latest one) */}

          {/* Tabs */}
          {!readOnly && (
            <div className="border-b border-gray-200 mb-8">
              <div className="flex space-x-8">
                {[
                  { id: 'process', label: 'Process' },
                  { id: 'outcome', label: 'Episode outcome' }
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  const isDisabled = tab.id === 'outcome' && !hasProcessData;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => !isDisabled && setActiveTab(tab.id as any)}
                      disabled={isDisabled}
                      className={`
                        py-4 text-sm font-medium border-b-2 transition-colors relative flex items-center
                        ${isActive 
                          ? 'border-brand-600 text-gray-900' 
                          : isDisabled
                            ? 'border-transparent text-gray-300 cursor-not-allowed'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab Content */}
          {!readOnly && (activeTab === 'process' || activeTab === 'view' || activeTab === 'outcome') && (
            <div className="divide-y divide-gray-100">
              {activeTab === 'process' && (
                <div className="space-y-6">
                  {/* Process Data Accordion */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button 
                      onClick={() => setIsProcessDataOpen(!isProcessDataOpen)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span className="font-semibold text-gray-900">Process Data</span>
                      <Icons.ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isProcessDataOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isProcessDataOpen && (
                      <div className="p-6 bg-white border-t border-gray-200">
                        <div className="pb-4 text-sm text-gray-500">
                          Process data is the first meeting where the consent doc is presented to the participant.
                        </div>
                        <div className="flex flex-row items-start py-6">
                          <div className="w-1/3 pr-6 pt-2">
                            <label className="text-sm font-semibold text-gray-800">Date & Time Presented</label>
                          </div>
                          <div className="flex-1">
                            <div className="relative w-64">
                              <Icons.Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <input 
                                type="datetime-local"
                                value={processDateTime}
                                onChange={(e) => setProcessDateTime(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white transition-all"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-row items-start py-6">
                          <div className="w-1/3 pr-6 pt-2">
                            <label className="text-sm font-semibold text-gray-800">Site Staff Present</label>
                          </div>
                          <div className="flex-1 space-y-2">
                            {siteSideSelections.map((selection, index) => (
                              <div key={index} className="flex gap-2 items-center">
                                <div className="w-64">
                                  <SearchableDropdown 
                                    options={RC_OPTIONS}
                                    value={selection}
                                    onChange={(val) => {
                                      const newSelections = [...siteSideSelections];
                                      newSelections[index] = val;
                                      setSiteSideSelections(newSelections);
                                    }}
                                    placeholder="Select staff member..."
                                  />
                                </div>
                                {!hasProcessData && (
                                  <button 
                                    onClick={() => setSiteSideSelections(siteSideSelections.filter((_, i) => i !== index))}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                  >
                                    <Icons.X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button 
                              onClick={() => setSiteSideSelections([...siteSideSelections, ''])}
                              className="flex items-center gap-2 text-xs text-brand-600 font-bold uppercase tracking-wider hover:text-brand-700 transition-colors mt-2"
                            >
                              <Icons.Plus className="w-3.5 h-3.5" />
                              Add Site Staff
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-row items-start py-6">
                          <div className="w-1/3 pr-6 pt-2">
                            <label className="text-sm font-semibold text-gray-800">Other Attendees</label>
                          </div>
                          <div className="flex-1 space-y-4">
                            {otherTextEntries.map((entry, index) => (
                              <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                                <div className="flex gap-2 items-center">
                                  <div className="w-64">
                                    <SearchableDropdown 
                                      options={OTHER_OPTIONS}
                                      value={entry.role}
                                      onChange={(val) => {
                                        const newEntries = [...otherTextEntries];
                                        newEntries[index] = { ...newEntries[index], role: val };
                                        setOtherTextEntries(newEntries);
                                      }}
                                      placeholder="Select role..."
                                    />
                                  </div>
                                  <button 
                                    onClick={() => setOtherTextEntries(otherTextEntries.filter((_, i) => i !== index))}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                  >
                                    <Icons.X className="w-4 h-4" />
                                  </button>
                                </div>
                                {entry.role && entry.role !== 'Participant' && (
                                  <div className="w-64">
                                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5 ml-1">Name</label>
                                    {entry.role === 'Staff' ? (
                                      <SearchableDropdown 
                                        options={RC_OPTIONS}
                                        value={entry.name}
                                        onChange={(val) => {
                                          const newEntries = [...otherTextEntries];
                                          newEntries[index] = { ...newEntries[index], name: val };
                                          setOtherTextEntries(newEntries);
                                        }}
                                        placeholder="Select staff..."
                                      />
                                    ) : (
                                      <input 
                                        type="text"
                                        value={entry.name}
                                        onChange={(e) => {
                                          const newEntries = [...otherTextEntries];
                                          newEntries[index] = { ...newEntries[index], name: e.target.value };
                                          setOtherTextEntries(newEntries);
                                        }}
                                        placeholder="Enter name..."
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white transition-all"
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                            <button 
                              onClick={() => setOtherTextEntries([...otherTextEntries, { role: '', name: '' }])}
                              className="flex items-center gap-2 text-xs text-brand-600 font-bold uppercase tracking-wider hover:text-brand-700 transition-colors mt-2"
                            >
                              <Icons.Plus className="w-3.5 h-3.5" />
                              Add Other Attendees
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Process Note Accordion */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button 
                      onClick={() => setIsProcessNoteOpen(!isProcessNoteOpen)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span className="font-semibold text-gray-900">Process Note</span>
                      <Icons.ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isProcessNoteOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isProcessNoteOpen && (
                      <div className="p-6 bg-white border-t border-gray-200">
                        <div className="pb-4 text-sm text-gray-500">
                          Process note is used to collect any info related to first or any following meeting.
                        </div>
                        <div className="flex flex-row items-start py-6">
                          <div className="w-1/3 pr-6 pt-2">
                            <label className="text-sm font-semibold text-gray-800">Process notes</label>
                          </div>
                          <div className="flex-1">
                            <textarea
                              value={quickNote}
                              onChange={(e) => setQuickNote(e.target.value)}
                              placeholder="Add detailed process notes here..."
                              rows={4}
                              className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white resize-none transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'outcome' && (
                <>
                  <div className="pb-4 text-sm text-gray-500">
                    Episode outcome records the final decision as result of the consent meeting/s.
                  </div>
                  <div className="flex flex-row items-start py-6">
                    <div className="w-1/3 pr-6 pt-2">
                      <label className="text-sm font-semibold text-gray-800">Participant Consented</label>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex justify-end mb-2">
                        <button
                          onClick={() => {
                            const selectedRow = episode.rows.find((r: any) => r.version === selectedDocId);
                            if (selectedRow) {
                              const newVerifications: Record<string, boolean> = {};
                              selectedRow.domains.forEach((d: any) => {
                                newVerifications[d.id] = true;
                              });
                              setDomainVerifications(newVerifications);
                            }
                          }}
                          className="text-[10px] font-bold text-brand-600 hover:text-brand-700 uppercase tracking-wider transition-colors"
                        >
                          Yes to all
                        </button>
                      </div>
                      {episode?.rows?.find((r: any) => r.version === selectedDocId)?.domains?.map((domain: any) => (
                        <div key={domain.id} className="flex items-center justify-between gap-4 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                          <span className="text-sm font-medium text-gray-900">{domain.name}</span>
                          <div className="flex bg-gray-100 p-0.5 rounded-lg">
                            <button
                              onClick={() => setDomainVerifications(prev => ({ ...prev, [domain.id]: true }))}
                              className={`px-4 py-1 text-[10px] font-bold rounded-md transition-all ${domainVerifications[domain.id] === true ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                              YES
                            </button>
                            <button
                              onClick={() => setDomainVerifications(prev => ({ ...prev, [domain.id]: false }))}
                              className={`px-4 py-1 text-[10px] font-bold rounded-md transition-all ${domainVerifications[domain.id] === false ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                              NO
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-row items-start py-6">
                    <div className="w-1/3 pr-6 pt-2">
                      <label className="text-sm font-semibold text-gray-800">Date & Time</label>
                    </div>
                    <div className="flex-1">
                      <div className="relative w-64">
                        <Icons.Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input 
                          type="datetime-local"
                          value={outcomeDateTime}
                          onChange={(e) => setOutcomeDateTime(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {hasYes && (
                    <>
                      <div className="flex flex-row items-start py-6">
                        <div className="w-1/3 pr-6 pt-2">
                          <label className="text-sm font-semibold text-gray-800">Site Staff Present</label>
                        </div>
                        <div className="flex-1 space-y-3">
                          {outcomeStaffSelections.map((selection, index) => (
                            <div key={index} className="flex gap-2 items-center">
                              <div className="w-64">
                                <SearchableDropdown 
                                  options={RC_OPTIONS}
                                  value={selection}
                                  onChange={(val) => {
                                    const newSelections = [...outcomeStaffSelections];
                                    newSelections[index] = val;
                                    setOutcomeStaffSelections(newSelections);
                                  }}
                                  placeholder="Select staff member..."
                                />
                              </div>
                              <button 
                                onClick={() => setOutcomeStaffSelections(outcomeStaffSelections.filter((_, i) => i !== index))}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Icons.X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button 
                            onClick={() => setOutcomeStaffSelections([...outcomeStaffSelections, ''])}
                            className="flex items-center gap-2 text-xs text-brand-600 font-bold uppercase tracking-wider hover:text-brand-700 transition-colors mt-2"
                          >
                            <Icons.Plus className="w-3.5 h-3.5" />
                            Add Site Staff
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-row items-start py-6">
                        <div className="w-1/3 pr-6 pt-2">
                          <label className="text-sm font-semibold text-gray-800">Other Attendees</label>
                        </div>
                        <div className="flex-1 space-y-4">
                          {outcomeOtherTextEntries.map((entry, index) => (
                            <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                              <div className="flex gap-2 items-center">
                                <div className="w-64">
                                  <SearchableDropdown 
                                    options={OTHER_OPTIONS}
                                    value={entry.role}
                                    onChange={(val) => {
                                      const newEntries = [...outcomeOtherTextEntries];
                                      newEntries[index] = { ...newEntries[index], role: val };
                                      setOutcomeOtherTextEntries(newEntries);
                                    }}
                                    placeholder="Select role..."
                                  />
                                </div>
                                <button 
                                  onClick={() => setOutcomeOtherTextEntries(outcomeOtherTextEntries.filter((_, i) => i !== index))}
                                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Icons.X className="w-4 h-4" />
                                </button>
                              </div>
                              {entry.role && entry.role !== 'Participant' && (
                                <div className="w-64">
                                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5 ml-1">Name</label>
                                  {entry.role === 'Staff' ? (
                                    <SearchableDropdown 
                                      options={RC_OPTIONS}
                                      value={entry.name}
                                      onChange={(val) => {
                                        const newEntries = [...outcomeOtherTextEntries];
                                        newEntries[index] = { ...newEntries[index], name: val };
                                        setOutcomeOtherTextEntries(newEntries);
                                      }}
                                      placeholder="Select staff..."
                                    />
                                  ) : (
                                    <input 
                                      type="text"
                                      value={entry.name}
                                      onChange={(e) => {
                                        const newEntries = [...outcomeOtherTextEntries];
                                        newEntries[index] = { ...newEntries[index], name: e.target.value };
                                        setOutcomeOtherTextEntries(newEntries);
                                      }}
                                      placeholder="Enter name..."
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white transition-all"
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                          <button 
                            onClick={() => setOutcomeOtherTextEntries([...outcomeOtherTextEntries, { role: '', name: '' }])}
                            className="flex items-center gap-2 text-xs text-brand-600 font-bold uppercase tracking-wider hover:text-brand-700 transition-colors mt-2"
                          >
                            <Icons.Plus className="w-3.5 h-3.5" />
                            Add Other Attendees
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex flex-row items-start py-6">
                    <div className="w-1/3 pr-6 pt-2">
                      <label className="text-sm font-semibold text-gray-800">Outcome Note</label>
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={outcomeNote}
                        onChange={(e) => setOutcomeNote(e.target.value)}
                        placeholder="Add detailed notes about the consent outcome..."
                        rows={4}
                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white resize-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-3 mt-6">
                    <Icons.AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Once an outcome is recorded, the current consent episode will be closed, and the new document will be part of a new consent episode.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {!readOnly && (
            <div className="pt-6 pb-2 flex justify-end gap-3 border-t border-gray-100 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-500 font-bold uppercase tracking-wider hover:bg-gray-100 rounded-full transition-all text-[10px]"
              >
                Cancel
              </button>
              {((activeTab === 'process') || 
                (activeTab === 'view')
              ) && (
                <button
                  onClick={() => handleSave(true)}
                  disabled={isSaveDisabled()}
                  className="px-6 py-2 bg-brand-600 text-white font-bold uppercase tracking-wider rounded-full hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-[10px] shadow-sm"
                >
                  Save
                </button>
              )}
              {activeTab === 'outcome' && (
                <>
                  <button
                    onClick={() => handleSave(false)}
                    disabled={isSaveDisabled()}
                    className="px-6 py-2 bg-white border border-gray-300 text-gray-600 font-bold uppercase tracking-wider rounded-full hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-[10px] shadow-sm"
                  >
                    Save fields
                  </button>
                  <button
                    onClick={() => setShowOutcomeConfirm(true)}
                    disabled={isSaveDisabled()}
                    className="px-6 py-2 bg-brand-600 text-white font-bold uppercase tracking-wider rounded-full hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-[10px] shadow-sm"
                  >
                    Episode outcome
                  </button>
                </>
              )}
            </div>
          )}

          {/* Existing Notes */}
          {(activeTab !== 'outcome' || readOnly) && (
            filteredNotes.length > 0 ? (
              <div className="space-y-6 mt-8">
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">HISTORY</h4>
                    <div className="space-y-3">
                    {filteredNotes.slice().reverse().map((note, index, array) => {
                    const parsed = parseNoteContent(note.content);
                    const nextNote = array[index + 1];
                    const nextParsed = nextNote ? parseNoteContent(nextNote.content) : null;
                    const isNewDoc = nextParsed && nextParsed.docId !== parsed.docId;
                    const isNewEvent = isNewDoc && nextParsed?.type === 'Outcome Note';

                    return (
                      <React.Fragment key={note.id}>
                        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-900">{note.author}</span>
                              <span className="text-xs font-medium text-brand-600">{parsed.type}</span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded-md">
                              {new Date(note.timestamp).toLocaleString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              }).toLowerCase()}
                            </span>
                          </div>
                          
                          {(parsed.docName || parsed.docId) && (
                            <div className="bg-gray-50 rounded-lg p-3 mb-3 border border-gray-100">
                              <div className="flex flex-col gap-0.5">
                                {/* Doc ID (small grey) */}
                                {parsed.docId && (
                                  <span className="text-[10px] text-gray-400 font-mono">{parsed.docId}</span>
                                )}
                                {/* Recipient + scenarios (bold black) */}
                                {parsed.docName && (
                                  <span className="text-sm font-bold text-gray-900">{parsed.docName}</span>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {parsed.body}
                          </div>
                        </div>
                        {isNewDoc && (
                          <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                              <div className={`w-full border-t ${isNewEvent ? 'border-brand-200' : 'border-gray-200'}`}></div>
                            </div>
                            <div className="relative flex justify-center">
                              <span className={`bg-white px-3 text-[10px] font-bold uppercase tracking-widest ${isNewEvent ? 'text-brand-600' : 'text-gray-400'}`}>
                                {isNewEvent ? 'New Consent Episode Created' : 'New Document Created'}
                              </span>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
            ) : activeTab !== 'process' && (
              <div className="text-center py-20 text-gray-500">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icons.FileText className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-900">No history available</p>
                <p className="text-xs text-gray-500 mt-1">There are no notes or process data recorded for this document yet.</p>
              </div>
            )
          )}
        </div>

        {showOutcomeConfirm && (
          <div className="absolute inset-0 z-[110] flex items-center justify-center p-6 bg-white/90 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="max-w-sm w-full text-center space-y-4">
              <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto">
                <Icons.AlertCircle className="w-8 h-8 text-brand-600" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900">Confirm Outcome</h4>
                <p className="text-sm text-gray-500 mt-2">
                  Are you sure you want to record this outcome? This will close the current consent episode and start a new one.
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => {
                    handleSave(true);
                    setShowOutcomeConfirm(false);
                  }}
                  className="w-full py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-sm"
                >
                  Yes, episode outcome
                </button>
                <button
                  onClick={() => setShowOutcomeConfirm(false)}
                  className="w-full py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteModal;
