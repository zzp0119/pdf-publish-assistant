import React, { useState, useEffect } from 'react';
import { Layout, Button, Table, Space, message, Modal, Empty, Spin, Tag } from 'antd';
import { LogoutOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { pdfAPI } from '../services/api';
import SimpleUploadArea from '../components/SimpleUploadArea';
import './Dashboard.css';

const { Header, Content } = Layout;

interface PDFItem {
  id: string;
  uniqueId: string;
  originalName: string;
  size: number;
  ossUrl: string;
  uploadedAt: string;
}

const Dashboard: React.FC = () => {
  const [envDebug] = useState({
    VITE_DOMAIN: import.meta.env.VITE_DOMAIN,
    VITE_API_URL: import.meta.env.VITE_API_URL,
  });
  const { logout } = useAuth();
  const [pdfs, setPdfs] = useState<PDFItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [qrCodeModal, setQRCodeModal] = useState<{
    visible: boolean;
    url: string;
    fileName: string;
    qrcodeBase64: string;
  }>({ visible: false, url: '', fileName: '', qrcodeBase64: '' });

  const [uploadSuccessModal, setUploadSuccessModal] = useState<{
    visible: boolean;
    fileName: string;
    fileSize: number;
    accessUrl: string;
    uniqueId: string;
    qrcodeBase64: string;
    uploadedAt: string;
  }>({
    visible: false,
    fileName: '',
    fileSize: 0,
    accessUrl: '',
    uniqueId: '',
    qrcodeBase64: '',
    uploadedAt: '',
  });

  // 加载PDF列表
  const loadPdfs = async () => {
    setLoading(true);
    try {
      const response: any = await pdfAPI.getList();
      if (response.success) {
        setPdfs(response.data);
      }
    } catch (error) {
      message.error('加载PDF列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPdfs();
  }, []);

  // 上传成功处理
  const handleUploadSuccess = (fileInfo: {
    fileName: string;
    fileSize: number;
    ossUrl: string;
    uniqueId: string;
    accessUrl?: string;
    qrcodeBase64?: string;
    uploadedAt?: string;
  }) => {
    // 刷新PDF列表
    loadPdfs();

    // 显示上传成功弹窗
    const domain = import.meta.env.VITE_DOMAIN || 'http://localhost:3001';
    const accessUrl = fileInfo.accessUrl || `${domain}/view/${fileInfo.uniqueId}`;

    setUploadSuccessModal({
      visible: true,
      fileName: fileInfo.fileName,
      fileSize: fileInfo.fileSize,
      accessUrl: accessUrl,
      uniqueId: fileInfo.uniqueId,
      qrcodeBase64: fileInfo.qrcodeBase64 || '',
      uploadedAt: fileInfo.uploadedAt || new Date().toISOString(),
    });
  };

  // 删除PDF
  const handleDelete = (uniqueId: string, fileName: string) => {
    Modal.confirm({
      title: '确认删除',
      content: (
        <div>
          <p>确定要删除这个PDF吗？</p>
          <p>文件：{fileName}</p>
        </div>
      ),
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await pdfAPI.delete(uniqueId);
          message.success('删除成功');
          loadPdfs();
        } catch (error) {
          message.error('删除失败，请重试');
        }
      },
    });
  };

  // 查看二维码
  const handleViewQRCode = async (uniqueId: string, fileName: string) => {
    try {
      const response: any = await pdfAPI.getQRCode(uniqueId);
      if (response.success) {
        const domain = import.meta.env.VITE_DOMAIN || 'http://localhost:3001';
        const url = `${domain}/view/${uniqueId}`;
        setQRCodeModal({
          visible: true,
          url,
          fileName: response.data.fileName || fileName,
          qrcodeBase64: response.data.qrcodeBase64,
        });
      }
    } catch (error) {
      message.error('获取二维码失败');
    }
  };

  // 复制链接
  const handleCopyLink = (uniqueId: string) => {
    const domain = import.meta.env.VITE_DOMAIN || 'http://localhost:3001';
    const url = `${domain}/view/${uniqueId}`;
    navigator.clipboard.writeText(url).then(() => {
      message.success('链接已复制到剪贴板');
    }).catch(() => {
      message.error('复制失败，请手动复制');
    });
  };

  // 下载二维码（用于二维码弹窗，从base64生成）
  const handleDownloadQRCode = () => {
    if (qrCodeModal.qrcodeBase64) {
      // 将base64转换为PNG下载
      const link = document.createElement('a');
      link.href = qrCodeModal.qrcodeBase64;
      link.download = `${qrCodeModal.fileName}-qrcode.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('二维码下载成功');
    } else {
      message.error('二维码数据未加载，请关闭弹窗后重试');
    }
  };

  // 下载二维码（用于上传成功弹窗，从base64生成）
  const handleDownloadSuccessQRCode = () => {
    if (uploadSuccessModal.qrcodeBase64) {
      // 将base64转换为PNG下载
      const link = document.createElement('a');
      link.href = uploadSuccessModal.qrcodeBase64;
      link.download = `${uploadSuccessModal.fileName}-qrcode.png`;
      link.click();
      message.success('二维码下载成功');
    }
  };

  const columns = [
    {
      title: '文件名',
      dataIndex: 'originalName',
      key: 'originalName',
      width: '20%',
      ellipsis: true,
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: '8%',
      render: (size: number) => `${(size / 1024 / 1024).toFixed(2)} MB`,
    },
    {
      title: '上传时间',
      dataIndex: 'uploadedAt',
      key: 'uploadedAt',
      width: '15%',
      render: (date: string) => {
        if (!date) return '-';
        const d = new Date(date);
        // 检查日期是否有效
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      },
    },
    {
      title: '访问链接',
      key: 'accessUrl',
      width: '35%',
      render: (_: any, record: PDFItem) => {
        const domain = import.meta.env.VITE_DOMAIN || 'http://localhost:3001';
        const accessUrl = `${domain}/view/${record.uniqueId}`;
        return (
          <a
            href={accessUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}
            title={accessUrl}
          >
            {accessUrl}
          </a>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: '22%',
      render: (_: any, record: PDFItem) => (
        <Space size="small" wrap>
          <Button
            size="small"
            onClick={() => handleViewQRCode(record.uniqueId, record.originalName)}
          >
            二维码
          </Button>
          <Button
            size="small"
            onClick={() => handleCopyLink(record.uniqueId)}
          >
            复制链接
          </Button>
          <Button
            size="small"
            danger
            onClick={() => handleDelete(record.uniqueId, record.originalName)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Layout className="dashboard-layout">
      <Header className="dashboard-header">
        <div className="header-title">债权公告发布助手 - 管理端</div>
        <Space style={{ marginRight: '20px' }}>
          {envDebug.VITE_DOMAIN && envDebug.VITE_DOMAIN.includes('192.168') ? (
            <Tag color="success">✓ IP: {envDebug.VITE_DOMAIN}</Tag>
          ) : (
            <Tag color="warning">⚠️ {envDebug.VITE_DOMAIN || 'localhost:3001'}</Tag>
          )}
        </Space>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadPdfs}
            loading={loading}
          >
            刷新
          </Button>
          <Button
            icon={<LogoutOutlined />}
            onClick={logout}
          >
            退出登录
          </Button>
        </Space>
      </Header>
      <Content className="dashboard-content">
        {/* 上传区域 */}
        <div className="upload-section">
          <h2>上传PDF文件</h2>
          <SimpleUploadArea onUploadSuccess={handleUploadSuccess} />
        </div>

        {/* PDF列表 */}
        <div className="pdf-list-container">
          <h2>PDF列表</h2>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
              <Spin size="large" />
            </div>
          ) : pdfs.length === 0 ? (
            <Empty
              description="暂无PDF文件，快来上传第一个吧"
              style={{ marginTop: '100px' }}
            />
          ) : (
            <Table
              columns={columns}
              dataSource={pdfs}
              rowKey="id"
              pagination={false}
            />
          )}
        </div>
      </Content>

      {/* 上传成功弹窗 */}
      <Modal
        title="上传成功"
        open={uploadSuccessModal.visible}
        onCancel={() => setUploadSuccessModal({ ...uploadSuccessModal, visible: false })}
        footer={[
          <Button key="close" onClick={() => setUploadSuccessModal({ ...uploadSuccessModal, visible: false })}>
            关闭
          </Button>,
        ]}
        width={500}
      >
        <div style={{ padding: '10px 0' }}>
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
              📄 {uploadSuccessModal.fileName}
            </p>
            <p style={{ color: '#666', marginBottom: '5px' }}>
              文件大小：{(uploadSuccessModal.fileSize / 1024 / 1024).toFixed(2)} MB
            </p>
            <p style={{ color: '#666' }}>
              上传时间：{new Date(uploadSuccessModal.uploadedAt).toLocaleString('zh-CN')}
            </p>
          </div>

          <div>
            <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>二维码：</p>
            <div style={{ textAlign: 'center', padding: '20px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '10px' }}>
              {uploadSuccessModal.qrcodeBase64 && (
                <img
                  src={uploadSuccessModal.qrcodeBase64}
                  alt="二维码"
                  style={{ width: '256px', height: '256px' }}
                />
              )}
            </div>
            <Button type="primary" onClick={handleDownloadSuccessQRCode}>
              下载二维码
            </Button>
          </div>
        </div>
      </Modal>

      {/* 二维码弹窗 */}
      <Modal
        title="二维码"
        open={qrCodeModal.visible}
        onCancel={() => setQRCodeModal({ visible: false, url: '', fileName: '', qrcodeBase64: '' })}
        footer={[
          <Button key="download" type="primary" onClick={handleDownloadQRCode}>
            下载二维码
          </Button>,
          <Button key="close" onClick={() => setQRCodeModal({ visible: false, url: '', fileName: '', qrcodeBase64: '' })}>
            关闭
          </Button>,
        ]}
      >
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ background: 'white', padding: '20px', display: 'inline-block', borderRadius: '8px' }}>
            {qrCodeModal.qrcodeBase64 ? (
              <img
                src={qrCodeModal.qrcodeBase64}
                alt="二维码"
                style={{ width: '256px', height: '256px' }}
              />
            ) : (
              <div style={{ width: '256px', height: '256px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                加载中...
              </div>
            )}
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default Dashboard;
