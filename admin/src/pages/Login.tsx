import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, message, Card } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const Login: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values: { username: string; password: string; remember?: boolean }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success('登录成功');
      navigate('/');
    } catch (error: any) {
      // 错误已在axios拦截器中处理
      if (error.response?.status === 429) {
        // 账户锁定
        form.setFields([
          {
            name: 'password',
            errors: [error.response.data.error],
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card" title="债权公告发布助手 - 管理端">
        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          initialValues={{ username: 'Admin', remember: true }}
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="请输入用户名"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入访问密码' },
              { min: 8, message: '密码至少8位' },
              {
                pattern: /(?=.*\d)(?=.*[a-zA-Z])/,
                message: '密码必须包含数字和字母',
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入访问密码"
              size="large"
            />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>记住我 (7天有效)</Checkbox>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              登录
            </Button>
          </Form.Item>

          <div className="login-tips">
            提示：用户名默认为 Admin，密码至少8位，必须包含数字和字母
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
