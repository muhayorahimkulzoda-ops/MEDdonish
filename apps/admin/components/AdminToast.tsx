'use client';

import { useEffect, useState } from 'react';

type Listener = (message: string) => void;
const listeners = new Set<Listener>();

export function useAdminToast() {
  return (message: string) => {
    for (const listener of listeners) listener(message);
  };
}

export function AdminToastHost() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    const listener: Listener = (text) => {
      setMessage(text);
      window.setTimeout(() => setMessage(''), 2500);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (!message) return null;
  return (
    <div className="card" role="status">
      {message}
    </div>
  );
}
