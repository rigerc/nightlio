import { Progress } from './progress';

const ProgressBar = ({ value = 0, max = 100, label }) => {
  const pct = Math.min(100, Math.max(0, (value / (max || 1)) * 100));
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-1.5 text-xs text-[var(--text-muted)]">
          <span>{label}</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <Progress value={value} max={max} />
    </div>
  );
};

export default ProgressBar;
