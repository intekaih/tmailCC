'use client';

interface OwnerFilterProps {
  owners: string[];
  value: string;
  onChange: (owner: string) => void;
  guestLabel: string;
}

export default function OwnerFilter({ owners, value, onChange, guestLabel }: OwnerFilterProps) {
  if (owners.length === 0) return null;

  const sortedOwners = [...owners].sort((a, b) => {
    if (a === guestLabel) return 1;
    if (b === guestLabel) return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="px-5 pb-4">
      <select
        className="select w-full text-sm"
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Tất cả User</option>
        {sortedOwners.map(owner => (
          <option key={owner} value={owner}>{owner}</option>
        ))}
      </select>
    </div>
  );
}
