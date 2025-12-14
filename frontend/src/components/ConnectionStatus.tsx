import type { ConnectionStatus as StatusType } from "../hooks/useWebSocket";
import "./ConnectionStatus.css";

export interface ConnectionStatusProps {
  status: StatusType;
}

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  return (
    <div data-testid="connection-status" className="connection-status">
      <div
        className={`connection-status__indicator connection-status__indicator--${status}`}
      />
      <span className="connection-status__text">{status}</span>
    </div>
  );
}
