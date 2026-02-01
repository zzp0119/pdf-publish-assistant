import React from 'react';
import './ErrorState.css';

interface ErrorStateProps {
  message: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({ message }) => {
  return (
    <div className="error-state">
      <div className="error-icon">⚠️</div>
      <h2 className="error-title">PDF不存在或已被删除</h2>
      <p className="error-message">{message}</p>
      <p className="error-hint">请检查链接是否正确，或联系管理员</p>
    </div>
  );
};

export default ErrorState;
