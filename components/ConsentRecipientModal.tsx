import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { Participant, EligibilityDomain } from '../types';

interface ConsentRecipientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (recipient: string, selectedDomainIds: string[], isAnalogue: boolean, situation: string) => void;
  participant: Participant;
  domains: EligibilityDomain[];
}

const RECIPIENTS = [
  { id: 'participant', label: 'Participant' },
  { id: 'guardian', label: 'Legal Guardian / Representative' },
  { id: 'minor', label: 'Minor with Assent' },
  { id: 'witness', label: 'Impartial Witness' },
];

const SITUATION_OPTIONS = [
  { id: 'Standard', label: 'Standard' },
  { id: 'Change in capacity', label: 'Change in capacity' },
  { id: 'Change in representative', label: 'Change in representative' },
  { id: 'Protocol amendment', label: 'Protocol amendment' },
];

const ConsentRecipientModal: React.FC<ConsentRecipientModalProps> = ({ isOpen, onClose, onConfirm, participant, domains }) => {
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [selectedSituation, setSelectedSituation] = useState<string>('');
  const [isAnalogue, setIsAnalogue] = useState<boolean>(true);
  
  // Filter domains that are eligible, in progress, or not eligible
  const actionableDomains = domains.filter(d => d.status === 'ELIGIBLE' || d.status === 'IN_PROGRESS' || d.status === 'NOT_ELIGIBLE');
  
  const [selectedDomainIds, setSelectedDomainIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedRecipient('');
      setSelectedSituation('');
      setIsAnalogue(true);
      // Auto-select only ELIGIBLE or IN_PROGRESS, but allow NOT_ELIGIBLE to be selected manually
      setSelectedDomainIds(actionableDomains.filter(d => d.status !== 'NOT_ELIGIBLE').map(d => d.id));
    }
  }, [isOpen, domains]);

  if (!isOpen) return null;

  const toggleDomain = (id: string) => {
    setSelectedDomainIds(prev => 
      prev.includes(id) ? prev.filter(dId => dId !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    onConfirm(selectedRecipient, selectedDomainIds, isAnalogue, selectedSituation);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900">
            Create Consent Request
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <Icons.X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Consent Recipient
            </label>
            <div className="relative">
              <select
                value={selectedRecipient}
                onChange={(e) => setSelectedRecipient(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block p-2.5 pr-8"
              >
                <option value="" disabled>Select...</option>
                {RECIPIENTS.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <Icons.ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Scenario
            </label>
            <div className="relative">
              <select
                value={selectedSituation}
                onChange={(e) => setSelectedSituation(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block p-2.5 pr-8"
              >
                <option value="" disabled>Select...</option>
                {SITUATION_OPTIONS.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <Icons.ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Consent Mode
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isAnalogue ? 'Printed Doc' : 'Digital'}</span>
                <button 
                  onClick={() => setIsAnalogue(!isAnalogue)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isAnalogue ? 'bg-brand-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isAnalogue ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isAnalogue ? 'Print the consent form for a physical signature.' : 'Participant receives a link to sign electronically.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Domains
            </label>
            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
              {actionableDomains.map((domain) => (
                <label
                  key={domain.id}
                  className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedDomainIds.includes(domain.id)}
                    onChange={() => toggleDomain(domain.id)}
                    className="w-4 h-4 text-brand-600 bg-gray-100 border-gray-300 rounded focus:ring-brand-500"
                  />
                  <div className="ml-3 flex-1 flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">{domain.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      domain.status === 'ELIGIBLE' ? 'bg-green-100 text-green-700' : 
                      domain.status === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-700' : 
                      'bg-red-100 text-red-700'
                    }`}>
                      {domain.status === 'ELIGIBLE' ? 'Eligible' : 
                       domain.status === 'IN_PROGRESS' ? 'In Progress' : 
                       'Denied'}
                    </span>
                  </div>
                </label>
              ))}
              {actionableDomains.length === 0 && (
                <p className="text-sm text-gray-500 italic">No domains available.</p>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-bold text-xs uppercase tracking-widest rounded-full hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedDomainIds.length === 0 || !selectedRecipient || !selectedSituation}
            className={`flex-1 px-4 py-2.5 font-bold text-xs uppercase tracking-widest rounded-full shadow-md active:scale-95 transition-all
              ${(selectedDomainIds.length === 0 || !selectedRecipient || !selectedSituation) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-brand-600 text-white hover:bg-brand-700'}
            `}
          >
            Confirm & Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentRecipientModal;
