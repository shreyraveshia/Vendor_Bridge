import React from 'react';

export function SkeletonCard({ className = '', height = '150px', width = '100%' }) {
  return (
    <div
      className={`skeleton animate-pulse bg-gray-200 dark:bg-gray-800 rounded-xl ${className}`}
      style={{ height, width }}
    />
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="w-full space-y-4 py-2">
      {/* Header shimmer */}
      <div className="flex gap-4 border-b border-gray-100 dark:border-gray-800 pb-3">
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/12 skeleton" />
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/12 skeleton" />
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-2/12 skeleton" />
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-2/12 skeleton" />
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-2/12 skeleton" />
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-2/12 skeleton" />
      </div>
      {/* Row shimmers */}
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="flex gap-4 py-2.5 border-b border-gray-50 dark:border-gray-900/50">
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/12 skeleton" />
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/12 skeleton" />
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/12 skeleton" />
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/12 skeleton" />
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/12 skeleton" />
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/12 skeleton" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3, className = '' }) {
  const widths = ['w-full', 'w-11/12', 'w-10/12', 'w-9/12', 'w-8/12', 'w-7/12', 'w-6/12'];
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, idx) => {
        const widthClass = widths[idx % widths.length];
        return (
          <div
            key={idx}
            className={`h-3.5 bg-gray-200 dark:bg-gray-800 rounded skeleton ${widthClass}`}
          />
        );
      })}
    </div>
  );
}
