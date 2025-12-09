interface ProgressBarProps {
  progress: number // 0 to 1
  label?: string
  color?: 'indigo' | 'green' | 'red' | 'yellow'
}

export default function ProgressBar({ progress, label, color = 'indigo' }: ProgressBarProps) {
  const colorClasses = {
    indigo: 'bg-indigo-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    yellow: 'bg-yellow-600',
  }

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{label}</span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${colorClasses[color]} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
        />
      </div>
    </div>
  )
}

