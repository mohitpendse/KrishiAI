import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { User, Mail, Phone, LogOut, Pencil, Check, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'

type ProfileForm = {
  first_name: string
  last_name: string
  email: string
  mobile: string
}

const ProfilePage: React.FC = () => {
  const { user, updateProfile, logout } = useAuth()
  const { t } = useLanguage()
  const [editing, setEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draft, setDraft] = useState<ProfileForm>({
    first_name: '',
    last_name: '',
    email: '',
    mobile: '',
  })

  useEffect(() => {
    if (user) {
      setDraft({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        mobile: user.mobile || '',
      })
    }
  }, [user])

  const startEdit = () => setEditing(true)

  const cancelEdit = () => {
    if (user) {
      setDraft({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        mobile: user.mobile || '',
      })
    }
    setEditing(false)
  }

  const saveEdit = async () => {
    setIsSaving(true)
    try {
      await updateProfile({
        first_name: draft.first_name,
        last_name: draft.last_name || undefined,
        email: draft.email || undefined,
      })
      setEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || '—'

  return (
    <>
      <Helmet>
        <title>{t('profileTitle')} - KrishiAI</title>
      </Helmet>

      <div className="app-page mx-auto max-w-3xl">
        <div className="app-panel px-6 py-8 sm:px-10 sm:py-10">
          <div className="text-center mb-8">
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/25">
              <User className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2 truncate">
              {displayName}
            </h1>
            <p className="text-sm text-muted-foreground">{user?.mobile || t('profileTitle')}</p>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ProfileField
                id="profile-first-name"
                icon={User}
                label={t('firstName')}
                value={editing ? draft.first_name : user?.first_name || '—'}
                editing={editing}
                onChange={(v) => setDraft({ ...draft, first_name: v })}
                placeholder={t('firstName')}
              />
              <ProfileField
                id="profile-last-name"
                icon={User}
                label={t('lastName')}
                value={editing ? draft.last_name : user?.last_name || '—'}
                editing={editing}
                onChange={(v) => setDraft({ ...draft, last_name: v })}
                placeholder={t('lastName')}
              />
            </div>

            <ProfileField
              id="profile-email"
              icon={Mail}
              label={t('email')}
              value={editing ? draft.email : user?.email || '—'}
              editing={editing}
              onChange={(v) => setDraft({ ...draft, email: v })}
              placeholder={t('email')}
              type="email"
            />

            <ProfileField
              id="profile-mobile"
              icon={Phone}
              label={t('mobile')}
              value={user?.mobile || '—'}
              editing={false}
              onChange={() => {}}
            />

            <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {!editing ? (
                <button
                  type="button"
                  onClick={startEdit}
                  className="btn btn-primary btn-lg w-full shadow-lg shadow-primary/30 hover-lift"
                >
                  <Pencil className="mr-2 h-5 w-5" />
                  {t('edit')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={isSaving}
                  className="btn btn-primary btn-lg w-full shadow-lg shadow-primary/30 hover-lift"
                >
                  {isSaving ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-2" />
                      {t('loading')}
                    </span>
                  ) : (
                    <>
                      <Check className="mr-2 h-5 w-5" />
                      {t('save')}
                    </>
                  )}
                </button>
              )}

              {editing ? (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="btn btn-outline btn-lg w-full transition-colors"
                >
                  <X className="mr-2 h-5 w-5" />
                  {t('cancel')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={logout}
                  className="btn btn-lg w-full border border-red-500/25 bg-red-500/10 text-red-600 transition-colors hover:bg-red-500/15 dark:text-red-300"
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  {t('logout')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function ProfileField({
  id,
  icon: Icon,
  label,
  value,
  editing,
  onChange,
  placeholder,
  type = 'text',
}: {
  id: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  editing: boolean
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="label mb-1.5 block text-foreground">
        {label}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <input
          id={id}
          type={type}
          className="input pl-12"
          value={value === '—' ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={!editing}
          aria-readonly={!editing}
        />
      </div>
    </div>
  )
}

export default ProfilePage
