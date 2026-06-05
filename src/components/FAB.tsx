import { Plus } from 'lucide-react';

interface FABProps {
  onClick: () => void;
  label?: string;
}

const FAB = ({ onClick, label = 'New Entry' }: FABProps) => (
  <button
    className="fixed right-[18px] bottom-[78px] w-14 h-14 rounded-full grid place-items-center bg-[var(--accent-bg)] text-white border-none shadow-md z-[60] sm:hidden"
    onClick={onClick}
    aria-label={label}
    title={label}
  >
    <Plus size={24} />
  </button>
);

export default FAB;
