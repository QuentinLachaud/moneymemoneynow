import React from 'react';
import { calculateAccountValue } from '../utils/calculations';
import { Account } from '../types';

type Props = {
  account: Account;
  years?: number;
  color?: string;
  width?: number;
  height?: number;
};

export default function Sparkline({ account, years = 10, color = '#666', width = 80, height = 24 }: Props) {
  const values: number[] = [];
  for (let y = 0; y <= years; y++) {
    values.push(calculateAccountValue(account, y));
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <polyline fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" points={points} />
    </svg>
  );
}
