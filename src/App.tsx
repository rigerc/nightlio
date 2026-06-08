import { useCallback, useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import LoginPage from "./components/auth/LoginPage";
import NotFound from "./views/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import { ConfigProvider } from "./contexts/ConfigContext";
import { BurnerProvider } from "./contexts/BurnerContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Header from "./components/Header";
import Sidebar from "./components/navigation/Sidebar";
import BottomNav from "./components/navigation/BottomNav";
import FAB from "./components/FAB";
import HistoryView from "./views/HistoryView";
import HistoryList from "./components/history/HistoryList";
import GoalsSection from "./components/goals/GoalsSection";
import EntryView from "./views/EntryView";
import StatisticsView from "./components/stats/StatisticsView";
import SettingsView from "./views/SettingsView";
import GoalsView from "./views/GoalsView";
import { ToastProvider } from "./components/ui/ToastProvider";
import AchievementsView from "./views/AchievementsView";
import AboutPage from "./views/AboutPage";
import { useMoodData } from "./hooks/useMoodData";
import { useGroups } from "./hooks/useGroups";
import { useStatistics } from "./hooks/useStatistics";
import type { Entry, MoodValue } from "./types";
import "./App.css";

type LocationState = { mood?: MoodValue; entry?: Entry };

const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { pastEntries, setPastEntries, loading: historyLoading, error: historyError, refreshHistory } = useMoodData();
  const [searchResults, setSearchResults] = useState<Entry[] | null>(null);
  const { groups } = useGroups();
  const { statistics, currentStreak, loading: statsLoading, error: statsError, loadStatistics } = useStatistics();

  const handleMoodSelect = (moodValue: MoodValue) => {
    navigate('entry', { state: { mood: moodValue } });
  };

  const handleBackToHistory = () => {
    navigate('/dashboard');
  };

  const upsertEntry = useCallback((entry: Partial<Entry> & { id: number }) => {
    if (!entry.id) return;
    setPastEntries((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === entry.id);
      if (existingIndex === -1) {
        return [entry as Entry, ...prev];
      }
      return prev.map((item) =>
        item.id === entry.id ? { ...item, ...entry } as Entry : item
      );
    });
  }, [setPastEntries]);

  const handleEntryDeleted = useCallback((deletedEntryId: number) => {
    setPastEntries((prev) => prev.filter((entry) => entry.id !== deletedEntryId));
  }, [setPastEntries]);

  const handleStartEdit = (entry: Entry) => {
    navigate('entry', { state: { entry, mood: entry.mood } });
  };

  const locationState = (location.state as LocationState | null) ?? {};
  const { mood: selectedMood, entry: editingEntry } = locationState;

  const handleEditMoodSelect = (moodValue: MoodValue) => {
    navigate('.', { state: { ...locationState, mood: moodValue }, replace: true });
  };

  const handleEntryUpdated = useCallback((
    updatedEntry: Partial<Entry> & { id: number },
    options: { navigateAfterSave?: boolean; refreshAfterSave?: boolean } = {}
  ) => {
    const { navigateAfterSave = true, refreshAfterSave = true } = options;
    upsertEntry(updatedEntry);
    if (navigateAfterSave) navigate('/dashboard');
    if (refreshAfterSave) refreshHistory();
  }, [upsertEntry, navigate, refreshHistory]);

  const displayEntries = searchResults !== null ? searchResults : pastEntries;
  const isEntryView = location.pathname.endsWith('/entry');

  const handleGlobalSearch = useCallback((results: Entry[] | null) => {
    setSearchResults(results);
    if (results !== null) {
      if (location.pathname !== '/dashboard' && location.pathname !== '/dashboard/') {
        navigate('/dashboard');
      }
      requestAnimationFrame(() => {
        const historySection = document.getElementById('history-section');
        if (historySection) {
          const headerOffset = 80;
          const elementPosition = historySection.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.scrollY - headerOffset;
          window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
      });
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    const handler = () => {
      if (!location.pathname.startsWith('/dashboard')) {
        navigate('/dashboard');
        return;
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('waymark:new-entry', handler);
    return () => window.removeEventListener('waymark:new-entry', handler);
  }, [location.pathname, navigate]);

  return (
    <>
      <div className="min-h-screen">
        {!isEntryView && <Sidebar onLoadStatistics={loadStatistics} />}

        <div className={`flex flex-col min-h-screen ${!isEntryView ? 'md:ml-[280px]' : ''}`}>
          <Header
            currentStreak={currentStreak}
            pastEntries={pastEntries}
            onSearch={handleGlobalSearch}
            showSearch={!isEntryView}
          />

          <div className="flex-1">
            <main className="relative bg-[color-mix(in_oklab,var(--surface)_10%,transparent)] backdrop-blur-xl rounded-xl border border-[var(--border)] shadow-sm p-6 m-6 mb-0 overflow-auto max-md:m-0 max-md:rounded-none max-md:border-x-0 max-md:shadow-none max-md:p-4">
              <Routes>
                <Route index element={
                  <HistoryView
                    pastEntries={displayEntries}
                    loading={historyLoading}
                    error={historyError}
                    onMoodSelect={handleMoodSelect}
                    onDelete={handleEntryDeleted}
                    onEdit={handleStartEdit}
                    renderOnlyHeader={true}
                  />
                } />
                <Route path="entry" element={
                  <EntryView
                    selectedMood={selectedMood}
                    groups={groups}
                    onBack={handleBackToHistory}
                    onEntryDeleted={handleEntryDeleted}
                    editingEntry={editingEntry}
                    onEntryUpdated={handleEntryUpdated}
                    onEditMoodSelect={handleEditMoodSelect}
                    onSelectMood={handleMoodSelect}
                  />
                } />
                <Route path="stats" element={
                  <StatisticsView
                    statistics={statistics}
                    pastEntries={pastEntries}
                    loading={statsLoading}
                    error={statsError}
                  />
                } />
                <Route path="achievements" element={<AchievementsView />} />
                <Route path="goals" element={<GoalsView />} />
                <Route path="settings" element={<SettingsView />} />
              </Routes>
            </main>

            <Routes>
              <Route index element={
                <>
                  <section className="mx-6 mt-6 max-md:mx-4 max-md:mt-6" aria-label="Goals section">
                    <GoalsSection onNavigateToGoals={() => navigate('goals')} />
                  </section>
                  <section className="mx-6 mt-6 pb-6 max-md:mx-4 max-md:pb-24" aria-label="History entries" id="history-section">
                    <h2 className="m-0 mb-2 pl-1 text-[var(--text)]">
                      {searchResults !== null ? `Search Results (${searchResults.length})` : 'History'}
                    </h2>
                    <HistoryList
                      entries={displayEntries}
                      loading={historyLoading}
                      error={historyError}
                      onDelete={handleEntryDeleted}
                      onEdit={handleStartEdit}
                      groups={groups}
                    />
                  </section>
                </>
              } />
            </Routes>
          </div>
        </div>
      </div>

      <BottomNav onLoadStatistics={loadStatistics} />

      <FAB
        onClick={() => {
          if (location.pathname === '/dashboard' || location.pathname === '/dashboard/') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            navigate('/dashboard');
          }
        }}
        label="Scroll to top"
      />
    </>
  );
};

function App() {
  return (
    <ConfigProvider>
      <ToastProvider>
        <BurnerProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/dashboard/*"
                element={
                  <ProtectedRoute>
                    <AppContent />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BurnerProvider>
      </ToastProvider>
    </ConfigProvider>
  );
}

export default App;
