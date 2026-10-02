import React from 'react';
import { Icons } from './Icons';
import { Participant, Site } from '../types';

interface ParticipantInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: Participant | null;
  site: Site | undefined;
}

const ParticipantInfoModal: React.FC<ParticipantInfoModalProps> = ({ isOpen, onClose, participant, site }) => {
  if (!isOpen || !participant) return null;

  // Mock created date for now as it's not in the participant model
  const createdDate = "12.09.2025"; 

  const displayUid = participant.randomisedId ? participant.uid.replace('SCR', 'PAR') : participant.uid;
  const displayId = participant.randomisedId || participant.id;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900 bg-opacity-40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-8 pt-8 pb-4">
          <div className="flex flex-col">
            <span className={`text-sm font-semibold uppercase tracking-widest mb-1 ${participant.randomisedId ? 'text-brand-600' : 'text-gray-500'}`}>{displayUid}</span>
            <h2 className={`font-bold font-sans ${participant.randomisedId ? 'text-4xl text-brand-900' : 'text-3xl text-gray-900'}`}>
              {displayId}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 mt-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700">
            <Icons.X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="px-8 pb-8 space-y-8">
          <div className="border-b border-gray-200 pb-2">
            <p className="text-sm text-gray-500">Created on {createdDate}</p>
          </div>
          <div className="pt-2 flex justify-between items-start">
            <div>
              <span className="inline-flex items-center px-2.5 py-1 rounded border border-green-300 bg-green-100 text-green-800 text-sm font-medium">
                  Active
              </span>
            </div>
            <div className="text-left">
                  <p className="text-sm text-gray-500">Site</p>
                  <p className="text-base font-medium text-gray-800">{site?.name || 'N/A'}</p>
            </div>
          </div>

          {participant.consentRecipient && (
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex items-start animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="p-2 bg-brand-100 rounded-lg mr-3 text-brand-600">
                <Icons.User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-brand-500 uppercase tracking-widest">Consent Recipient</p>
                <p className="text-sm font-bold text-brand-900 capitalize mt-0.5">
                  {participant.consentRecipient}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-white border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-6">
             <button className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors">
              Deactivate
            </button>
             <button className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
              Transfer site
            </button>
          </div>
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-full font-medium text-sm bg-brand-600 text-white hover:bg-brand-700 shadow-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParticipantInfoModal;