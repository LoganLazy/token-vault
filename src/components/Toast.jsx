import { useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

const TOAST_TYPES = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-500',
    textColor: 'text-white'
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-500',
    textColor: 'text-white'
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-amber-500',
    textColor: 'text-white'
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-500',
    textColor: 'text-white'
  }
}

export default function Toast({ message, type = 'info', duration = 3000, onClose }) {
  const config = TOAST_TYPES[type]
  const Icon = config.icon

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className={`${config.bgColor} ${config.textColor} px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[280px] max-w-md`}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        <p className="flex-1 text-sm font-medium">{message}</p>
        <button
          onClick={onClose}
          className="flex-shrink-0 hover:opacity-80 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
