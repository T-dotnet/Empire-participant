
import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string;
  formName: string;
  status: string;
  participantId?: string;
  onSave?: (data: any) => void;
  initialData?: any;
}

const InputGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
  </div>
);

export const FormModal: React.FC<FormModalProps> = ({ isOpen, onClose, formId, formName, status, participantId, onSave, initialData }) => {
  const [activeTab, setActiveTab] = useState('form');
  const [hemoglobin, setHemoglobin] = useState('115');

  // Reset or initialize state when modal opens
  useEffect(() => {
    if (isOpen) {
        setHemoglobin(initialData?.hemoglobin || '115');
        setActiveTab('form');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const isReadOnly = status === 'Completed' || status === 'Locked';
  const isQuery = status === 'Query';

  const handleSave = () => {
    if (onSave) {
        onSave({
            formId,
            hemoglobin,
            // Add other fields if needed for future logic
        });
    }
    onClose();
  };

  const renderFormContent = () => {
    switch (formId) {
      case 'f1': // Demographics
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Date of Birth">
                    <input type="date" className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-brand-500 focus:border-brand-500 outline-none text-gray-900 bg-white" defaultValue="1980-05-15" disabled={isReadOnly} />
                </InputGroup>
                 <InputGroup label="Sex at Birth">
                    <select className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-brand-500 focus:border-brand-500 outline-none text-gray-900 bg-white" disabled={isReadOnly}>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Intersex</option>
                    </select>
                </InputGroup>
            </div>
            <InputGroup label="Ethnicity">
                <select className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-brand-500 focus:border-brand-500 outline-none text-gray-900 bg-white" disabled={isReadOnly}>
                    <option>Select...</option>
                    <option selected>Caucasian / White</option>
                    <option>Asian</option>
                    <option>Black / African American</option>
                    <option>Hispanic / Latino</option>
                </select>
            </InputGroup>
            <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Height (cm)">
                    <input type="number" className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-brand-500 focus:border-brand-500 outline-none text-gray-900 bg-white" defaultValue="175" disabled={isReadOnly} />
                </InputGroup>
                <InputGroup label="Weight (kg)">
                    <input type="number" className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-brand-500 focus:border-brand-500 outline-none text-gray-900 bg-white" defaultValue="82.5" disabled={isReadOnly} />
                </InputGroup>
            </div>
             <div className="grid grid-cols-1 gap-4">
                <InputGroup label="Hospital Admission Date">
                    <input type="date" className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-brand-500 focus:border-brand-500 outline-none text-gray-900 bg-white" defaultValue="2025-09-20" disabled={isReadOnly} />
                </InputGroup>
             </div>
          </div>
        );
      case 'f2': // Baseline Assessment
         return (
             <div className="space-y-4">
                <h4 className="font-bold text-sm text-gray-900 border-b pb-2 mb-4">Severity Scores</h4>
                 <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="APACHE II Score">
                        <input type="number" className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-brand-500 focus:border-brand-500 outline-none text-gray-900 bg-white" disabled={isReadOnly} />
                    </InputGroup>
                    <InputGroup label="SOFA Score">
                        <input type="number" className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-brand-500 focus:border-brand-500 outline-none text-gray-900 bg-white" disabled={isReadOnly} />
                    </InputGroup>
                </div>
                 <h4 className="font-bold text-sm text-gray-900 border-b pb-2 mb-4 mt-6">Comorbidities</h4>
                 <div className="space-y-2">
                    {['Diabetes Mellitus (Type 1 or 2)', 'Chronic Obstructive Pulmonary Disease', 'Ischemic Heart Disease', 'Chronic Kidney Disease (Stage 3-5)', 'Active Malignancy'].map(c => (
                        <label key={c} className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" disabled={isReadOnly} />
                            <span className="text-sm text-gray-700">{c}</span>
                        </label>
                    ))}
                 </div>
            </div>
         );
      case 'f4': // Labs
        return (
            <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Hemoglobin (g/L)">
                        <input 
                            type="number" 
                            className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-brand-500 focus:border-brand-500 outline-none text-gray-900 bg-white" 
                            value={hemoglobin}
                            onChange={(e) => setHemoglobin(e.target.value)}
                            disabled={isReadOnly} 
                        />
                    </InputGroup>
                    <InputGroup label="WBC (x10^9/L)">
                        <input type="number" className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-brand-500 focus:border-brand-500 outline-none text-gray-900 bg-white" defaultValue="14.2" disabled={isReadOnly} />
                    </InputGroup>
                    <InputGroup label="Platelets (x10^9/L)">
                        <input type="number" className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-brand-500 focus:border-brand-500 outline-none text-gray-900 bg-white" defaultValue="180" disabled={isReadOnly} />
                    </InputGroup>
                    <InputGroup label="CRP (mg/L)">
                        <input type="number" className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-brand-500 focus:border-brand-500 outline-none text-gray-900 bg-white" defaultValue="156" disabled={isReadOnly} />
                    </InputGroup>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Creatinine (umol/L)">
                        <input type="number" className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-brand-500 focus:border-brand-500 outline-none text-gray-900 bg-white" defaultValue="88" disabled={isReadOnly} />
                    </InputGroup>
                     <InputGroup label="Urea (mmol/L)">
                        <input type="number" className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-brand-500 focus:border-brand-500 outline-none text-gray-900 bg-white" defaultValue="5.2" disabled={isReadOnly} />
                    </InputGroup>
                 </div>
            </div>
        );
       case 'f5': // Concomitant Medications
         return (
             <div className="space-y-6">
                 {/* Data Query Alert Removed Here */}

                 <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800 flex items-start">
                    <Icons.AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                    Please list all medications taken within 24 hours prior to randomisation.
                 </div>

                 {/* Medication 1 - With Query */}
                 <div className={`p-5 rounded-lg border ${isQuery ? 'border-red-300 bg-red-50/20' : 'border-gray-200 bg-white'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-sm text-gray-900 flex items-center">
                            Medication #1
                            {isQuery && <span className="ml-2 text-[10px] font-bold text-white bg-red-600 px-2 py-0.5 rounded-full">ACTION REQUIRED</span>}
                        </h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputGroup label="Drug Name">
                            <input type="text" className="w-full border border-gray-300 rounded-md p-2 text-sm text-gray-900 bg-white" defaultValue="Metformin" disabled={isReadOnly} />
                        </InputGroup>
                        <InputGroup label="Dose">
                            <input type="text" className="w-full border border-gray-300 rounded-md p-2 text-sm text-gray-900 bg-white" defaultValue="500mg" disabled={isReadOnly} />
                        </InputGroup>
                        <div className="md:col-span-2">
                             <label className={`block text-sm font-medium mb-1 ${isQuery ? 'text-red-700' : 'text-gray-700'}`}>
                                Route {isQuery && '*'}
                             </label>
                             {isQuery ? (
                                <div className="relative group">
                                    <select className="appearance-none w-full border-2 border-red-300 rounded-md py-2 pl-3 pr-10 text-sm text-gray-900 bg-white focus:ring-red-500 focus:border-red-500 outline-none transition-colors">
                                        <option value="">Select...</option>
                                        <option>PO (Oral)</option>
                                        <option>IV (Intravenous)</option>
                                        <option>SC (Subcutaneous)</option>
                                    </select>
                                    {/* Chevron */}
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                        <Icons.ChevronDown className="w-4 h-4" />
                                    </div>
                                    {/* Alert Icon with Tooltip */}
                                    <div className="absolute inset-y-0 right-8 flex items-center pr-1 cursor-help group/tooltip">
                                        <Icons.AlertCircle className="h-5 w-5 text-red-500" />
                                        <div className="absolute bottom-full right-0 mb-2 hidden group-hover/tooltip:block z-[100] whitespace-nowrap">
                                            <div className="bg-gray-900 text-white text-xs py-1.5 px-3 rounded shadow-lg relative">
                                                Missing mandatory value
                                                <div className="absolute top-full right-3 transform border-4 border-transparent border-t-gray-900"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="mt-1 text-xs text-red-600 font-medium">Please select a value.</p>
                                </div>
                             ) : (
                                <select className="w-full border border-gray-300 rounded-md p-2 text-sm text-gray-900 bg-white" disabled={isReadOnly}>
                                    <option>PO</option>
                                </select>
                             )}
                        </div>
                        <InputGroup label="Frequency">
                             <input type="text" className="w-full border border-gray-300 rounded-md p-2 text-sm text-gray-900 bg-white" defaultValue="BD" disabled={isReadOnly} />
                        </InputGroup>
                    </div>
                 </div>

                 {/* Medication 2 - Normal */}
                 <div className="p-5 rounded-lg border border-gray-200 bg-white">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-sm text-gray-900">Medication #2</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputGroup label="Drug Name">
                             <input type="text" className="w-full border border-gray-300 rounded-md p-2 text-sm text-gray-900 bg-white" defaultValue="Ramipril" disabled={isReadOnly} />
                        </InputGroup>
                        <InputGroup label="Dose">
                             <input type="text" className="w-full border border-gray-300 rounded-md p-2 text-sm text-gray-900 bg-white" defaultValue="5mg" disabled={isReadOnly} />
                        </InputGroup>
                        <InputGroup label="Route">
                             <input type="text" className="w-full border border-gray-300 rounded-md p-2 text-sm text-gray-900 bg-white" defaultValue="PO" disabled={isReadOnly} />
                        </InputGroup>
                        <InputGroup label="Frequency">
                             <input type="text" className="w-full border border-gray-300 rounded-md p-2 text-sm text-gray-900 bg-white" defaultValue="OD" disabled={isReadOnly} />
                        </InputGroup>
                    </div>
                 </div>

                 {!isReadOnly && !isQuery && (
                     <button className="flex items-center text-sm text-brand-600 font-medium hover:text-brand-700">
                         <Icons.CheckCircle className="w-4 h-4 mr-1"/> Add Medication
                     </button>
                 )}
             </div>
         );
      case 'f7': // Randomisation (ReadOnly)
         return (
             <div className="space-y-6">
                 <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                     <h4 className="text-green-800 font-bold text-sm mb-2">Randomisation Successful</h4>
                     <p className="text-green-700 text-xs">This participant has been successfully randomised.</p>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                     <div>
                         <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Randomisation ID</label>
                         <div className="text-sm font-mono bg-gray-100 p-2 rounded">R-99283-X</div>
                     </div>
                      <div>
                         <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Date/Time</label>
                         <div className="text-sm font-mono bg-gray-100 p-2 rounded">25.09.2025 14:30</div>
                     </div>
                 </div>
                  <div>
                     <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Assigned Intervention</label>
                     <div className="text-lg font-bold text-gray-900 border border-gray-200 p-3 rounded bg-white shadow-sm">Treatment Arm A</div>
                 </div>
                  <div>
                     <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Stratification Factors Used</label>
                     <ul className="text-sm text-gray-600 list-disc list-inside bg-gray-50 p-3 rounded border border-gray-100">
                         <li>Site: Royal Melbourne</li>
                         <li>Sepsis Severity: Moderate</li>
                         <li>Age Group: &lt; 65</li>
                     </ul>
                 </div>
             </div>
         );
      default:
        return <div className="text-gray-500 text-sm p-4 text-center">Form content not available in preview.</div>;
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900 bg-opacity-40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div>
              <div className="flex items-center gap-2">
                 <h2 className="text-lg font-bold text-gray-900">{formName}</h2>
                 <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded border ${
                    status === 'Completed' ? 'bg-green-100 text-green-700 border-green-200' :
                    status === 'In Progress' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                    status === 'Query' ? 'bg-red-100 text-red-700 border-red-200' :
                    'bg-gray-100 text-gray-600 border-gray-200'
                 }`}>
                    {status}
                 </span>
              </div>
              <div className="flex items-center text-xs text-gray-500 mt-0.5 gap-3">
                 <p>eCRF Form ID: {formId}</p>
                 {participantId && (
                     <>
                        <span className="text-gray-300">•</span>
                        <p className="font-medium text-gray-700 flex items-center">
                            <Icons.User className="w-3 h-3 mr-1" />
                            {participantId}
                        </p>
                     </>
                 )}
              </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <Icons.X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-100 flex space-x-6">
            <button 
                onClick={() => setActiveTab('form')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'form' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                Form Data
            </button>
             <button 
                onClick={() => setActiveTab('audit')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'audit' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                Audit Log
            </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
            {activeTab === 'form' ? renderFormContent() : (
                <div className="flex items-center justify-center h-40 text-gray-400 text-sm italic">
                    {activeTab === 'audit' ? 'No audit history available.' : null}
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
             <div className="text-xs text-gray-400">
                Last saved: {status === 'Not Started' ? 'Never' : '25.09.2025 10:45'}
             </div>
             <div className="flex space-x-3">
                 <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors">
                    Close
                 </button>
                 {!isReadOnly && !isQuery && (
                     <button 
                        onClick={handleSave}
                        className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
                     >
                        Save Changes
                     </button>
                 )}
                 {isQuery && (
                     <button className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors shadow-sm">
                        Resolve Query
                     </button>
                 )}
             </div>
        </div>
      </div>
    </div>
  );
};
