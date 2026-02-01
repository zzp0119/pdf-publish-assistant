import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPDFByUniqueId } from '../services/api';
import type { PDFData } from '../types';
import PDFViewer from '../components/PDFViewer';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import './ViewPDF.css';

const ViewPDF: React.FC = () => {
  const { uniqueId } = useParams<{ uniqueId: string }>();
  const [pdfData, setPdfData] = useState<PDFData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPDFData = async () => {
      if (!uniqueId) {
        setError('无效的访问链接');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getPDFByUniqueId(uniqueId);
        setPdfData(data);

        // 设置页面标题为文件名
        document.title = `${data.originalName} - PDF查看器`;
      } catch (err) {
        console.error('获取PDF信息失败:', err);
        setError(err instanceof Error ? err.message : 'PDF不存在或已被删除');
      } finally {
        setLoading(false);
      }
    };

    fetchPDFData();
  }, [uniqueId]);

  if (loading) {
    return <LoadingState message="正在加载PDF..." />;
  }

  if (error || !pdfData) {
    return <ErrorState message={error || 'PDF不存在或已被删除'} />;
  }

  return (
    <div className="view-pdf-container">
      <PDFViewer pdfData={pdfData} />
    </div>
  );
};

export default ViewPDF;
