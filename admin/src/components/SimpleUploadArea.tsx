import React, { useState, useRef } from 'react';
import { InboxOutlined, LoadingOutlined } from '@ant-design/icons';
import { message } from 'antd';
import api from '../services/api';
import './SimpleUploadArea.css';

interface SimpleUploadAreaProps {
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

const SimpleUploadArea: React.FC<SimpleUploadAreaProps> = ({ onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // 文件类型校验
    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPDF) {
      message.error('仅支持PDF格式文件');
      return;
    }

    // 文件大小校验（50MB）
    const isLt50M = file.size <= 50 * 1024 * 1024;
    if (!isLt50M) {
      message.error('文件大小不能超过50MB');
      return;
    }

    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/api/upload/upload-pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        },
      });

      if (response.success) {
        message.success(`${file.name} 上传成功`);
        onUploadSuccess(response.data);
      } else {
        message.error('上传失败');
      }
    } catch (error) {
      console.error('上传失败:', error);
      message.error('上传失败，请重试');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
      // 清空input值，允许重复上传同一文件
      e.target.value = '';
    }
  };

  return (
    <div className="simple-upload-container">
      <div
        className={`simple-upload-area ${isDragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={handleInputChange}
          disabled={uploading}
        />

        <div className="upload-icon">
          {uploading ? (
            <LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          ) : (
            <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          )}
        </div>

        <div className="upload-text">
          {uploading ? '正在上传...' : '点击或拖拽PDF文件到此区域上传'}
        </div>

        <div className="upload-hint">
          支持单个PDF文件上传，最大50MB
        </div>

        {uploading && uploadProgress > 0 && (
          <div className="upload-progress-bar">
            <div
              className="upload-progress-fill"
              style={{ width: `${uploadProgress}%` }}
            />
            <span className="upload-progress-text">{uploadProgress}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleUploadArea;
