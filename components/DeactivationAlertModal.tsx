import React from 'react';
import { Icons } from './Icons';

interface DeactivationAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dontShowAgain: boolean) => void;
}

const DeactivationAlertModal: React.FC<DeactivationAlertModalProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4 text-orange-600">
            <div className="p-2 bg-orange-50 rounded-full">
              <Icons.AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">New Document Creation</h3>
          </div>
          
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              Creating a new document will automatically <span className="font-bold text-gray-900">close</span> all existing active documents for this participant.
            </p>
            <p>
              Closed documents <span className="font-bold text-gray-900">will no longer accept further notes</span> or modifications.
            </p>
          </div>

          <div className="mt-6 flex items-center gap-2 opacity-50 cursor-not-allowed">
            <input
              type="checkbox"
              id="dontShowAgain"
              checked={false}
              disabled
              className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-not-allowed"
            />
            <label htmlFor="dontShowAgain" className="text-sm text-gray-700 cursor-not-allowed select-none">
              Do not show this message again
            </label>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(false)}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors shadow-sm"
          >
            Proceed
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeactivationAlertModal;
