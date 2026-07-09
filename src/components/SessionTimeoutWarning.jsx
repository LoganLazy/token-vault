import { AlertCircle, RefreshCw } from 'lucide-react'

export default function SessionTimeoutWarning({ remainingSeconds, onExtend }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-bounce">
      <div className="bg-amber-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm">
        <AlertCircle className="w-6 h-6 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium text-sm">即将自动锁定</p>
          <p className="text-xs opacity-90 mt-1">
            {remainingSeconds} 秒后自动锁定应用
          </p>
        </div>
        <button
          onClick={onExtend}
          className="px-4 py-2 bg-white text-amber-500 rounded-full hover:bg-amber-50 transition-colors text-sm font-medium flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          继续
        </button>
      </div>
    </div>
  )
}
