"use client";

import { useState } from "react";

interface Props {
  name: string;
  label: string;
  defaultValue: string;
  options: { value: string; label: string; mobileLabel?: string }[];
  selectClassName: string;
}

/** One submitted value: mobile radios and the desktop select share state. */
export function FilterChoice({ name, label, defaultValue, options, selectClassName }: Props) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className={`filter-choice filter-choice-${name}`}>
      <label className="filter-label hidden md:flex" htmlFor={`filter-${name}`}>{label}
        <select id={`filter-${name}`} value={value} onChange={event => setValue(event.target.value)} className={selectClassName}>
          {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <fieldset className="min-w-0 md:hidden">
        <legend className="mb-2 text-xs font-semibold text-text-secondary">{label}</legend>
        <div className="grid grid-cols-3 gap-2">
          {options.map(option => <label key={option.value} className="relative min-w-0 cursor-pointer">
            <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => setValue(option.value)} className="peer sr-only" />
            <span className="flex min-h-11 items-center justify-center rounded-lg border border-border-strong px-2 text-center text-xs font-medium text-text-secondary transition-colors peer-checked:border-velocity/50 peer-checked:bg-velocity/10 peer-checked:text-velocity peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-velocity">{option.mobileLabel ?? option.label}</span>
          </label>)}
        </div>
      </fieldset>
    </div>
  );
}
