import { X, TrendingUp, Award, Clock, BarChart3 } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getStatsSummary, getMostUsedTokens, getRecentlyUsedTokens, formatLastUsed, getUsageTrend, getCategoryDistribution, getHourlyDistribution } from '../utils/stats'
import { getServiceIcon } from '../utils/services'
import { getServiceLogo } from '../utils/logos'

const COLORS = ['#C4612F', '#A94E22', '#8B3E1C', '#6D2E16', '#4F1E10']

export default function StatsModal({ tokens, syncStatus, onClose }) {
  const summary = getStatsSummary(tokens)
  const mostUsed = getMostUsedTokens(tokens, 10)
  const recentlyUsed = getRecentlyUsedTokens(tokens, 5)
  const usageTrend = getUsageTrend(tokens)
  const categoryDist = getCategoryDistribution(tokens)
  const hourlyDist = getHourlyDistribution(tokens)

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 text-muted hover:text-ink dark:text-muted dark:hover:text-surface transition-colors"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-terracotta/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-terracotta" />
          </div>
          <h2 className="text-xl sm:text-2xl font-light text-ink dark:text-surface">使用统计</h2>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-surface dark:bg-ink rounded-xl p-4 border border-border">
            <div className="text-2xl sm:text-3xl font-light text-terracotta mb-1">
              {summary.totalCopies}
            </div>
            <div className="text-xs text-muted">总复制次数</div>
          </div>
          <div className="bg-surface dark:bg-ink rounded-xl p-4 border border-border">
            <div className="text-2xl sm:text-3xl font-light text-terracotta mb-1">
              {summary.usedTokens}
            </div>
            <div className="text-xs text-muted">已使用账号</div>
          </div>
          <div className="bg-surface dark:bg-ink rounded-xl p-4 border border-border">
            <div className="text-2xl sm:text-3xl font-light text-terracotta mb-1">
              {summary.avgCopiesPerDay}
            </div>
            <div className="text-xs text-muted">日均复制</div>
          </div>
          <div className="bg-surface dark:bg-ink rounded-xl p-4 border border-border">
            <div className="text-2xl sm:text-3xl font-light text-terracotta mb-1">
              {summary.totalDays}
            </div>
            <div className="text-xs text-muted">使用天数</div>
          </div>
        </div>

        {/* Sync Status */}
        {syncStatus && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-terracotta" />
              <h3 className="text-lg font-light text-ink dark:text-surface">同步状态</h3>
            </div>
            <div className="flex items-center justify-between gap-3 p-3 bg-surface dark:bg-ink rounded-xl border border-border">
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`w-2 h-2 rounded-full ${syncStatus.dotClass}`} />
                <span className="text-sm font-medium text-ink dark:text-surface">{syncStatus.label}</span>
              </div>
              {syncStatus.detail && (
                <span className="text-xs text-muted text-right break-words">
                  {syncStatus.key === 'synced' ? `上次同步 ${syncStatus.detail}` : syncStatus.detail}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Charts */}
        {mostUsed.length > 0 && (
          <>
            {/* Usage Trend Chart */}
            {usageTrend.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-light text-ink dark:text-surface mb-3">📈 使用趋势（最近7天）</h3>
                <div className="bg-surface dark:bg-ink rounded-xl p-4 border border-border">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={usageTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E7E1D7" />
                      <XAxis dataKey="date" stroke="#5C635D" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#5C635D" style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FBF9F5',
                          border: '1px solid #E7E1D7',
                          borderRadius: '8px'
                        }}
                      />
                      <Line type="monotone" dataKey="count" stroke="#C4612F" strokeWidth={2} dot={{ fill: '#C4612F' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Category Distribution */}
            {categoryDist.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-light text-ink dark:text-surface mb-3">📊 分类分布</h3>
                <div className="bg-surface dark:bg-ink rounded-xl p-4 border border-border">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={categoryDist}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryDist.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Hourly Distribution */}
            {hourlyDist.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-light text-ink dark:text-surface mb-3">🕐 使用时段分布</h3>
                <div className="bg-surface dark:bg-ink rounded-xl p-4 border border-border">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={hourlyDist}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E7E1D7" />
                      <XAxis dataKey="hour" stroke="#5C635D" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#5C635D" style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FBF9F5',
                          border: '1px solid #E7E1D7',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="count" fill="#C4612F" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}

        {/* Most Used */}
        {mostUsed.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-terracotta" />
              <h3 className="text-lg font-light text-ink dark:text-surface">最常使用</h3>
            </div>
            <div className="space-y-2">
              {mostUsed.map((token, index) => {
                const serviceLogo = getServiceLogo(token.issuer)
                const serviceIcon = getServiceIcon(token.issuer)
                return (
                  <div key={token.id} className="flex items-center justify-between p-3 bg-surface dark:bg-ink rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-light text-muted">#{index + 1}</span>
                      {serviceLogo ? (
                        <img src={serviceLogo} alt={token.issuer} className="w-6 h-6 rounded" onError={(e) => e.target.style.display = 'none'} />
                      ) : (
                        <span className="text-xl">{serviceIcon}</span>
                      )}
                      <div>
                        <div className="text-sm font-medium text-ink dark:text-surface">{token.issuer}</div>
                        <div className="text-xs text-muted">{token.account}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-terracotta" />
                      <span className="text-sm font-medium text-terracotta">{token.copyCount} 次</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recently Used */}
        {recentlyUsed.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-terracotta" />
              <h3 className="text-lg font-light text-ink dark:text-surface">最近使用</h3>
            </div>
            <div className="space-y-2">
              {recentlyUsed.map((token) => {
                const serviceLogo = getServiceLogo(token.issuer)
                const serviceIcon = getServiceIcon(token.issuer)
                return (
                  <div key={token.id} className="flex items-center justify-between p-3 bg-surface dark:bg-ink rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      {serviceLogo ? (
                        <img src={serviceLogo} alt={token.issuer} className="w-6 h-6 rounded" onError={(e) => e.target.style.display = 'none'} />
                      ) : (
                        <span className="text-xl">{serviceIcon}</span>
                      )}
                      <div>
                        <div className="text-sm font-medium text-ink dark:text-surface">{token.issuer}</div>
                        <div className="text-xs text-muted">{token.account}</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted">
                      {formatLastUsed(token.lastCopy)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {mostUsed.length === 0 && recentlyUsed.length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-muted mx-auto mb-4 opacity-20" />
            <p className="text-muted mb-2">还没有使用数据</p>
            <p className="text-xs text-muted">复制验证码后将开始记录统计信息</p>
          </div>
        )}
      </div>
    </div>
  )
}
