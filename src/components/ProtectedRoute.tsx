import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-500">加载中...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  // 首次使用引导：如果没有设置口味偏好且不在设置页，跳转到设置页
  const isFirstTimeUser = !profile?.taste_tags || profile.taste_tags.length === 0
  const isOnSettingsPage = location.pathname === '/settings'

  if (isFirstTimeUser && !isOnSettingsPage) {
    return <Navigate to="/settings" replace state={{ firstTime: true }} />
  }

  return <>{children}</>
}
