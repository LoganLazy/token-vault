import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { useTranslation } from '../utils/i18n'

/**
 * 手势教程组件
 * 首次使用时显示，介绍移动端手势操作
 */
export default function GestureTutorial({ onClose }) {
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      title: `欢迎使用 ${t('app.name')}`,
      description: '我们为您准备了一些便捷的手势操作',
      icon: '👋',
      demo: (
        <div className="relative w-full h-40 bg-surface dark:bg-ink rounded-xl flex items-center justify-center">
          <div className="text-6xl animate-wave">👋</div>
        </div>
      )
    },
    {
      title: '下拉刷新',
      description: '在列表顶部向下滑动即可刷新验证码',
      icon: '↓',
      demo: (
        <div className="relative w-full h-40 bg-surface dark:bg-ink rounded-xl overflow-hidden">
          <div className="absolute inset-0 flex flex-col items-center justify-start pt-4">
            <div className="w-8 h-8 rounded-full bg-terracotta flex items-center justify-center animate-bounce-slow">
              <span className="text-white text-xl">↓</span>
            </div>
            <div className="mt-4 text-muted text-sm">下拉刷新</div>
          </div>
        </div>
      )
    },
    {
      title: '左滑删除',
      description: '向左滑动账号卡片可快速删除',
      icon: '←',
      demo: (
        <div className="relative w-full h-40 bg-surface dark:bg-ink rounded-xl overflow-hidden flex items-center justify-center">
          <div className="relative">
            <div className="w-64 h-20 bg-white dark:bg-surface rounded-xl shadow-md border border-border flex items-center px-4 animate-slide-left">
              <div className="w-10 h-10 rounded-full bg-terracotta-tint flex items-center justify-center text-xl mr-3">
                🔐
              </div>
              <div>
                <div className="text-sm font-medium text-ink dark:text-surface">示例账号</div>
                <div className="text-xs text-muted">user@example.com</div>
              </div>
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-red-500 text-white px-4 h-20 rounded-r-xl flex items-center">
              🗑️
            </div>
          </div>
        </div>
      )
    },
    {
      title: '长按菜单',
      description: '长按账号卡片弹出快捷菜单',
      icon: '⌛',
      demo: (
        <div className="relative w-full h-40 bg-surface dark:bg-ink rounded-xl overflow-hidden flex items-center justify-center">
          <div className="relative">
            <div className="w-64 h-20 bg-white dark:bg-surface rounded-xl shadow-md border border-border flex items-center px-4 animate-pulse-slow">
              <div className="w-10 h-10 rounded-full bg-terracotta-tint flex items-center justify-center text-xl mr-3">
                🔐
              </div>
              <div>
                <div className="text-sm font-medium text-ink dark:text-surface">示例账号</div>
                <div className="text-xs text-muted">user@example.com</div>
              </div>
            </div>
            <div className="absolute -top-2 -right-2 bg-terracotta text-white text-xs px-2 py-1 rounded-full">
              长按 500ms
            </div>
          </div>
        </div>
      )
    },
    {
      title: '开始使用',
      description: '现在您可以开始使用这些便捷手势了！',
      icon: '🎉',
      demo: (
        <div className="relative w-full h-40 bg-surface dark:bg-ink rounded-xl flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <div className="text-muted text-sm">祝您使用愉快</div>
          </div>
        </div>
      )
    }
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onClose()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    onClose()
  }

  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fade-in">
      <div className="bg-white dark:bg-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 touch-target p-2 text-muted hover:text-ink dark:hover:text-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center">
            <div className="text-5xl mb-3">{step.icon}</div>
            <h2 className="text-xl font-light text-ink dark:text-surface mb-2">
              {step.title}
            </h2>
            <p className="text-sm text-muted">
              {step.description}
            </p>
          </div>
        </div>

        {/* Demo */}
        <div className="px-6 py-4">
          {step.demo}
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 py-4">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'bg-terracotta w-8'
                  : 'bg-border hover:bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={handlePrev}
              className="flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-full text-muted hover:text-ink hover:border-ink dark:hover:text-surface dark:hover:border-surface transition-colors font-light"
            >
              <ChevronLeft className="w-5 h-5" />
              上一步
            </button>
          )}

          <button
            onClick={handleNext}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-full transition-colors font-light ${
              isLastStep
                ? 'bg-terracotta hover:bg-terracotta-hover text-white'
                : 'bg-terracotta hover:bg-terracotta-hover text-white'
            }`}
          >
            {isLastStep ? (
              <>
                <Check className="w-5 h-5" />
                开始使用
              </>
            ) : (
              <>
                下一步
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
