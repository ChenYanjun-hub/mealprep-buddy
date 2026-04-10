import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase, TASTE_TAGS } from '../lib/supabase'
import { ArrowLeft, MapPin, Home, Heart, Check, Sparkles } from 'lucide-react'

export function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [city, setCity] = useState('')
  const [hometown, setHometown] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  // 检查是否是首次使用引导
  const isFirstTime = location.state?.firstTime === true

  useEffect(() => {
    if (profile) {
      setCity(profile.city || '')
      setHometown(profile.hometown || '')
      setSelectedTags(profile.taste_tags || [])
    }
  }, [profile])

  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((t) => t !== tagId)
        : [...prev, tagId]
    )
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user!.id,
        city: city || null,
        hometown: hometown || null,
        taste_tags: selectedTags.length > 0 ? selectedTags : null,
      })

      if (error) throw error

      await refreshProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('保存失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          {!isFirstTime && (
            <button
              onClick={() => navigate(-1)}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          <h1 className="font-bold text-gray-800 text-lg">
            {isFirstTime ? '欢迎来到备菜助手' : '口味偏好设置'}
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* First Time Banner */}
        {isFirstTime && (
          <div className="bg-gradient-to-r from-orange-400 to-amber-400 rounded-xl p-4 mb-6 text-white">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8" />
              <div>
                <p className="font-bold text-lg">初次使用，请设置您的口味偏好</p>
                <p className="text-sm opacity-90">设置后可以获得更精准的菜谱推荐</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* City */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium text-gray-800">所在城市</p>
                <p className="text-sm text-gray-500">用于推荐当地特色食材</p>
              </div>
            </div>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              placeholder="如：北京、上海、广州"
            />
          </div>

          {/* Hometown */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Home className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium text-gray-800">籍贯/家乡</p>
                <p className="text-sm text-gray-500">推荐家乡特色菜</p>
              </div>
            </div>
            <input
              type="text"
              value={hometown}
              onChange={(e) => setHometown(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              placeholder="如：四川、湖南、山东"
            />
          </div>

          {/* Taste Tags */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-medium text-gray-800">口味偏好</p>
                <p className="text-sm text-gray-500">选择您喜欢的口味</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {TASTE_TAGS.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleTagToggle(tag.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedTags.includes(tag.id)
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {selectedTags.includes(tag.id) && (
                    <Check className="w-4 h-4 inline mr-1" />
                  )}
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            {saved ? (
              <>
                <Check className="w-5 h-5" />
                已保存
              </>
            ) : loading ? (
              '保存中...'
            ) : isFirstTime ? (
              '完成设置，开始使用'
            ) : (
              '保存设置'
            )}
          </button>

          {/* Skip for first time users */}
          {isFirstTime && (
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 text-gray-500 hover:text-gray-700 transition-colors"
            >
              暂时跳过
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
