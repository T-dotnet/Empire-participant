
import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { EligibilityDomain, ConsentRecord } from '../types';

interface RevokeConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  domains: EligibilityDomain[];
  consentRecords: ConsentRecord[];
  onRevoke: (revocations: { domainId: string; level?: string; reason?: string; recipient?: string; date?: string; notes?: string }[]) => void;
}

const RevokeConsentModal: React.FC<RevokeConsentModalProps> = ({ isOpen, onClose, domains, consentRecords, onRevoke }) => {
  // Consider domains that are consented
  const obtainedDomains = domains.filter(d => 
    ['OBTAINED', 'CONSENTED'].includes(d.consentStatus || '')
  );
  const withdrawnDomains = domains.filter(d => d.consentStatus === 'WITHDRAWN');
  
  const [activeTab, setActiveTab] = useState<'current' | 'withdrawn'>('current');
  const [selectedDomainIds, setSelectedDomainIds] = useState<string[]>([]);
  const [withdrawalData, setWithdrawalData] = useState<Record<string, { level?: string; reason?: string; recipient?: string; date?: string; notes?: string }>>({});
  
  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setActiveTab('current');
      setSelectedDomainIds([]);
      setWithdrawalData({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleDomain = (id: string) => {
    setSelectedDomainIds(prev => 
      prev.includes(id) 
        ? prev.filter(d => d !== id) 
        : [...prev, id]
    );
  };

  const updateWithdrawalField = (domainId: string, field: string, value: string) => {
    setWithdrawalData(prev => ({
      ...prev,
      [domainId]: { ...prev[domainId], [field]: value }
    }));
  };

  const handleContinue = () => {
    const revocations = selectedDomainIds.map(id => ({
      domainId: id,
      level: withdrawalData[id]?.level,
      reason: withdrawalData[id]?.reason,
      recipient: withdrawalData[id]?.recipient,
      date: withdrawalData[id]?.date,
      notes: withdrawalData[id]?.notes
    }));
    onRevoke(revocations);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900 bg-opacity-40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif text-gray-900">Manage consent</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Icons.X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-6 border-b border-gray-200">
            <button 
              onClick={() => setActiveTab('current')}
              className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'current' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Current ({obtainedDomains.length})
            </button>
            <button 
              onClick={() => setActiveTab('withdrawn')}
              className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'withdrawn' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Already withdrawn ({withdrawnDomains.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'current' ? (
            obtainedDomains.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p>No active obtained consents found to revoke.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {obtainedDomains.map((domain) => {
                  const isSelected = selectedDomainIds.includes(domain.id);
                  return (
                    <div key={domain.id} className="transition-all duration-300">
                      {/* Checkbox Header */}
                      <div 
                        className="flex items-center space-x-3 cursor-pointer group select-none mb-4"
                        onClick={() => toggleDomain(domain.id)}
                      >
                        <div className={`w-5 h-5 rounded-[4px] flex items-center justify-center border transition-all duration-200 ${isSelected ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-300 group-hover:border-gray-400'}`}>
                          {isSelected && <Icons.Check className="w-3.5 h-3.5" strokeWidth={3} />}
                        </div>
                        <span className="font-medium text-gray-900">{domain.name}</span>
                      </div>

                      {/* Form Fields - Only if selected */}
                      {isSelected && (
                        <div className="pl-8 space-y-5 animate-in slide-in-from-top-2 duration-300">
                          {/* Level */}
                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700">Level</label>
                            <div className="relative">
                              <select 
                                value={withdrawalData[domain.id]?.level || ''}
                                onChange={(e) => updateWithdrawalField(domain.id, 'level', e.target.value)}
                                className="appearance-none block w-full pl-3 pr-10 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white text-gray-900"
                              >
                                <option value="" disabled>Select withdrawal level</option>
                                <option value="Full Withdrawal">Full Withdrawal</option>
                                <option value="Partial Withdrawal">Partial Withdrawal</option>
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                <Icons.ChevronDown className="w-4 h-4" />
                              </div>
                            </div>
                          </div>

                          {/* Reason */}
                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700">Reason</label>
                            <input 
                              type="text" 
                              value={withdrawalData[domain.id]?.reason || ''}
                              onChange={(e) => updateWithdrawalField(domain.id, 'reason', e.target.value)}
                              className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                              placeholder="Reason for withdrawal"
                            />
                          </div>

                          {/* Collected by */}
                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700">Collected by</label>
                            <div className="relative">
                              <select 
                                value={withdrawalData[domain.id]?.recipient || ''}
                                onChange={(e) => updateWithdrawalField(domain.id, 'recipient', e.target.value)}
                                className="appearance-none block w-full pl-3 pr-10 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white text-gray-900"
                              >
                                <option value="" disabled>Select person</option>
                                <option value="Dr. Sarah Chan">Dr. Sarah Chan</option>
                                <option value="Research Nurse">Research Nurse</option>
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                <Icons.ChevronDown className="w-4 h-4" />
                              </div>
                            </div>
                          </div>

                          {/* Effect date */}
                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700">Effect date</label>
                            <input 
                              type="date" 
                              value={withdrawalData[domain.id]?.date || ''}
                              onChange={(e) => updateWithdrawalField(domain.id, 'date', e.target.value)}
                              className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                              placeholder="Select date"
                            />
                          </div>

                          {/* Notes */}
                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700">Notes</label>
                            <input 
                              type="text" 
                              value={withdrawalData[domain.id]?.notes || ''}
                              onChange={(e) => updateWithdrawalField(domain.id, 'notes', e.target.value)}
                              className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                              placeholder="Additional notes"
                            />
                          </div>
                          
                          <div className="border-b border-gray-100 pt-2"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            withdrawnDomains.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p>No withdrawn domains found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {withdrawnDomains.map((domain) => {
                  const record = consentRecords.find(r => r.domainIds.includes(domain.id) && r.status === 'WITHDRAWN');
                  return (
                    <div key={domain.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                      <div className="font-medium text-gray-900">{domain.name}</div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Withdrawal level:</span> {domain.withdrawalLevel || 'Not specified'}
                      </div>
                      {record && (
                        <>
                          {record.processDate && <div className="text-sm text-gray-600"><span className="font-medium">Date:</span> {record.processDate}</div>}
                          {record.recipient && <div className="text-sm text-gray-600"><span className="font-medium">Collected by:</span> {record.recipient}</div>}
                          {record.note && <div className="text-sm text-gray-600"><span className="font-medium">Notes:</span> {record.note}</div>}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-100 bg-white flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-full font-medium text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {activeTab === 'withdrawn' ? 'Close' : 'Cancel'}
          </button>
          {activeTab === 'current' && (
            <button 
              onClick={handleContinue}
              disabled={selectedDomainIds.length === 0}
              className={`px-6 py-2.5 rounded-full font-medium text-sm transition-colors
                ${selectedDomainIds.length === 0 ? 'bg-brand-300 text-white cursor-not-allowed' : 'bg-brand-600 text-white hover:bg-brand-700'}
              `}
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RevokeConsentModal;
