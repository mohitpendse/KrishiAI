import React from 'react'
import type { LucideProps } from 'lucide-react'

interface EmptyStateProps {
  icon: React.ComponentType<LucideProps & { className?: string }>
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="card p-12 text-center animate-fade-in">
      <div className="flex justify-center mb-4">
        <div className="rounded-full bg-muted p-4">
          <Icon className="h-12 w-12 text-muted-foreground" />
        </div>
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn btn-primary btn-md">
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default EmptyState

