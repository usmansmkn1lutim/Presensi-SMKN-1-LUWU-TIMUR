/**
 * Date and relative time utilities for Indonesian locale
 */

export function formatRelativeTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '—';

  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSeconds < 45) {
    return 'Baru saja';
  }
  if (diffInMinutes < 60) {
    return `${diffInMinutes} menit yang lalu`;
  }
  if (diffInHours < 24) {
    return `${diffInHours} jam yang lalu`;
  }
  if (diffInDays === 1) {
    const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return `Kemarin, ${timeStr}`;
  }
  if (diffInDays < 7) {
    return `${diffInDays} hari yang lalu`;
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatFullDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
