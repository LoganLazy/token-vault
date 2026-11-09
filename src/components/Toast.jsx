import { memo } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { useStableTimeout } from '../utils/useStableTimeout'

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

const Toast = memo(function Toast({ message, type = 'info', duration = 3000, onClose }) {
  const config = TOAST_TYPES[type]
  const Icon = config.icon

  // onClose is an inline arrow in the parent, so it changes identity on
  // every render — and the app re-renders every second for the TOTP clock.
  // A plain effect on [duration, onClose] reset this timer every second,
  // so no toast ever auto-dismissed and a sync error stayed stuck until a
  // page refresh. useStableTimeout keeps the latest callback in a ref, so
  // the timer is set once per toast.
  useStableTimeout(onClose, duration)

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
})

export default Toast
