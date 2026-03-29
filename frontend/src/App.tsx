import { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { MatrixBoard } from './components/MatrixBoard'
import { FocusMode } from './components/FocusMode'
import { Analytics } from './components/Analytics'
import { AdminDashboard } from './components/AdminDashboard'
import { SettingsPage } from './components/SettingsPage'
import { VoiceInterface } from './components/VoiceInterface'
import { SuperAdminSettings } from './components/SuperAdminSettings'
import PaymentSettingsPage from './components/PaymentSettingsPage'
import { LoginPage } from './components/LoginPage'
import { SubscriptionManagement } from './components/SubscriptionManagement'
import { AddTaskModal } from './components/AddTaskModal'
import { authApi, tasksApi } from './services/authService'
import './index.css'

type QuadrantType = 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface Task {
  id: string;
  content: string;
  quadrant: QuadrantType;
  duration?: number;
  energyLevel?: number;
}

function App() {
  const [activeView, setActiveView] = useState('matrix')
  const [showVoice, setShowVoice] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [tasks, setTasks] = useState<Record<QuadrantType, Task[]>>({
    Q1: [],
    Q2: [],
    Q3: [],
    Q4: [],
  })

  useEffect(() => {
    const token = localStorage.getItem('skai_token');
    const storedUser = localStorage.getItem('skai_user');
    if (token && storedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(storedUser));
      fetchTasks();
    }
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await tasksApi.getAll();
      const backendTasks = response.data || [];
      const grouped: Record<QuadrantType, Task[]> = { Q1: [], Q2: [], Q3: [], Q4: [] };
      backendTasks.forEach((task: any) => {
        const quadrant = (task.quadrant || 'Q2') as QuadrantType;
        if (grouped[quadrant]) {
          grouped[quadrant].push({
            id: task.id,
            content: task.title || task.content,
            quadrant,
            duration: task.estimatedDuration,
            energyLevel: task.energyLevel,
          });
        }
      });
      setTasks(grouped);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const handleAddTask = async (task: { content: string; quadrant: QuadrantType; duration?: number; energyLevel?: number }) => {
    try {
      await tasksApi.create({
        title: task.content,
        content: task.content,
        quadrant: task.quadrant,
        estimatedDuration: task.duration,
        energyLevel: task.energyLevel,
      });
      await fetchTasks();
      setShowAddTask(false);
    } catch (error) {
      console.error('Failed to add task:', error);
      alert('Failed to add task. Please try again.');
    }
  };

  const handleTaskMove = async (taskId: string, newQuadrant: QuadrantType) => {
    try {
      await tasksApi.update(taskId, { quadrant: newQuadrant });
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      // API returns response.data directly from axios
      const { accessToken, user } = response.data;
      if (!accessToken) {
        throw new Error('No access token received');
      }
      localStorage.setItem('skai_token', accessToken);
      localStorage.setItem('skai_user', JSON.stringify(user));
      setIsAuthenticated(true);
      setUser(user);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Login failed. Please check your credentials.');
      console.error(error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('skai_token');
    localStorage.removeItem('skai_user');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <div className="fixed bottom-4 text-center w-full text-slate-500 text-sm hidden">
          SSL Secure | Join 10,000+ users
          <div className="spinner">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        onVoiceClick={() => setShowVoice(true)}
        onLogout={handleLogout}
        user={user}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onAddTask={() => setShowAddTask(true)} />
        <main className="flex-1 overflow-hidden">
          {activeView === 'matrix' && <MatrixBoard tasks={tasks} setTasks={setTasks} onTaskMove={handleTaskMove} />}
          {activeView === 'focus' && <FocusMode />}
          {activeView === 'analytics' && <Analytics />}
          {activeView === 'admin' && (user?.role === 'ADMIN' || user?.role === 'SUPERADMIN' ? <AdminDashboard user={user} /> : <MatrixBoard tasks={tasks} setTasks={setTasks} onTaskMove={handleTaskMove} />)}
          {activeView === 'settings' && <SettingsPage />}
          {activeView === 'subscription' && <SubscriptionManagement />}
          {activeView === 'superadmin' && (user?.role === 'SUPERADMIN' ? <SuperAdminSettings /> : <MatrixBoard tasks={tasks} setTasks={setTasks} onTaskMove={handleTaskMove} />)}
          {activeView === 'payments' && (user?.role === 'ADMIN' || user?.role === 'SUPERADMIN' ? <PaymentSettingsPage userRole={user?.role} /> : <MatrixBoard tasks={tasks} setTasks={setTasks} onTaskMove={handleTaskMove} />)}
          {activeView === 'calendar' && (
            <div className="flex items-center justify-center h-full text-slate-500 text-lg">
              AI Planner &mdash; Calendar sync coming soon
            </div>
          )}
        </main>
      </div>

      {/* Voice overlay */}
      {showVoice && (
        <VoiceInterface
          onClose={() => setShowVoice(false)}
          onTaskCreated={(task) => {
            console.log('Voice task created:', task);
            fetchTasks();
            setShowVoice(false);
          }}
        />
      )}

      {/* Add Task Modal */}
      {showAddTask && (
        <AddTaskModal
          onClose={() => setShowAddTask(false)}
          onAdd={handleAddTask}
        />
      )}
    </div>
  )
}

export default App
