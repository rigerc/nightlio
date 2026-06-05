import MoodPicker from '../components/mood/MoodPicker';
import HistoryList from '../components/history/HistoryList';
import type { Entry, Group, MoodValue } from '../types';

interface HistoryViewProps {
  pastEntries: Entry[];
  loading: boolean;
  error: string | null;
  onMoodSelect: (mood: MoodValue) => void;
  onDelete: (id: number) => void;
  onEdit?: (entry: Entry) => void;
  renderOnlyHeader?: boolean;
  groups?: Group[];
}

const HistoryView = ({ pastEntries, loading, error, onMoodSelect, onDelete, onEdit, renderOnlyHeader = false, groups = [] }: HistoryViewProps) => {

  const currentDate = new Date();
  const dateString = currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeString = currentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <>
      <div className="history-header">
        <MoodPicker onMoodSelect={onMoodSelect} />
        <div className="history-date">
          <h2 className="history-today-title">Today</h2>
          <div className="history-datetime-group">
            <span className="history-date-part">{dateString}</span>
            <span className="history-time-part">{timeString}</span>
          </div>
        </div>
      </div>

      {renderOnlyHeader ? null : (
        <HistoryList
          entries={pastEntries}
          loading={loading}
          error={error}
          onDelete={onDelete}
          onEdit={onEdit}
          groups={groups}
        />
      )}
    </>
  );
};

export default HistoryView;
