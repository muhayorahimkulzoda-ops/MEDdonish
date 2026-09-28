'use client';

import { useEffect } from 'react';

export default function LearnPage() {
  useEffect(() => {
    window.location.replace('/courses');
  }, []);
  return null;
}
