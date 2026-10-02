import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { Site } from '../types';

export interface AddParticipantFormData {
  initialName: string;
  initialMiddleName: string;
  initialSurname: string;
  dob: string;
  site: string;
  consent: string;
  collectedBy: string;
  date: string;
}

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: AddParticipantFormData) => void;
  currentSite: Site;
}

const AddParticipantModal: React.FC<AddParticipantModalProps> = ({ isOpen, onClose, onAdd, currentSite }) => {
  const [formData, setFormData] = useState<AddParticipantFormData>({
    initialName: '',
    initialMiddleName: '',
    initialSurname: '',
    dob: '',
    site: currentSite.name,
    consent: '',
    collectedBy: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        initialName: '',
        initialMiddleName: '',
        initialSurname: '',
        dob: '',
        site: currentSite.name,
        consent: '',
        collectedBy: '',
        date: new Date().toISOString().split('T')[0]
      });
    }
  }, [isOpen, currentSite]);

  const handleChange = (field: keyof AddParticipantFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAdd = () => {
    onAdd(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900 bg-opacity-40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-2xl font-serif text-gray-900">New participant</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700">
            <Icons.X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
            {/* Initials Split */}
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-900">Initial name</label>
                    <input 
                        type="text" 
                        maxLength={1}
                        value={formData.initialName}
                        onChange={(e) => handleChange('initialName', e.target.value.toUpperCase())}
                        className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-gray-900 bg-white text-center"
                        placeholder="F"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-900">Initial middle</label>
                    <input 
                        type="text" 
                        maxLength={1}
                        value={formData.initialMiddleName}
                        onChange={(e) => handleChange('initialMiddleName', e.target.value.toUpperCase())}
                        className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-gray-900 bg-white text-center"
                        placeholder="M"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-900">Initial Surname</label>
                    <input 
                        type="text" 
                        maxLength={1}
                        value={formData.initialSurname}
                        onChange={(e) => handleChange('initialSurname', e.target.value.toUpperCase())}
                        className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-gray-900 bg-white text-center"
                        placeholder="S"
                    />
                </div>
            </div>

            {/* DOB */}
            <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-900">Participant Date of Birth</label>
                <input 
                    type="date" 
                    value={formData.dob}
                    onChange={(e) => handleChange('dob', e.target.value)}
                    className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-gray-900 bg-white"
                />
            </div>

            {/* Site */}
            <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-900">Site</label>
                <div className="relative">
                    <select 
                        value={formData.site}
                        onChange={(e) => handleChange('site', e.target.value)}
                        disabled
                        className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 bg-gray-50 cursor-not-allowed"
                    >
                        <option>{currentSite.name}</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                        <Icons.ChevronDown className="w-4 h-4" />
                    </div>
                </div>
            </div>

             {/* Consent to collect data */}
            <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-900">Consent to collect data</label>
                <div className="relative">
                    <select 
                        value={formData.consent}
                        onChange={(e) => handleChange('consent', e.target.value)}
                        className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 bg-white"
                    >
                        <option value="" disabled>Select status</option>
                        <option>Yes, obtained</option>
                        <option>No, declined</option>
                        <option>Pending</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                        <Icons.ChevronDown className="w-4 h-4" />
                    </div>
                </div>
            </div>

             {/* Collected by */}
            <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-900">Collected by</label>
                <div className="relative">
                    <select 
                        value={formData.collectedBy}
                        onChange={(e) => handleChange('collectedBy', e.target.value)}
                        className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 bg-white"
                    >
                        <option value="" disabled>Select person</option>
                        <option>Dr. Sarah Chan</option>
                        <option>Research Nurse</option>
                        <option>Study Coordinator</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                        <Icons.ChevronDown className="w-4 h-4" />
                    </div>
                </div>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-900">Date</label>
                <input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => handleChange('date', e.target.value)}
                    className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-gray-900 bg-white"
                />
            </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-6 pt-2 flex justify-end space-x-3 flex-shrink-0">
            <button 
                onClick={onClose}
                className="px-8 py-2.5 rounded-full font-medium text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={handleAdd}
                className="px-8 py-2.5 rounded-full font-medium text-sm bg-brand-600 text-white hover:bg-brand-700 shadow-sm hover:shadow-md transition-colors"
            >
                Add participant
            </button>
        </div>
      </div>
    </div>
  );
};

export default AddParticipantModal;