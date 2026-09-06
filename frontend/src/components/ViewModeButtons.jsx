import React from 'react';

const modes = [
  { id: 'list', label: 'List', image: '/list.png' },
  { id: 'kanban', label: 'Kanban', image: '/kanban.png' },
];

export const ViewModeButtons = ({ value, onChange }) => (
  <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1" role="group" aria-label="Choose view">
    {modes.map((mode) => (
      <button
        key={mode.id}
        type="button"
        onClick={() => onChange(mode.id)}
        aria-label={`${mode.label} view`}
        aria-pressed={value === mode.id}
        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
          value === mode.id
            ? 'border-blue-200 bg-blue-50 shadow-sm'
            : 'border-transparent hover:bg-slate-50'
        }`}
      >
        <img
          src={mode.image}
          alt=""
          className={`h-5 w-5 object-contain ${value === mode.id ? 'opacity-90' : 'opacity-60'}`}
        />
      </button>
    ))}
  </div>
);
