import React, { useState } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/Button';
import { SimpleCard, StatsCard } from '@/components/ui/Cards';

// Performance metrics type
interface PerformanceMetric {
  name: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: string;
}

// Mock data for demonstration
const mockMetrics: PerformanceMetric[] = [
  {
    name: 'Core Web Vitals Score',
    value: '95/100',
    change: '+5 points',
    changeType: 'positive',
    icon: '⚡'
  },
  {
    name: 'Page Load Time',
    value: '1.2s',
    change: '-0.3s',
    changeType: 'positive',
    icon: '🚀'
  },
  {
    name: 'Bundle Size',
    value: '165 KB',
    change: '-79%',
    changeType: 'positive',
    icon: '📦'
  },
  {
    name: 'Cache Hit Rate',
    value: '87%',
    change: '+12%',
    changeType: 'positive',
    icon: '💾'
  }
];

export const PerformanceMonitoringPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const tabs = [
    { id: 'overview', label: 'Visão Geral' },
    { id: 'vitals', label: 'Core Web Vitals' },
    { id: 'bundle', label: 'Bundle Analysis' },
    { id: 'optimization', label: 'Otimizações' }
  ];

  return (
    <AdminLayout
      title="Performance Monitoring"
      breadcrumbs={[
        { name: 'Dashboard', href: '/admin' },
        { name: 'Performance', href: '/admin/performance' }
      ]}
    >
      <div className="space-y-6">
        {/* Description */}
        <div className="mb-6">
          <p className="text-muted-foreground">
            Monitore métricas de performance, Core Web Vitals e análise de bundle em tempo real
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex space-x-1 bg-muted p-1 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline">
              {isRefreshing ? '🔄' : '↻'} Atualizar
            </Button>
            <Button variant="primary">📊 Relatório Completo</Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mockMetrics.map((metric) => (
            <StatsCard
              key={metric.name}
              title={metric.name}
              value={metric.value}
              description={metric.change}
            />
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SimpleCard title="Performance Timeline">
              <div className="h-64 bg-muted/50 rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">📈 Gráfico de Performance (Tempo Real)</p>
              </div>
            </SimpleCard>

            <SimpleCard title="Principais Problemas">
              <div className="space-y-3">
                {[
                  { issue: 'Large image file on homepage', severity: 'high', impact: '0.5s delay' },
                  { issue: 'Unused CSS in bundle', severity: 'medium', impact: '15KB size' },
                  { issue: 'Third-party script blocking', severity: 'low', impact: '0.1s delay' }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{item.issue}</p>
                      <p className="text-xs text-muted-foreground">{item.impact}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.severity === 'high' ? 'bg-destructive/10 text-destructive' :
                      item.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-primary/10 text-primary'
                    }`}>
                      {item.severity}
                    </span>
                  </div>
                ))}
              </div>
            </SimpleCard>
          </div>
        )}

        {/* Vitals */}
        {activeTab === 'vitals' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              { name: 'Largest Contentful Paint (LCP)', value: '1.2s', target: '< 2.5s' },
              { name: 'First Input Delay (FID)', value: '45ms', target: '< 100ms' },
              { name: 'Cumulative Layout Shift (CLS)', value: '0.05', target: '< 0.1' }
            ].map((vital, index) => (
              <SimpleCard key={index} title={vital.name}>
                <div className="text-3xl font-bold text-success mb-1">{vital.value}</div>
                <p className="text-sm text-muted-foreground mb-4">Target: {vital.target}</p>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-success/100 h-2 rounded-full w-4/5"></div>
                </div>
              </SimpleCard>
            ))}
          </div>
        )}

        {/* Bundle */}
        {activeTab === 'bundle' && (
          <SimpleCard title="Bundle Analysis">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Total Bundle Size</h4>
                <div className="text-2xl font-bold text-foreground">165 KB</div>
                <div className="text-sm text-success">79% reduction</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Lazy Loaded Chunks</h4>
                <div className="text-2xl font-bold text-foreground">15+</div>
                <div className="text-sm text-primary">On-demand loading</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Compression</h4>
                <div className="text-2xl font-bold text-foreground">Gzip</div>
                <div className="text-sm text-purple-600">Active optimization</div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-3">Bundle Composition</h4>
              <div className="space-y-2">
                {[
                  { name: 'React & Core Libraries', size: '45 KB', width: 'w-1/4' },
                  { name: 'UI Components', size: '38 KB', width: 'w-1/5' },
                  { name: 'Utilities & Helpers', size: '32 KB', width: 'w-1/6' },
                  { name: 'API & Services', size: '28 KB', width: 'w-1/6' },
                  { name: 'Other Dependencies', size: '22 KB', width: 'w-2/12' }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div className={`bg-primary h-2 rounded-full ${item.width}`}></div>
                      </div>
                      <span className="text-sm text-muted-foreground w-12">{item.size}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SimpleCard>
        )}

        {/* Optimization */}
        {activeTab === 'optimization' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SimpleCard title="Otimizações Ativas">
              <div className="space-y-4">
                {[
                  { category: 'Database Layer', items: ['20+ composite indexes', 'Query optimization', 'N+1 elimination'], icon: '🗄️' },
                  { category: 'API Layer', items: ['NodeCache response caching', 'Gzip compression', 'Automatic invalidation'], icon: '⚡' },
                  { category: 'Frontend Layer', items: ['React.lazy() code splitting', 'Bundle optimization', 'Route prefetching'], icon: '🎯' },
                  { category: 'Monitoring', items: ['Core Web Vitals tracking', 'Bundle analytics', 'Performance dashboard'], icon: '📊' }
                ].map((category, index) => (
                  <div key={index} className="border-l-4 border-primary pl-4">
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <span>{category.icon}</span>
                      {category.category}
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {category.items.map((item, itemIndex) => (
                        <li key={itemIndex}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </SimpleCard>

            <SimpleCard title="Recomendações">
              <div className="space-y-4">
                {[
                  { title: 'Cache Hit Rate', description: 'Mantenha uma taxa de acerto de cache acima de 70%', priority: 'high' },
                  { title: 'Bundle Size', description: 'Monitore chunks individuais abaixo de 200KB', priority: 'medium' },
                  { title: 'Core Web Vitals', description: 'LCP < 2.5s, FID < 100ms, CLS < 0.1', priority: 'high' },
                  { title: 'Database Queries', description: 'Use EXPLAIN ANALYZE para identificar queries lentas', priority: 'low' }
                ].map((rec, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      rec.priority === 'high' ? 'bg-destructive/100' :
                      rec.priority === 'medium' ? 'bg-yellow-500' : 'bg-success/100'
                    }`}></div>
                    <div>
                      <h4 className="font-semibold text-sm">{rec.title}</h4>
                      <p className="text-xs text-muted-foreground">{rec.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SimpleCard>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PerformanceMonitoringPage;
