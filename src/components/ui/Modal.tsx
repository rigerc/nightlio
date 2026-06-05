import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';

interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose?: () => void;
  maxWidth?: number;
}

const Modal = ({ open, title, children, onClose, maxWidth = 520 }: ModalProps) => (
  <Dialog open={open} onOpenChange={(v) => { if (!v && onClose) onClose(); }}>
    <DialogContent style={{ maxWidth }} className="p-0">
      <DialogHeader className="px-5 pt-5 pb-4 border-b border-[var(--border)] mb-0">
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="p-5">{children}</div>
    </DialogContent>
  </Dialog>
);

export default Modal;
