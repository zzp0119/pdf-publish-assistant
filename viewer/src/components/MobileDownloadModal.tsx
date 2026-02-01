import React, { useState } from 'react';
import './MobileDownloadModal.css';

interface MobileDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  fileName: string;
}

export const MobileDownloadModal: React.FC<MobileDownloadModalProps> = ({
  isOpen,
  onClose,
  pdfUrl,
  fileName,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // 方案1: 使用 Web Share API (如果支持)
  const handleWebShare = async () => {
    try {
      setIsLoading(true);

      // 检测是否支持 Web Share API
      if (!navigator.share) {
        alert('您的浏览器不支持分享功能，请使用其他下载方式');
        setIsLoading(false);
        return;
      }

      // 获取文件并创建分享
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: 'application/pdf' });

      await navigator.share({
        files: [file],
        title: fileName,
        text: `下载PDF文件: ${fileName}`,
      });

      setIsLoading(false);
      onClose();
    } catch (err: any) {
      console.error('分享失败:', err);
      setIsLoading(false);

      // 用户取消分享不算错误
      if (err.name !== 'AbortError') {
        alert('分享失败，请尝试其他下载方式');
      }
    }
  };

  // 方案2: 在新标签页打开PDF (让用户手动保存)
  const handleOpenInNewTab = () => {
    window.open(pdfUrl, '_blank');
    setShowInstructions(true);
  };

  // 方案3: 尝试直接下载 (blob方式)
  const handleDirectDownload = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error('下载失败');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.target = '_blank'; // 添加target="_blank"

      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      // 显示操作指引
      setTimeout(() => {
        setIsLoading(false);
        setShowInstructions(true);
      }, 500);
    } catch (err) {
      console.error('下载失败:', err);
      setIsLoading(false);
      alert('下载失败，请尝试"在新窗口打开"方式');
    }
  };

  // 方案4: 复制链接（让用户在其他应用中打开）
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(pdfUrl);
      alert('链接已复制到剪贴板！\n\n您可以粘贴到其他应用中下载');
      onClose();
    } catch (err) {
      console.error('复制失败:', err);
      alert('复制失败，请手动复制链接');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <h2 className="modal-title">下载PDF文件</h2>
        <p className="modal-filename">{fileName}</p>

        {!showInstructions ? (
          <div className="download-options">
            {/* 推荐方案：Web Share API */}
            {navigator.share && (
              <button
                className="download-option primary"
                onClick={handleWebShare}
                disabled={isLoading}
              >
                <span className="option-icon">📤</span>
                <span className="option-text">
                  <strong>分享到文件</strong>
                  <small>推荐 - 可保存到"文件"App</small>
                </span>
              </button>
            )}

            {/* 方案2：在新窗口打开 */}
            <button
              className="download-option"
              onClick={handleOpenInNewTab}
              disabled={isLoading}
            >
              <span className="option-icon">🔗</span>
              <span className="option-text">
                <strong>在新窗口打开</strong>
                <small>打开后点击分享按钮保存</small>
              </span>
            </button>

            {/* 方案3：直接下载 */}
            <button
              className="download-option"
              onClick={handleDirectDownload}
              disabled={isLoading}
            >
              <span className="option-icon">⬇️</span>
              <span className="option-text">
                <strong>尝试直接下载</strong>
                <small>可能在新窗口打开PDF</small>
              </span>
            </button>

            {/* 方案4：复制链接 */}
            <button
              className="download-option"
              onClick={handleCopyLink}
              disabled={isLoading}
            >
              <span className="option-icon">📋</span>
              <span className="option-text">
                <strong>复制下载链接</strong>
                <small>粘贴到其他应用中下载</small>
              </span>
            </button>
          </div>
        ) : (
          <div className="download-instructions">
            <h3>📱 iOS Safari 保存PDF指南</h3>

            <div className="instruction-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <p>PDF已在新窗口打开</p>
              </div>
            </div>

            <div className="instruction-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <p>点击底部的 <strong>分享按钮</strong> <span className="share-icon">⎋</span></p>
              </div>
            </div>

            <div className="instruction-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <p>向下滚动，找到并点击 <strong>"存储到"文件"</strong></p>
              </div>
            </div>

            <div className="instruction-step">
              <div className="step-number">4</div>
              <div className="step-content">
                <p>选择保存位置，点击 <strong>"存储"</strong></p>
              </div>
            </div>

            <button
              className="reset-button"
              onClick={() => setShowInstructions(false)}
            >
              返回下载选项
            </button>
          </div>
        )}

        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>正在处理...</p>
          </div>
        )}
      </div>
    </div>
  );
};
