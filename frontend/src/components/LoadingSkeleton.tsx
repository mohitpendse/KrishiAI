import React from 'react'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'rectangular' 
}) => {
  const baseClasses = 'animate-pulse bg-muted'
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md'
  }

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      aria-hidden="true"
    />
  )
}

export const CardSkeleton: React.FC = () => {
  return (
    <div className="card p-6 animate-fade-in">
      <Skeleton variant="rectangular" className="h-6 w-3/4 mb-4" />
      <Skeleton variant="text" className="h-4 w-full mb-2" />
      <Skeleton variant="text" className="h-4 w-5/6" />
    </div>
  )
}

export const StatCardSkeleton: React.FC = () => {
  return (
    <div className="card p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <Skeleton variant="text" className="h-4 w-2/3 mb-2" />
          <Skeleton variant="rectangular" className="h-8 w-1/2" />
        </div>
        <Skeleton variant="circular" className="h-10 w-10" />
      </div>
      <Skeleton variant="text" className="h-3 w-1/3" />
    </div>
  )
}

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="card p-6 animate-fade-in">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton variant="circular" className="h-10 w-10" />
            <Skeleton variant="text" className="h-4 flex-1" />
            <Skeleton variant="text" className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default Skeleton

