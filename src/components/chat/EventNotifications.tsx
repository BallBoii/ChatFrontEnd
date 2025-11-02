'use client';

import { AnimatePresence } from 'framer-motion';
import { EventCard } from './EventCard';
import { useEventNotifications } from './useEventNotifications';
import type { EventNotification } from './useEventNotifications';

export function EventNotifications() {
  const { notifications, removeNotification } = useEventNotifications();

  return (
    <div className="fixed top-4 right-4 md:top-6 md:right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-[calc(100vw-2rem)]">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <EventCard
              {...notification}
              onClose={removeNotification}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
