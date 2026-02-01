import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFData } from '../types';
import { getProxyPdfUrl } from '../services/api';
import { MobileDownloadModal } from './MobileDownloadModal';
import './PDFViewer.css';

// 设置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface PDFViewerProps {
  pdfData: PDFData;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ pdfData }) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [renderedPages, setRenderedPages] = useState<Map<number, string>>(new Map());
  const [isMobile, setIsMobile] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // 检测是否为移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 加载 PDF 文档
  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);

        // 使用代理 URL 解决 OSS CORS 和权限问题
        const proxyUrl = getProxyPdfUrl(pdfData.ossUrl);
        console.log('使用代理 URL 加载 PDF:', proxyUrl);

        const loadingTask = pdfjsLib.getDocument({
          url: proxyUrl,
          // 添加加载进度回调
          onProgress: (progress: { loaded: number; total: number }) => {
            if (progress.total > 0) {
              const percent = Math.round((progress.loaded / progress.total) * 100);
              setLoadingProgress(percent);
            }
          },
        });

        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setLoading(false);
      } catch (err) {
        console.error('PDF加载失败:', err);
        setError('PDF加载失败，请检查网络连接后重试');
        setLoading(false);
      }
    };

    loadPDF();
  }, [pdfData.ossUrl]);

  // 渲染所有页面
  useEffect(() => {
    if (!pdfDoc || totalPages === 0) return;

    const renderAllPages = async () => {
      const newRenderedPages = new Map<number, string>();

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        try {
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) continue;

          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          const dataUrl = canvas.toDataURL();
          newRenderedPages.set(pageNum, dataUrl);
        } catch (err) {
          console.error(`页面 ${pageNum} 渲染失败:`, err);
        }
      }

      setRenderedPages(newRenderedPages);
    };

    renderAllPages();
  }, [pdfDoc, totalPages, scale]);

  // 缩放控制
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleFitToPage = () => {
    setScale(1.5);
  };

  // 翻页控制
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      scrollToPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
      scrollToPage(currentPage + 1);
    }
  };

  const scrollToPage = (pageNum: number) => {
    const canvas = canvasRefs.current.get(pageNum);
    if (canvas) {
      canvas.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // 下载 PDF
  const handleDownload = () => {
    // 移动端显示下载模态框，提供多种下载选项
    if (isMobile) {
      setShowDownloadModal(true);
    } else {
      // 桌面端直接下载
      directDownload();
    }
  };

  // 直接下载（桌面端使用）
  const directDownload = async () => {
    try {
      const response = await fetch(pdfData.ossUrl);
      if (!response.ok) throw new Error('下载失败');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pdfData.originalName;

      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error('下载失败:', err);
      alert('下载失败，请检查网络连接后重试');
    }
  };

  if (loading) {
    return (
      <div className="pdf-viewer-loading">
        <div className="loading-spinner"></div>
        <p>正在加载PDF...</p>
        {loadingProgress > 0 && (
          <div className="loading-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            <p className="progress-text">{loadingProgress}%</p>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="pdf-viewer-error">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>重新加载</button>
      </div>
    );
  }

  return (
    <div className="pdf-viewer" ref={containerRef}>
      {/* 桌面端顶部控制栏 */}
      {!isMobile && (
        <div className="pdf-header-desktop">
          <h1 className="pdf-title">{pdfData.originalName}</h1>
          <div className="pdf-controls-desktop">
            <button className="download-btn" onClick={handleDownload}>
              下载PDF
            </button>
            <div className="zoom-controls">
              <button onClick={handleZoomOut} disabled={scale <= 0.5}>
                -
              </button>
              <span className="zoom-level">{Math.round(scale * 100)}%</span>
              <button onClick={handleZoomIn} disabled={scale >= 3}>
                +
              </button>
              <button onClick={handleFitToPage}>适应页面</button>
            </div>
          </div>
        </div>
      )}

      {/* 移动端顶部控制栏 */}
      {isMobile && (
        <div className="pdf-header-mobile">
          <h1 className="pdf-title">{pdfData.originalName}</h1>
          <button className="download-btn-mobile" onClick={handleDownload}>
            下载PDF
          </button>
        </div>
      )}

      {/* PDF 内容区域 */}
      <div className="pdf-content">
        {renderedPages.size === 0 ? (
          <div className="rendering-loading">
            <div className="loading-spinner"></div>
            <p>正在渲染PDF页面...</p>
          </div>
        ) : (
          Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
            <div
              key={pageNum}
              className="pdf-page"
              ref={el => {
                if (el) {
                  const canvas = el.querySelector('canvas');
                  if (canvas) {
                    canvasRefs.current.set(pageNum, canvas);
                  }
                }
              }}
            >
              <img
                src={renderedPages.get(pageNum)}
                alt={`第 ${pageNum} 页`}
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
          ))
        )}
      </div>

      {/* 桌面端翻页按钮 */}
      {!isMobile && totalPages > 1 && (
        <div className="pagination-desktop">
          <button
            className="page-btn"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
          >
            ← 上一页
          </button>
          <button
            className="page-btn"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            下一页 →
          </button>
        </div>
      )}

      {/* 移动端不需要翻页按钮，可以通过滚动查看所有页面 */}

      {/* 移动端下载模态框 */}
      {isMobile && (
        <MobileDownloadModal
          isOpen={showDownloadModal}
          onClose={() => setShowDownloadModal(false)}
          pdfUrl={pdfData.ossUrl}
          fileName={pdfData.originalName}
        />
      )}
    </div>
  );
};

export default PDFViewer;
