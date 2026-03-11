import IssueCard from './IssueCard';

function IssueList({ issues }) {
  if (!issues || issues.length === 0) {
    return <div className="no-data">No issues found</div>;
  }

  return (
    <div className="issue-table">
      <div className="table-header">
        <div>Issue</div>
        <div>Mentions</div>
        <div>Growth</div>
        <div>Trend</div>
        <div>Severity</div>
        <div>Examples</div>
      </div>
      {issues.map((issue, index) => (
        <IssueCard key={index} issue={issue} />
      ))}
    </div>
  );
}

export default IssueList;
