'use client';

import { useState, useEffect } from 'react';
import { intervalToDuration } from 'date-fns';

interface CountdownProps {
  targetDate: Date | undefined;
}

const CountdownUnit = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center justify-center bg-primary/5 p-4 rounded-lg shadow-inner min-w-[90px] h-24 sm:h-28">
    <span className="text-3xl sm:text-4xl font-bold tracking-tighter text-primary">{value}</span>
    <span className="text-xs sm:text-sm uppercase text-muted-foreground">{label}</span>
  </div>
);

export default function Countdown({ targetDate }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<Duration>({});

  useEffect(() => {
    if (!targetDate) return;

    const calculate = () => {
      const now = new Date();
      const end = new Date(targetDate);
      if (end > now) {
        setTimeLeft(intervalToDuration({ start: now, end }));
      } else {
        setTimeLeft({});
      }
    };

    calculate();
    const timer = setInterval(calculate, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const { months = 0, days = 0, hours = 0, minutes = 0, seconds = 0 } = timeLeft;

  if (!targetDate || !Object.keys(timeLeft).length) {
    return (
      <div className="text-center w-full">
        <h2 className="text-2xl font-semibold text-foreground mb-4">O grande dia chegou!</h2>
      </div>
    );
  }

  return (
    <div className="text-center w-full">
      <h2 className="text-xl font-semibold text-foreground mb-4">Contagem regressiva para o grande dia:</h2>
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
        <CountdownUnit value={months} label="Meses" />
        <CountdownUnit value={days} label="Dias" />
        <CountdownUnit value={hours} label="Horas" />
        <CountdownUnit value={minutes} label="Minutos" />
        <CountdownUnit value={seconds} label="Segundos" />
      </div>
    </div>
  );
}