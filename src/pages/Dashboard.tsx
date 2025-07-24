import React from 'react'
import { Layout, Typography, Card, Row, Col, Statistic } from 'antd'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const { Header, Content } = Layout
const { Title } = Typography

const mockData = [
  { name: 'Mon', requests: 400 },
  { name: 'Tue', requests: 300 },
  { name: 'Wed', requests: 500 },
  { name: 'Thu', requests: 280 },
  { name: 'Fri', requests: 590 },
  { name: 'Sat', requests: 320 },
  { name: 'Sun', requests: 450 },
]

const Dashboard: React.FC = () => {
  return (
    <Layout>
      <Header style={{ background: '#fff', padding: '0 24px' }}>
        <Title level={3} style={{ margin: '16px 0' }}>
          NERA AI Analytics Dashboard
        </Title>
      </Header>
      <Content style={{ padding: '24px' }}>
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic title="Total Requests" value={11280} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Active Users" value={932} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Success Rate" value={98.5} suffix="%" />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Avg Response Time" value={125} suffix="ms" />
            </Card>
          </Col>
        </Row>
        
        <Card title="Request Trends" style={{ marginBottom: '24px' }}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="requests" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </Content>
    </Layout>
  )
}

export default Dashboard
