import React, { useState } from 'react';
import { Upload, message } from 'antd';
import { InboxOutlined, LoadingOutlined } from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';
import api from '../services/api';
import './UploadArea.css';

const { Dragger } = Upload;

interface UploadAreaProps {
  onUploadSuccess: (fileInfo: {
    fileName: string;
    fileSize: number;
    ossUrl: string;
    uniqueId: string;
    accessUrl?: string;
    qrcodeBase64?: string;
    uploadedAt?: string;
  }) => void;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onUploadSuccess }) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUploadChange: UploadProps['onChange'] = (info) => {
    setFileList(info.fileList);

    const { status } = info.file;

    if (status === 'uploading') {
      setUploading(true);
    }

    if (status === 'done') {
      setUploading(false);

      const response = info.file.response;
      if (response && response.success) {
        message.success(`${info.file.name} 上传成功`);

        // 触发上传成功回调
        onUploadSuccess(response.data);
      } else {
        message.error(`${info.file.name} 上传失败`);
      }

      // 清空文件列表
      setTimeout(() => {
        setFileList([]);
        setUploadProgress(0);
      }, 1000);
    }

    if (status === 'error') {
      setUploading(false);
      message.error(`${info.file.name} 上传失败`);
      setFileList([]);
      setUploadProgress(0);
    }
  };

  const beforeUpload = (file: File) => {
    // 文件类型校验
    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPDF) {
      message.error('仅支持PDF格式文件');
      return false;
    }

    // 文件大小校验（50MB）
    const isLt50M = file.size <= 50 * 1024 * 1024;
    if (!isLt50M) {
      message.error('文件大小不能超过50MB');
      return false;
    }

    // 清空之前的文件（只允许单文件上传）
    setFileList([]);
    setUploadProgress(0);

    return true;
  };

  // 自定义上传请求
  const customRequest: UploadProps['customRequest'] = async (options) => {
    const { file, onProgress, onSuccess, onError } = options;

    try {
      // 创建 FormData
      const formData = new FormData();
      formData.append('file', file as File);

      // 使用项目中已配置好的 api 实例上传
      const response = await api.post('/api/upload/upload-pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
            onProgress?.({ percent: percentCompleted });
          }
        },
      });

      onSuccess?.(response);
    } catch (error: any) {
      console.error('上传失败:', error);
      onError?.(error);
    }
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    fileList,
    accept: '.pdf,application/pdf',
    beforeUpload,
    onChange: handleUploadChange,
    customRequest,
    disabled: uploading,
    maxCount: 1,
  };

  return (
    <div className="upload-area-container">
      <Dragger {...uploadProps} className="upload-dragger">
        <p className="ant-upload-drag-icon">
          {uploading ? (
            <LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          ) : (
            <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          )}
        </p>
        <p className="ant-upload-text">
          {uploading ? '正在上传...' : '点击或拖拽PDF文件到此区域上传'}
        </p>
        <p className="ant-upload-hint">
          支持单个PDF文件上传，最大50MB
        </p>
        {uploading && uploadProgress > 0 && (
          <div className="upload-progress-bar">
            <div
              className="upload-progress-fill"
              style={{ width: `${uploadProgress}%` }}
            />
            <span className="upload-progress-text">{uploadProgress}%</span>
          </div>
        )}
      </Dragger>
    </div>
  );
};

export default UploadArea;
