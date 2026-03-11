import { useState } from 'react';

function IssueCard({ issue }) {
  const [expanded, setExpanded] = useState(false);

  const getSeverityClass = (priority) => {
    return `severity-${priority}`;
  };

  const getTrendText = (trend) => {
    switch (trend) {
      case 'increasing':
        return 'Rising';
      case 'decreasing':
        return 'Declining';
      case 'stable':
        return 'Stable';
      default:
        return 'Stable';
    }
  };

  const growthPercent = issue.growth_rate * 100;
  const displayExamples = issue.examples.slice(0, 1);
  const allExamples = issue.examples;

  return (
    <>
      <div className="table-row" onClick={() => setExpanded(!expanded)}>
        <div className="issue-title">{issue.issue}</div>
        <div className="issue-stat">{issue.mentions}</div>
        <div className="issue-stat">
          <span className="growth-value">+{growthPercent}%</span>
        </div>
        <div className="issue-stat">
          <span className="trend-text">{getTrendText(issue.trend)}</span>
        </div>
        <div className="issue-stat">
          <span className={`severity-badge ${getSeverityClass(issue.priority)}`}>
            {issue.priority}
          </span>
        </div>
        <div className="examples-preview">
          <span className="example-text">
            {displayExamples[0]}
          </span>
          {issue.examples.length > 1 && (
            <button className="expand-btn">+{issue.examples.length - 1}</button>
          )}
        </div>
      </div>
      {expanded && (
        <div className="examples-expanded">
          <div className="examples-content">
            <h4>All Examples</h4>
            <ul className="all-examples-list">
              {allExamples.map((example, index) => (
                <li key={index}>{example}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

export default IssueCard;
