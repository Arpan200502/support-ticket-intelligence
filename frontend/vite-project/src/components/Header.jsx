function Header({ onRefresh }) {
  return (
    <div className="header">
      <h1>Support Ticket Intelligence</h1>
      <button className="refresh-btn" onClick={onRefresh}>
        Refresh Insights
      </button>
    </div>
  );
}

export default Header;
