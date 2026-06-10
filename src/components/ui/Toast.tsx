import { useEffect, useState } from 'react';
import { Animated, Text, View } from 'react-native';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

let _show: ((text: string, type?: ToastType) => void) | null = null;

export function showToast(text: string, type: ToastType = 'info') {
  _show?.(text, type);
}

export function Toast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    _show = (text, type = 'info') => {
      const id = Date.now();
      setMessages((prev) => [...prev, { id, text, type }]);
      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== id));
      }, 3000);
    };
    return () => { _show = null; };
  }, []);

  if (!messages.length) return null;

  return (
    <View className="absolute bottom-24 left-4 right-4 gap-2 z-50">
      {messages.map((m) => (
        <View
          key={m.id}
          className={`px-4 py-3 rounded-xl shadow-lg ${
            m.type === 'success'
              ? 'bg-green-500'
              : m.type === 'error'
              ? 'bg-destructive'
              : 'bg-foreground'
          }`}
        >
          <Text className="text-white font-medium text-sm">{m.text}</Text>
        </View>
      ))}
    </View>
  );
}
