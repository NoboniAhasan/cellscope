import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { CorrectionDiff } from '../image-editor/useCorrectionHistory';

interface SaveVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextVersion: number;
  diff: CorrectionDiff;
  onConfirm: (changeNote: string) => Promise<void>;
  isSaving: boolean;
}

export function SaveVersionModal({
  isOpen,
  onClose,
  nextVersion,
  diff,
  onConfirm,
  isSaving,
}: SaveVersionModalProps) {
  const [changeNote, setChangeNote] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(changeNote);
    setChangeNote('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Save as Version v${nextVersion}`}>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
          <span className="font-semibold text-slate-700 block">Staged Correction Summary</span>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-red-600 block">Deleted</span>
              <span className="text-base font-bold text-slate-800">{diff.deleteObjectIds.length}</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block">Added</span>
              <span className="text-base font-bold text-slate-800">{diff.addObjects.length}</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-cyan-600 block">Adjusted</span>
              <span className="text-base font-bold text-slate-800">{diff.adjusted.length}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 italic mt-1">
            The parent version will remain completely untouched. This creates an independent new version in the version chain.
          </p>
        </div>

        <div>
          <label htmlFor="change-note" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Change Note <span className="text-slate-400 font-normal lowercase">(recommended)</span>
          </label>
          <input
            id="change-note"
            type="text"
            value={changeNote}
            onChange={(e) => setChangeNote(e.target.value)}
            placeholder="e.g. Deleted 2 false detections, added 1 missed nucleus"
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {isSaving ? 'Saving Version...' : `Save Version v${nextVersion}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
