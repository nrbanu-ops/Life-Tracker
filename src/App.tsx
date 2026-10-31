import { BrowserRouter, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { TimerProvider } from './components/TimerProvider'
import { CalendarPage } from './pages/CalendarPage'
import { HabitsPage } from './pages/HabitsPage'
import { JournalPage } from './pages/JournalPage'
import { LibraryPage } from './pages/LibraryPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { SettingsPage } from './pages/SettingsPage'
import { StatsPage } from './pages/StatsPage'
import { TasksPage } from './pages/TasksPage'
import { TimerPage } from './pages/TimerPage'
import { TodayPage } from './pages/TodayPage'

export default function App() {
  return (
    <TimerProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<TodayPage />} />
            <Route path="takvim" element={<CalendarPage />} />
            <Route path="projeler" element={<ProjectsPage />} />
            <Route path="projeler/:id" element={<ProjectDetailPage />} />
            <Route path="habitler" element={<HabitsPage />} />
            <Route path="istatistik" element={<StatsPage />} />
            <Route path="gorevler" element={<TasksPage />} />
            <Route path="gunluk" element={<JournalPage />} />
            <Route path="zamanlayici" element={<TimerPage />} />
            <Route path="kutuphane" element={<LibraryPage />} />
            <Route path="ayarlar" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TimerProvider>
  )
}
