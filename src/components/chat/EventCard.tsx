import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export type EventType = 'success' | 'error' | 'info' | 'warning';

export interface EventCardProps {
  id: string;
  type: EventType;
  title: string;
  message?: string;
  onClose: (id: string) => void;
}

const eventStyles = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-100',
    icon: CheckCircle,
    iconColor: 'text-green-600',
  },
  error: {
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    icon: AlertCircle,
    iconColor: 'text-rose-600',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    icon: Info,
    iconColor: 'text-blue-600',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
  },
};

export function EventCard({ id, type, title, message, onClose }: EventCardProps) {
  const style = eventStyles[type];
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 30,
        duration: 0.3
      }}
      className={`
        relative
        w-full md:w-[320px] rounded-xl
        ${style.bg} ${style.border}
        border
        p-4
      `}
    >
      <div className="flex items-start gap-3">
        {/* Simple icon */}
        <div className={`flex-shrink-0 ${style.iconColor}`}>
          <Icon size={18} strokeWidth={2.5} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-gray-700 font-medium mb-1 text-sm">
            {title}
          </div>
          {message && (
            <div className="text-gray-500 text-xs">
              {message}
            </div>
          )}
        </div>
        
        {/* Simple close button */}
        <button
          onClick={() => onClose(id)}
          aria-label="Close notification"
          className="
            flex-shrink-0 w-6 h-6 rounded-lg
            text-gray-400 hover:text-gray-600
            hover:bg-gray-100
            transition-colors duration-150
            flex items-center justify-center
          "
        >
          <X size={12} strokeWidth={2} />
        </button>
      </div>
    </motion.div>
  );
}
