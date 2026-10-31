import { lazy, type ComponentType } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { TimerProvider } from './components/TimerProvider'
import { TodayPage } from './pages/TodayPage'

// The home screen loads with the app; every other screen (and big libraries such as the
// charts) is fetched when first opened, so the app starts faster.
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => load().then((module) => ({ default: module[name] })))

const AchievementsPage = page(() => import('./pages/AchievementsPage'), 'AchievementsPage')
const AssistantPage = page(() => import('./pages/AssistantPage'), 'AssistantPage')
const CalendarPage = page(() => import('./pages/CalendarPage'), 'CalendarPage')
const HabitsPage = page(() => import('./pages/HabitsPage'), 'HabitsPage')
const JournalPage = page(() => import('./pages/JournalPage'), 'JournalPage')
const LibraryPage = page(() => import('./pages/LibraryPage'), 'LibraryPage')
const ProjectDetailPage = page(() => import('./pages/ProjectDetailPage'), 'ProjectDetailPage')
const ProfilePage = page(() => import('./pages/ProfilePage'), 'ProfilePage')
const ProjectsPage = page(() => import('./pages/ProjectsPage'), 'ProjectsPage')
const SettingsPage = page(() => import('./pages/SettingsPage'), 'SettingsPage')
const StatsPage = page(() => import('./pages/StatsPage'), 'StatsPage')
const TasksPage = page(() => import('./pages/TasksPage'), 'TasksPage')
const TimerPage = page(() => import('./pages/TimerPage'), 'TimerPage')

export default function App() {
  return (
    <TimerProvider>
      {/* On GitHub Pages the app lives under /<repo>/. */}
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
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
            <Route path="asistan" element={<AssistantPage />} />
            <Route path="basarimlar" element={<AchievementsPage />} />
            <Route path="profil" element={<ProfilePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TimerProvider>
  )
}
