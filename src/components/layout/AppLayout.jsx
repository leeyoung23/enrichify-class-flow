import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { isRouteAllowed } from '@/services/permissionService';
import Sidebar from './Sidebar';
import DemoRoleSwitcher from '@/components/demo/DemoRoleSwitcher';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getCurrentUser, getSelectedDemoRole, getDemoUser, normalizeRole, isDebugModeEnabled } from '@/services/authService';
import { useSupabaseAuthState } from '@/hooks/useSupabaseAuthState';
import { isSupabaseConfigured } from '@/services/supabaseClient';
import { listEligibleCompanyNewsPopups } from '@/services/supabaseReadService';
import { dismissCompanyNewsPopup, markCompanyNewsPopupSeen } from '@/services/supabaseWriteService';
import { ShieldAlert } from 'lucide-react';

const STAFF_ROLES = new Set(['hq_admin', 'branch_supervisor', 'teacher']);
const POPUP_SESSION_SHOWN_KEY = 'companyNewsPopupSessionShownIds';
const POPUP_SESSION_HIDDEN_KEY = 'companyNewsPopupSessionHiddenIds';
const DEMO_POPUP_ANNOUNCEMENT_ID = 'demo-company-news-warm-popup';
const DEMO_STAFF_POPUP = {
  announcementId: DEMO_POPUP_ANNOUNCEMENT_ID,
  title: 'Warm Company News update',
  subtitle: 'Internal staff culture/news preview',
  bodyPreview: 'Celebrating this week team momentum. Tap View to open Company News in Announcements.',
  popupEmoji: '🎉',
  actionUrl: '/announcements',
  source: 'demo',
};

function readSessionIds(key) {
  try {
    if (typeof window === 'undefined') return new Set();
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value) => typeof value === 'string' && value.trim()));
  } catch (_error) {
    return new Set();
  }
}

function writeSessionIds(key, valueSet) {
  try {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(key, JSON.stringify([...valueSet]));
  } catch (_error) {
    // Ignore session storage failures; popup remains best-effort.
  }
}

