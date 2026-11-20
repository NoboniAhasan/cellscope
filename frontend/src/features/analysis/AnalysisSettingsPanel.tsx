import { useState } from 'react';
import { AnalysisParameters, Polarity, PresetId } from '../../types';

interface AnalysisSettingsPanelProps {
  parameters: AnalysisParameters;
  onChange: (params: AnalysisParameters) => void;
  onRun: () => void;
  isRunning: boolean;
}

const PRESET_DESCRIPTIONS: Record<PresetId, { label: string; desc: string; defaultPolarity: Polarity }> = {
  fluorescence: {
    label: 'Fluorescence',
    desc: 'Optimized for bright fluorescent nuclei on dark backgrounds (e.g. DAPI, GFP).',
    defaultPolarity: 'bright_on_dark',
  },
  dark_stained: {
    label: 'Dark-stained cells',
    desc: 'Optimized for dark stained cells or histological sections on brightfield backgrounds.',
    defaultPolarity: 'dark_on_bright',
  },
  low_contrast: {
    label: 'Low contrast',
    desc: 'Enhanced gradient filtering for faint phase-contrast or unlabelled live specimens.',
    defaultPolarity: 'bright_on_dark',
  },
};

export function AnalysisSettingsPanel({
  parameters,
  onChange,
  onRun,
  isRunning,
}: AnalysisSettingsPanelProps) {
  const [params, setParams] = useState<AnalysisParameters>(parameters);

  const handlePresetChange = (preset: PresetId) => {
    const defaultPol = PRESET_DESCRIPTIONS[preset].defaultPolarity;
    let minArea = params.minArea;
    let maxArea = params.maxArea;

    if (preset === 'fluorescence') {
      minArea = 120;
      maxArea = 5000;
    } else if (preset === 'dark_stained') {
      minArea = 80;
      maxArea = 4000;
    } else {
      minArea = 60;
      maxArea = 3000;
    }

    const updated: AnalysisParameters = {
      ...params,
      preset,
      polarity: defaultPol,
      minArea,
      maxArea,
    };
    setParams(updated);
    onChange(updated);
  };

  const updateParam = <K extends keyof AnalysisParameters>(key: K, val: AnalysisParameters[K]) => {
    const updated = { ...params, [key]: val };
    setParams(updated);
    onChange(updated);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight">Analysis Parameters</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure Otsu watershed segmentation preset and object filters
        </p>
      </div>

      {/* Preset Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Specimen Preset
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(PRESET_DESCRIPTIONS) as PresetId[]).map((pid) => (
            <button
              key={pid}
              type="button"
              onClick={() => handlePresetChange(pid)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border text-center transition ${
                params.preset === pid
                  ? 'bg-teal-50 border-teal-600 text-teal-800 ring-1 ring-teal-600'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              {PRESET_DESCRIPTIONS[pid].label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 italic px-1">
          {PRESET_DESCRIPTIONS[params.preset].desc}
        </p>
      </div>

      {/* Polarity Toggle */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Signal Polarity
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => updateParam('polarity', 'bright_on_dark')}
            className={`py-2 px-3 text-xs font-medium rounded-lg border transition text-center ${
              params.polarity === 'bright_on_dark'
                ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Bright on Dark
          </button>
          <button
            type="button"
            onClick={() => updateParam('polarity', 'dark_on_bright')}
            className={`py-2 px-3 text-xs font-medium rounded-lg border transition text-center ${
              params.polarity === 'dark_on_bright'
                ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Dark on Bright
          </button>
        </div>
      </div>

      {/* Area Sliders */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="font-semibold text-slate-700">Min Area</span>
            <span className="font-mono text-slate-500">{params.minArea} px²</span>
          </div>
          <input
            type="range"
            min={10}
            max={1000}
            step={10}
            value={params.minArea}
            onChange={(e) => updateParam('minArea', Number(e.target.value))}
            className="w-full accent-teal-600"
          />
        </div>

        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="font-semibold text-slate-700">Max Area</span>
            <span className="font-mono text-slate-500">{params.maxArea} px²</span>
          </div>
          <input
            type="range"
            min={1000}
            max={10000}
            step={250}
            value={params.maxArea}
            onChange={(e) => updateParam('maxArea', Number(e.target.value))}
            className="w-full accent-teal-600"
          />
        </div>
      </div>

      {/* Gaussian Blur Sigma */}
      <div>
        <div className="flex justify-between items-center text-xs mb-1">
          <span className="font-semibold text-slate-700">Gaussian Blur (σ)</span>
          <span className="font-mono text-slate-500">{params.blurSigma.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={5.0}
          step={0.5}
          value={params.blurSigma}
          onChange={(e) => updateParam('blurSigma', Number(e.target.value))}
          className="w-full accent-teal-600"
        />
        <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
          <span>0.5 (finer detail)</span>
          <span>5.0 (noise smoothing)</span>
        </div>
      </div>

      {/* Segmentation Method Notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between text-xs">
        <span className="text-slate-600 font-medium">Thresholding Method</span>
        <span className="font-mono font-semibold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
          Otsu Watershed
        </span>
      </div>

      {/* Action Button */}
      <button
        type="button"
        onClick={onRun}
        disabled={isRunning}
        className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isRunning ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Processing Candidate Objects...</span>
          </>
        ) : (
          <span>▶ Run Analysis</span>
        )}
      </button>
    </div>
  );
}
