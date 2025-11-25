'use client';

import { useState } from 'react';

interface CalendarProps {
  currentMonth?: string;
  currentYear?: number;
  selectedDate?: number;
  onDateSelect?: (date: number) => void;
  onMonthChange?: (direction: 'prev' | 'next') => void;
}

export default function Calendar({
  currentMonth = 'Julho',
  currentYear = 2022,
  selectedDate = 14,
  onDateSelect,
  onMonthChange,
}: CalendarProps) {
  const [selected, setSelected] = useState(selectedDate);

  const handleDateClick = (date: number) => {
    setSelected(date);
    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (onMonthChange) {
      onMonthChange(direction);
    }
  };

  // Days of the week
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  // Calendar dates (July 2022 example)
  const calendarDates = [
    { date: null, isOtherMonth: true },
    { date: null, isOtherMonth: true },
    { date: null, isOtherMonth: true },
    { date: null, isOtherMonth: true },
    { date: null, isOtherMonth: true },
    { date: 1, isOtherMonth: false },
    { date: 2, isOtherMonth: false },
    { date: 3, isOtherMonth: false },
    { date: 4, isOtherMonth: false },
    { date: 5, isOtherMonth: false },
    { date: 6, isOtherMonth: false },
    { date: 7, isOtherMonth: false },
    { date: 8, isOtherMonth: false },
    { date: 9, isOtherMonth: false },
    { date: 10, isOtherMonth: false },
    { date: 11, isOtherMonth: false },
    { date: 12, isOtherMonth: false },
    { date: 13, isOtherMonth: false },
    { date: 14, isOtherMonth: false },
    { date: 15, isOtherMonth: false },
    { date: 16, isOtherMonth: false },
    { date: 17, isOtherMonth: false },
    { date: 18, isOtherMonth: false },
    { date: 19, isOtherMonth: false },
    { date: 20, isOtherMonth: false },
    { date: 21, isOtherMonth: false },
    { date: 22, isOtherMonth: false },
    { date: 23, isOtherMonth: false },
    { date: 24, isOtherMonth: false },
    { date: 25, isOtherMonth: false },
    { date: 26, isOtherMonth: false },
    { date: 27, isOtherMonth: false },
    { date: 28, isOtherMonth: false },
    { date: 29, isOtherMonth: false },
    { date: 30, isOtherMonth: false },
    { date: 31, isOtherMonth: false },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-200">
        Calendário
      </h2>
      
      {/* Month Navigation */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => handleMonthChange('prev')}
          className="text-text-light-secondary dark:text-text-dark-secondary hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">
          {currentMonth} {currentYear}
        </span>
        <button
          onClick={() => handleMonthChange('next')}
          className="text-text-light-secondary dark:text-text-dark-secondary hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      {/* Week Days */}
      <div className="grid grid-cols-7 text-center text-sm text-text-light-secondary dark:text-text-dark-secondary mb-2">
        {weekDays.map((day, index) => (
          <span key={index}>{day}</span>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 text-center text-sm gap-y-1">
        {calendarDates.map((item, index) => {
          if (item.date === null) {
            return (
              <span
                key={index}
                className="text-gray-400 dark:text-gray-500"
              ></span>
            );
          }

          const isSelected = item.date === selected;

          return (
            <button
              key={index}
              onClick={() => handleDateClick(item.date!)}
              className={`w-8 h-8 flex items-center justify-center mx-auto rounded-full transition-all ${
                isSelected
                  ? 'bg-primary text-white font-semibold'
                  : 'text-text-light-primary dark:text-text-dark-primary hover:bg-primary/10'
              }`}
            >
              {item.date}
            </button>
          );
        })}
      </div>
    </div>
  );
}
