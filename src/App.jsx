import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import DataEntry from './components/DataEntry';
import DataAnalysis from './components/DataAnalysis';
import EfficiencyAnalysis from './components/EfficiencyAnalysis';
import ManagerDashboard from './components/ManagerDashboard';
import WageSalary from './components/WageSalary';
import DataDashboard from './components/DataDashboard';
import Settings from './components/Settings';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import useStore from './store/useStore';
import ErrorBoundary from './components/ErrorBoundary';
import PageTransition from './components/Layout/PageTransition';
import ScanPage from './components/Scan/ScanPage';
import EntryPage from './components/Scan/EntryPage';
import HistoryPage from './components/Scan/HistoryPage';
import ModifyPage from './components/Scan/ModifyPage';
import MobileRedirect from './components/MobileRedirect';

function App() {
  const { loadAllRecords, error, clearError, isAuthenticated, initializeAuth } = useStore();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize authentication first
        initializeAuth();
        
        // Load all records only if authenticated
        if (isAuthenticated) {
          await loadAllRecords();
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, [loadAllRecords, initializeAuth, isAuthenticated]);

    // If not authenticated, show login page
  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <Login />
      </ErrorBoundary>
    );
  }

  // If authenticated, show main application
  return (
    <ErrorBoundary>
      <Router>
        <MobileRedirect />
        <Routes>
          {/* Mobile Scan Routes - No Sidebar/Header */}
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/scan/entry" element={<EntryPage />} />
          <Route path="/scan/history" element={<HistoryPage />} />
          <Route path="/scan/modify" element={<ModifyPage />} />
          
          {/* Desktop Routes - With Sidebar/Header */}
          <Route path="/*" element={
        <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex overflow-hidden">
          {/* Sidebar */}
          <Sidebar />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Header */}
            <Header />
            
            {/* Error notification */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-6 mt-4 rounded-r-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                  <div className="ml-auto pl-3">
                    <div className="-mx-1.5 -my-1.5">
                      <button
                        onClick={clearError}
                        className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                      >
                        <span className="sr-only">关闭</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Content with Page Transitions */}
            <main className="flex-1 overflow-y-auto bg-gray-50">
              <div className="p-6">
                <PageTransition>
                  <Routes>
                    <Route path="/" element={<Navigate to="/entry" replace />} />
                    <Route path="/entry" element={<DataEntry />} />
                    <Route path="/analysis" element={<DataAnalysis />} />
                    <Route path="/efficiency" element={<EfficiencyAnalysis />} />
                    <Route path="/wage-salary" element={<WageSalary />} />
                    <Route path="/dashboard" element={<DataDashboard />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route 
                      path="/manager" 
                      element={
                        <ProtectedRoute requiredRole="ceo">
                          <ManagerDashboard />
                        </ProtectedRoute>
                      } 
                    />
                  </Routes>
                </PageTransition>
              </div>
            </main>
          </div>
        </div>
          } />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App; 