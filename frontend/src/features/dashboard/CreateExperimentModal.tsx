import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/Modal';

export const createExperimentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(120, 'Title cannot exceed 120 characters'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  sampleReference: z.string().max(50, 'Sample reference cannot exceed 50 characters').optional(),
});

export type CreateExperimentFormData = z.infer<typeof createExperimentSchema>;

interface CreateExperimentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateExperimentFormData) => Promise<void>;
}

export function CreateExperimentModal({ isOpen, onClose, onSubmit }: CreateExperimentModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateExperimentFormData>({
    resolver: zodResolver(createExperimentSchema),
    defaultValues: {
      title: '',
      description: '',
      sampleReference: '',
    },
  });

  const handleFormSubmit = async (data: CreateExperimentFormData) => {
    await onSubmit(data);
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Experiment">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="exp-title" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Experiment Title <span className="text-red-500">*</span>
          </label>
          <input
            id="exp-title"
            type="text"
            {...register('title')}
            placeholder="e.g. Fluorescence Assay - HeLa Culture"
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
          />
          {errors.title && (
            <p className="text-xs text-red-600 mt-1" role="alert">
              {errors.title.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="exp-sample" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Sample Reference / ID <span className="text-xs font-normal text-slate-400 lowercase">(optional)</span>
          </label>
          <input
            id="exp-sample"
            type="text"
            {...register('sampleReference')}
            placeholder="e.g. HELA-2026-04A"
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
          />
          {errors.sampleReference && (
            <p className="text-xs text-red-600 mt-1" role="alert">
              {errors.sampleReference.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="exp-desc" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Description <span className="text-xs font-normal text-slate-400 lowercase">(optional)</span>
          </label>
          <textarea
            id="exp-desc"
            rows={3}
            {...register('description')}
            placeholder="Describe specimen preparation, stain, or objectives..."
            className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition resize-none"
          />
          {errors.description && (
            <p className="text-xs text-red-600 mt-1" role="alert">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Experiment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
