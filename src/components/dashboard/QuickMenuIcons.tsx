import React, { useId } from 'react';

export interface QuickMenuIconProps {
  className?: string;
}

const ORANGE_PRIMARY = '#F97316';

/**
 * 1. Monitoring — Ref: Lucide Eye (Single-Tone Solid Filled + Negative Space)
 * Siluet mata orange solid dengan pupil lubang transparan.
 */
export const MonitoringIcon: React.FC<QuickMenuIconProps> = ({
  className = 'w-7 h-7 sm:w-8 sm:h-8',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0Z M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 1 0 0-7.2Z"
      fill={ORANGE_PRIMARY}
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </svg>
);

/**
 * 2. Jadwal Kerja — Ref: Lucide CalendarClock (Single-Tone Solid Filled + Negative Space)
 * Kalender dan jam orange solid dengan pemisah header, celah jam, serta jarum jam transparan.
 */
export const WorkScheduleIcon: React.FC<QuickMenuIconProps> = ({
  className = 'w-7 h-7 sm:w-8 sm:h-8',
}) => {
  const rawId = useId();
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const calendarMaskId = `quick_schedule_cal_${safeId}`;
  const clockMaskId = `quick_schedule_clk_${safeId}`;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <mask id={calendarMaskId}>
          <rect width="24" height="24" fill="white" />
          <line x1="2.5" y1="9.5" x2="21.5" y2="9.5" stroke="black" strokeWidth="1.7" />
          <circle cx="16.5" cy="16.5" r="6.7" fill="black" />
        </mask>
        <mask id={clockMaskId}>
          <rect width="24" height="24" fill="white" />
          <path
            d="M16.5 13.8v2.7l1.8 1.2"
            stroke="black"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </mask>
      </defs>

      <rect
        x="3"
        y="4.5"
        width="17.5"
        height="17"
        rx="2.5"
        fill={ORANGE_PRIMARY}
        mask={`url(#${calendarMaskId})`}
      />
      <path
        d="M8 2.2v3.3M15.5 2.2v3.3"
        stroke={ORANGE_PRIMARY}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle
        cx="16.5"
        cy="16.5"
        r="5.3"
        fill={ORANGE_PRIMARY}
        mask={`url(#${clockMaskId})`}
      />
    </svg>
  );
};

/**
 * 3. Lokasi — Ref: Lucide MapPin (Single-Tone Solid Filled + Negative Space)
 * Siluet pin lokasi orange solid proporsional dengan lubang pusat transparan.
 */
export const LocationIcon: React.FC<QuickMenuIconProps> = ({
  className = 'w-7 h-7 sm:w-8 sm:h-8',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M20.5 10.2c0 5.3-5.8 10.7-7.85 12.35a1.05 1.05 0 0 1-1.3 0C9.3 20.9 3.5 15.5 3.5 10.2a8.5 8.5 0 1 1 17 0Z M12 6.7a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 1 0 0-6.8Z"
      fill={ORANGE_PRIMARY}
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </svg>
);

/**
 * 4. Hari Libur — Ref: Lucide CalendarOff (Single-Tone Solid Filled + Negative Space)
 * Kalender orange solid dengan pemisah header dan garis diagonal negative space transparan.
 */
export const HolidayIcon: React.FC<QuickMenuIconProps> = ({
  className = 'w-7 h-7 sm:w-8 sm:h-8',
}) => {
  const rawId = useId();
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const calendarMaskId = `quick_holiday_cal_${safeId}`;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <mask id={calendarMaskId}>
          <rect width="24" height="24" fill="white" />
          <line x1="2.5" y1="9.5" x2="21.5" y2="9.5" stroke="black" strokeWidth="1.7" />
          <line
            x1="2.5"
            y1="2.5"
            x2="21.5"
            y2="21.5"
            stroke="black"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </mask>
      </defs>

      <rect
        x="3"
        y="4.5"
        width="18"
        height="17"
        rx="2.5"
        fill={ORANGE_PRIMARY}
        mask={`url(#${calendarMaskId})`}
      />
      <path
        d="M8 2.2v3.3M16 2.2v3.3"
        stroke={ORANGE_PRIMARY}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * 5. Riwayat Presensi — Ref: Lucide CalendarCheck (Single-Tone Solid Filled + Negative Space)
 * Kalender orange solid dengan pemisah header dan simbol centang negative space transparan.
 */
export const AttendanceHistoryIcon: React.FC<QuickMenuIconProps> = ({
  className = 'w-7 h-7 sm:w-8 sm:h-8',
}) => {
  const rawId = useId();
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const calendarMaskId = `quick_history_cal_${safeId}`;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <mask id={calendarMaskId}>
          <rect width="24" height="24" fill="white" />
          <line x1="2.5" y1="9.5" x2="21.5" y2="9.5" stroke="black" strokeWidth="1.7" />
          <path
            d="m8.2 15.8 2.4 2.4 5.2-5.2"
            stroke="black"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </mask>
      </defs>

      <rect
        x="3"
        y="4.5"
        width="18"
        height="17"
        rx="2.5"
        fill={ORANGE_PRIMARY}
        mask={`url(#${calendarMaskId})`}
      />
      <path
        d="M8 2.2v3.3M16 2.2v3.3"
        stroke={ORANGE_PRIMARY}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * 6. Permohonan — Ref: Lucide FileText (Single-Tone Solid Filled + Negative Space)
 * Dokumen orange solid dengan lipatan sudut dan garis teks negative space transparan.
 */
export const RequestIcon: React.FC<QuickMenuIconProps> = ({
  className = 'w-7 h-7 sm:w-8 sm:h-8',
}) => {
  const rawId = useId();
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const docMaskId = `quick_request_doc_${safeId}`;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <mask id={docMaskId}>
          <rect width="24" height="24" fill="white" />
          <path
            d="M14 1.5v4.5a2 2 0 0 0 2 2h4.5"
            stroke="black"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M8 9.5h3M8 13.5h8M8 17.5h8"
            stroke="black"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </mask>
      </defs>

      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"
        fill={ORANGE_PRIMARY}
        mask={`url(#${docMaskId})`}
      />
    </svg>
  );
};