export default function AppLayout() {
  const [fallbackUser, setFallbackUser] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [popupCandidate, setPopupCandidate] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const selectedDemoRole = getSelectedDemoRole();
  const isDebugMode = isDebugModeEnabled();
  const { appUser, loading: supabaseAuthLoading, isSupabaseAuthAvailable } = useSupabaseAuthState();
  const popupFetchAttemptedRef = useRef(false);
  const popupSeenMarkedRef = useRef(new Set());

  const isDemoActive = Boolean(selectedDemoRole);
  const showDemoTools = Boolean(isDemoActive || isDebugMode);

  useEffect(() => {
    if (isDemoActive) {
      return;
    }
    if (isSupabaseAuthAvailable && supabaseAuthLoading) {
      return;
    }
    if (appUser) {
      return;
    }
    getCurrentUser().then(setFallbackUser);
  }, [isDemoActive, isSupabaseAuthAvailable, supabaseAuthLoading, appUser, location.search]);

  let effectiveUser;
  let role;

  if (selectedDemoRole) {
    effectiveUser = getDemoUser(selectedDemoRole);
    role = selectedDemoRole;
  } else if (isSupabaseAuthAvailable && supabaseAuthLoading) {
    effectiveUser = null;
    role = null;
  } else if (appUser) {
    effectiveUser = { ...appUser, role: normalizeRole(appUser.role) || appUser.role };
    role = normalizeRole(effectiveUser.role) || effectiveUser.role;
  } else {
    effectiveUser = fallbackUser
      ? { ...fallbackUser, role: normalizeRole(fallbackUser.role) || fallbackUser.role }
      : null;
    role = normalizeRole(effectiveUser?.role);
  }

  const showSidebar = Boolean(role);
  const isStaffRole = STAFF_ROLES.has(role || '');
  const canRunAuthenticatedPopupRead = Boolean(
    !isDemoActive
      && isStaffRole
      && isSupabaseConfigured()
      && isSupabaseAuthAvailable
      && !supabaseAuthLoading
      && appUser?.id
  );
  const canRunDemoPopup = Boolean(isDemoActive && isStaffRole);
  const currentPopupId = popupCandidate?.announcementId || null;
  const popupTitle = popupCandidate?.title || 'Company News';
  const popupBodyPreview = popupCandidate?.bodyPreview || popupCandidate?.subtitle || '';
  const popupEmoji = popupCandidate?.popupEmoji || '';
  const shouldRenderPopup = Boolean(popupCandidate && isStaffRole);

  const isPopupSessionHidden = (announcementId) => readSessionIds(POPUP_SESSION_HIDDEN_KEY).has(announcementId);

  const markPopupSessionShown = (announcementId) => {
    if (!announcementId) return;
    const shownIds = readSessionIds(POPUP_SESSION_SHOWN_KEY);
    shownIds.add(announcementId);
    writeSessionIds(POPUP_SESSION_SHOWN_KEY, shownIds);
  };

  const markPopupSessionHidden = (announcementId) => {
    if (!announcementId) return;
    const hiddenIds = readSessionIds(POPUP_SESSION_HIDDEN_KEY);
    hiddenIds.add(announcementId);
    writeSessionIds(POPUP_SESSION_HIDDEN_KEY, hiddenIds);
  };

  const hidePopupForSession = () => {
    const announcementId = popupCandidate?.announcementId;
    if (announcementId) markPopupSessionHidden(announcementId);
    setPopupCandidate(null);
  };

  const safelyMarkPopupSeen = (announcementId) => {
    if (!announcementId || popupSeenMarkedRef.current.has(announcementId)) return;
    popupSeenMarkedRef.current.add(announcementId);
    void markCompanyNewsPopupSeen({ announcementId });
  };

  useEffect(() => {
    popupFetchAttemptedRef.current = false;
    popupSeenMarkedRef.current = new Set();
    setPopupCandidate(null);
  }, [isDemoActive, appUser?.id, role]);

  useEffect(() => {
    if (!canRunDemoPopup) return;
    if (popupCandidate) return;
    if (isPopupSessionHidden(DEMO_POPUP_ANNOUNCEMENT_ID)) return;
    markPopupSessionShown(DEMO_POPUP_ANNOUNCEMENT_ID);
    setPopupCandidate(DEMO_STAFF_POPUP);
  }, [canRunDemoPopup, isPopupSessionHidden, popupCandidate]);

  useEffect(() => {
    if (!canRunAuthenticatedPopupRead) return;
    if (popupFetchAttemptedRef.current) return;
    popupFetchAttemptedRef.current = true;

    void (async () => {
      const result = await listEligibleCompanyNewsPopups({ limit: 1 });
      const candidate = Array.isArray(result.data) ? result.data[0] : null;
      const announcementId = candidate?.announcementId;
      if (!announcementId || isPopupSessionHidden(announcementId)) return;
      markPopupSessionShown(announcementId);
      setPopupCandidate({ ...candidate, source: 'auth' });
    })();
  }, [canRunAuthenticatedPopupRead, isPopupSessionHidden]);

  useEffect(() => {
    if (!shouldRenderPopup) return;
    if (!currentPopupId) return;
    if (popupCandidate?.source !== 'auth') return;
    const timer = window.setTimeout(() => {
      safelyMarkPopupSeen(currentPopupId);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [currentPopupId, popupCandidate?.source, shouldRenderPopup]);

  const onPopupView = () => {
    if (currentPopupId && popupCandidate?.source === 'auth') {
      safelyMarkPopupSeen(currentPopupId);
    }
    hidePopupForSession();
    navigate('/announcements', {
      state: {
        announcementId: currentPopupId || undefined,
        preferredFilter: 'Company News',
      },
    });
  };

  const onPopupDismiss = () => {
    const announcementId = currentPopupId;
    const isAuthPopup = popupCandidate?.source === 'auth';
    hidePopupForSession();
    if (announcementId && isAuthPopup) {
      void dismissCompanyNewsPopup({ announcementId });
    }
  };

  if (!isDemoActive && isSupabaseAuthAvailable && supabaseAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-muted-foreground text-sm">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          <span>Loading session…</span>
        </div>
      </div>
    );
  }

  const hasResolvedIdentity = Boolean(appUser?.id || fallbackUser?.id);
  const needsRoleAssignment = Boolean(
    !isDemoActive
      && !role
      && hasResolvedIdentity
  );

  if (needsRoleAssignment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <EmptyState
          icon={ShieldAlert}
          title="Profile role required"
          description="Your account is signed in, but no application role is on file. Contact an administrator or use Auth Preview to sign out and try again."
        />
      </div>
    );
  }

  if (role && !isRouteAllowed(role, location.pathname)) {
    return (
      <div className="min-h-screen bg-background">
        {showSidebar && (
          <div className="hidden lg:block">
            <Sidebar user={effectiveUser} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
          </div>
        )}
        <main className={cn(
          "transition-all duration-300 min-h-screen",
          showSidebar ? (collapsed ? 'ml-0 lg:ml-[72px]' : 'ml-0 lg:ml-[260px]') : 'ml-0'
        )}>
          <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
            {showDemoTools ? <DemoRoleSwitcher layoutRole={role} /> : null}
            <EmptyState
              icon={ShieldAlert}
              title="Access restricted"
              description={isDemoActive ? 'This page is not available for the current demo role.' : 'This page is not available for your account role.'}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {showSidebar && (
        <div className="hidden lg:block">
          <Sidebar user={effectiveUser} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        </div>
      )}
      <main className={cn(
        "transition-all duration-300 min-h-screen",
        showSidebar ? (collapsed ? 'ml-0 lg:ml-[72px]' : 'ml-0 lg:ml-[260px]') : 'ml-0'
      )}>
        <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
          {showDemoTools ? <DemoRoleSwitcher layoutRole={role} /> : null}
          <Outlet context={{ user: effectiveUser, role }} />
        </div>
      </main>
      {shouldRenderPopup ? (
        <div className="fixed bottom-4 right-4 left-4 lg:left-auto lg:max-w-[17rem] z-50 pointer-events-none [&>*]:pointer-events-auto">
          <div
            className="rounded-xl border bg-card shadow-md p-3 space-y-2"
            role="dialog"
            aria-label="Company News popup"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold leading-snug">
                {popupEmoji ? `${popupEmoji} ` : ''}{popupTitle}
              </p>
            </div>
            {popupBodyPreview ? (
              <p className="text-xs text-muted-foreground line-clamp-2">{popupBodyPreview}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="min-h-8 text-xs" onClick={onPopupView}>
                View
              </Button>
              <Button size="sm" variant="outline" className="min-h-8 text-xs" onClick={onPopupDismiss}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}