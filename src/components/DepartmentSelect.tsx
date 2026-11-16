import { useState } from 'react';
import { useDepartmentRows } from '../hooks/useDepartmentRows';
import { matchesSearch, sortDepartments } from '../utils/departments';
import type { FlatDepartment } from '../utils/departments';

interface DepartmentSelectProps {
  id?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  excludeId?: number;
  disabled?: boolean;
  placeholder?: string;
}

function optionLabel(dept: FlatDepartment): string {
  if (dept.ancestors.length === 0) return dept.name;
  return `${dept.name} — ${dept.ancestors.join(' › ')}`;
}

export function DepartmentSelect({
  id,
  value,
  onChange,
  excludeId,
  disabled,
  placeholder,
}: DepartmentSelectProps) {
  const { rows, isPending, isError } = useDepartmentRows();
  const [search, setSearch] = useState('');

  const options = sortDepartments(
    rows.filter((row) => {
      if (!row.isActive) return false;
      if (excludeId !== undefined && (row.id === excludeId || row.ancestorIds.includes(excludeId))) {
        return false;
      }
      return row.id === value || matchesSearch(row, search);
    }),
    'level-asc',
  );

  const levels = Array.from(new Set(options.map((option) => option.level)));

  let emptyLabel = placeholder ?? 'No parent (top level)';
  if (isPending) emptyLabel = 'Loading…';
  if (isError) emptyLabel = 'Could not load departments';

  return (
    <div className="picker">
      <input
        type="search"
        className="picker__search"
        placeholder="Search departments"
        aria-label="Search departments"
        value={search}
        disabled={disabled || isPending}
        onChange={(e) => setSearch(e.target.value)}
      />
      <select
        id={id}
        className="picker__list"
        size={7}
        value={value ?? ''}
        disabled={disabled || isPending}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      >
        <option value="">{emptyLabel}</option>
        {levels.map((level) => (
          <optgroup key={level} label={level === 1 ? 'Level 1 (top level)' : `Level ${level}`}>
            {options
              .filter((option) => option.level === level)
              .map((option) => (
                <option key={option.id} value={option.id}>
                  {optionLabel(option)}
                </option>
              ))}
          </optgroup>
        ))}
        {options.length === 0 && !isPending && !isError && (
          <option disabled value="none">
            No matching departments
          </option>
        )}
      </select>
    </div>
  );
}
