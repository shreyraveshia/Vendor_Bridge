import React from 'react';

const STATUS_COLOR_MAP = {
  // Green states
  active: 'badge-green',
  approved: 'badge-green',
  completed: 'badge-green',
  paid: 'badge-green',

  // Yellow/Amber states
  pending: 'badge-yellow',
  draft: 'badge-yellow',
  under_review: 'badge-yellow',

  // Red states
  rejected: 'badge-red',
  cancelled: 'badge-red',
  blacklisted: 'badge-red',
  overdue: 'badge-red',

  // Blue states
  published: 'badge-blue',
  sent: 'badge-blue',
  shortlisted: 'badge-blue',
  awarded: 'badge-blue',

  // Gray states
  inactive: 'badge-gray'
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  const normalKey = status.toLowerCase();
  const colorClass = STATUS_COLOR_MAP[normalKey] || 'badge-gray';
  
  // Format string nicely (replace underscores with spaces, capitalize first letters)
  const formattedText = status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());

  return (
    <span className={`badge ${colorClass}`}>
      {formattedText}
    </span>
  );
}
