import React, { useState } from 'react';
import { Icons } from './Icons';

interface RecipientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (recipient: string) => void;
}

const RECIPIENTS = [
  { id: 'participant', label: 'Participant', description: 'The participant will provide consent themselves.' },
  { id: 'guardian', label: 'Guardian / Legal Representative', description: 'A legal guardian or representative will provide consent.' },
  { id: 'minor', label: 'Minor with Assent', description: 'The minor will provide assent, and a guardian will provide consent.' },
  { id: 'emergency', label: 'Emergency / Deferred', description: 'Consent is deferred due to emergency circumstances.' }
];

const RecipientModal: React.FC<RecipientModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [selected, setSelected] = useState<string>('participant');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900">Select Consent Recipient</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <Icons.X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-6">
            Please specify who will be providing consent for this participant before proceeding.
          </p>

          <div className="space-y-3">
            {RECIPIENTS.map((recipient) => (
              <button
                key={recipient.id}
                onClick={() => setSelected(recipient.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 ${
                  selected === recipient.id
                    ? 'border-brand-600 bg-brand-50/50 ring-1 ring-brand-600'
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  selected === recipient.id ? 'border-brand-600' : 'border-gray-300'
                }`}>
                  {selected === recipient.id && <div className="w-2.5 h-2.5 rounded-full bg-brand-600" />}
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">{recipient.label}</div>
                  <div className="text-xs text-gray-500 mt-1 leading-relaxed">{recipient.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(RECIPIENTS.find(r => r.id === selected)?.label || selected)}
            className="px-6 py-2 bg-brand-600 text-white rounded-full text-sm font-bold hover:bg-brand-700 transition-all shadow-sm active:scale-95"
          >
            Confirm & Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecipientModal;
