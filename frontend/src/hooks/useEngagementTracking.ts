import { useEffect, useCallback } from 'react';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

interface EngagementEvent {
  action: string;
  metadata?: Record<string, any>;
}

export const useEngagementTracking = () => {
  const { user } = useAuthStore();

  const trackEvent = useCallback(async (event: EngagementEvent) => {
    if (!user) return;

    try {
      await api.post('/valuation/track', {
        action: event.action,
        metadata: {
          ...event.metadata,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          screenSize: `${window.innerWidth}x${window.innerHeight}`,
        },
      });
    } catch (error) {
      // Silently fail - don't interrupt user experience
      console.debug('Engagement tracking failed:', error);
    }
  }, [user]);

  // Track page views
  useEffect(() => {
    if (!user) return;

    trackEvent({
      action: 'page_view',
      metadata: {
        path: window.location.pathname,
        referrer: document.referrer,
      },
    });
  }, [user, trackEvent]);

  // Track time spent on page
  useEffect(() => {
    if (!user) return;

    const startTime = Date.now();

    const handleBeforeUnload = () => {
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      
      // Use sendBeacon for reliable tracking on page unload
      const data = JSON.stringify({
        action: 'page_time_spent',
        metadata: {
          path: window.location.pathname,
          seconds: timeSpent,
        },
      });

      navigator.sendBeacon('http://localhost:8001/api/valuation/track', data);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

  // Track clicks on important elements
  useEffect(() => {
    if (!user) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Track button clicks
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        const button = target.closest('button');
        trackEvent({
          action: 'button_click',
          metadata: {
            text: button?.textContent?.trim(),
            className: button?.className,
          },
        });
      }

      // Track link clicks
      if (target.tagName === 'A' || target.closest('a')) {
        const link = target.closest('a');
        trackEvent({
          action: 'link_click',
          metadata: {
            href: link?.href,
            text: link?.textContent?.trim(),
          },
        });
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [user, trackEvent]);

  return {
    trackEvent,
    // Specific tracking methods for important actions
    trackStockView: (ticker: string, action: string) => {
      trackEvent({
        action: 'stock_viewed',
        metadata: { ticker, action },
      });
    },
    trackRecommendationAction: (recommendationId: string, action: 'follow' | 'ignore' | 'save') => {
      trackEvent({
        action: 'recommendation_action',
        metadata: { recommendationId, action },
      });
    },
    trackPortfolioAction: (action: string, value?: number) => {
      trackEvent({
        action: 'portfolio_action',
        metadata: { action, value },
      });
    },
    trackFeatureUsage: (feature: string) => {
      trackEvent({
        action: 'feature_used',
        metadata: { feature },
      });
    },
  };
};