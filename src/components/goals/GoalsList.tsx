import type { Goal } from '../../types';
import GoalCard from './GoalCard';
import AddGoalCard from './AddGoalCard';

interface GoalWithExtra extends Goal {
  frequency: string;
  total: number;
  _doneToday?: boolean;
}

interface GoalsListProps {
  goals: GoalWithExtra[];
  onDelete: (id: number) => void;
  onUpdateProgress: (id: number) => void;
  onAdd?: () => void;
}

const GoalsList = ({ goals, onDelete, onUpdateProgress, onAdd }: GoalsListProps) => {
  if (goals.length === 0) {
    return (
      <div className="card-grid">
        {onAdd && <AddGoalCard onAdd={onAdd} />}
      </div>
    );
  }

  return (
    <div className="card-grid">
      {onAdd && <AddGoalCard onAdd={onAdd} />}
      {goals.map(goal => (
        <GoalCard
          key={goal.id}
          goal={goal}
          onDelete={onDelete}
          onUpdateProgress={onUpdateProgress}
        />
      ))}
    </div>
  );
};

export default GoalsList;
