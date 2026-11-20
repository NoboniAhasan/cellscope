import { useState } from 'react';
import { Modal } from '../../components/Modal';

interface SendForReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  runVersion: number;
  onConfirm: (email: string) => Promise<void>;
  isSending: boolean;
}

export function SendForReviewModal({
  isOpen,
  onClose,
  runVersion,
  onConfirm,
  isSending,
}: SendForReviewModalProps) {
  const [email, setEmail] = useState('reviewer@cellscope.org');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim()) {
      setErrorMsg('Please specify a reviewer email address.');
      return;
    }
    try {
      await onConfirm(email.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to assign review.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Send Version v${runVersion} for Review`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          Assign this segmentation version to a verified Reviewer for quality audit, candidate cell validation, and formal approval.
        </p>

        {errorMsg && (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {errorMsg}
          </div>
        )}

        <div>
          <label htmlFor="reviewer-email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Reviewer Email Address
          </label>
          <input
            id="reviewer-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="reviewer@cellscope.org"
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
          />
        </div>

        {/* Quick select demo reviewer */}
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">Demo Reviewer:</span>
          <button
            type="button"
            onClick={() => setEmail('reviewer@cellscope.org')}
            className="text-teal-700 font-semibold hover:underline"
          >
            reviewer@cellscope.org
          </button>
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
            disabled={isSending}
            className="px-5 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {isSending ? 'Assigning...' : 'Assign Review'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
