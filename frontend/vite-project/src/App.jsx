import { useState, useEffect } from 'react';
import Header from './components/Header';
import IssueList from './components/IssueList';
import './styles.css';

function App() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/insights');
      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }
      const data = await response.json();
      const sortedData = data.sort((a, b) => b.impact_score - a.impact_score);
      setIssues(sortedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await fetch('http://localhost:5000/rebuild-insights', {
        method: 'POST'
      });
      await fetchInsights();
    } catch (err) {
      setError('Failed to rebuild insights');
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  return (
    <div className="app">
      <Header onRefresh={handleRefresh} />
      <div className="main-content">
        {loading && <div className="loading">Loading insights...</div>}
        {error && <div className="error">Error: {error}</div>}
        {!loading && !error && <IssueList issues={issues} />}
      </div>
    </div>
  );
}

export default App;
