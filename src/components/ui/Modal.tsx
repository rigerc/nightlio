import { Modal as RNModal, View, Text, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import type { ReactNode } from 'react';
import { X } from 'lucide-react-native';

interface ModalProps {
  open: boolean;
  title?: string;
  children: ReactNode;
  onClose?: () => void;
}

export function Modal({ open, title, children, onClose }: ModalProps) {
  return (
    <RNModal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable className="flex-1 bg-black/50 justify-center px-4" onPress={onClose}>
          <Pressable className="bg-card rounded-2xl overflow-hidden" onPress={() => {}}>
            {title && (
              <View className="flex-row items-center justify-between px-5 py-4 border-b border-border">
                <Text className="text-lg font-semibold text-foreground">{title}</Text>
                {onClose && (
                  <Pressable onPress={onClose} hitSlop={8}>
                    <X size={20} color="#6b7280" />
                  </Pressable>
                )}
              </View>
            )}
            <View className="p-5">{children}</View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </RNModal>
  );
}
