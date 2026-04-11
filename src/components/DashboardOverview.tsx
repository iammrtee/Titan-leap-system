import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Users, DollarSign, Target, ArrowUpRight, MoreHorizontal, Rocket, Zap, CheckCircle2, AlertCircle, Mail, Instagram, Linkedin, Clock } from 'lucide-react';
import { cn } from '@/src/lib/utils';

const MetricCard = ({ title, value, trend, trendValue, icon: Icon, color }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-surface-container-lowest p-8 rounded-xl shadow-ambient flex flex-col justify-between min-h-[200px] border-none"
  >
    <div className="flex justify-between items-start">
      <div className={cn("p-3 rounded-lg bg-opacity-10", color)}>
        <Icon size={24} className={color.replace('bg-', 'text-').replace('/10', '')} />
      </div>
      {trend && (
        <div className="bg-secondary-container px-2 py-1 rounded-md flex items-center gap-1">
          <TrendingUp size={12} className="text-on-secondary-fixed-variant font-bold" />
          <span className="text-[10px] font-bold text-on-secondary-fixed-variant">{trendValue}</span>
        </div>
      )}
    </div>
    <div className="mt-4">
      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-on-surface-variant/60">{title}</span>
      <h4 className="text-4xl font-black text-on-surface tracking-tighter mt-1">{value}</h4>
    </div>
  </motion.div>
);

const CampaignCard = ({ title, description, conversion, spend, status, icon: Icon }: any) => (
  <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm group hover:shadow-ambient transition-all border-none">
    <div className="flex items-start justify-between mb-4">
      <div className="w-10 h-10 bg-primary/5 rounded-lg flex items-center justify-center text-primary">
        <Icon size={20} />
      </div>
      <span className={cn(
        "text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider",
        status === 'GROWTH' ? "bg-secondary-container/20 text-on-secondary-fixed-variant" : "bg-surface-container text-on-surface-variant"
      )}>
        {status}
      </span>
    </div>
    <h6 className="font-bold text-on-surface group-hover:text-primary transition-colors">{title}</h6>
    <p className="text-xs text-on-surface-variant mt-1 mb-6 line-clamp-1">{description}</p>
    <div className="flex items-center justify-between text-[11px] font-bold">
      <div className="flex flex-col">
        <span className="text-on-surface-variant/60 uppercase">Conversion</span>
        <span className="text-on-surface">{conversion}</span>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-on-surface-variant/60 uppercase">Spend</span>
        <span className="text-on-surface">{spend}</span>
      </div>
    </div>
  </div>
);

export const DashboardOverview: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-0">
        <div className="space-y-1">
          <h3 className="text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight">Overview</h3>
          <p className="text-sm md:text-base text-on-surface-variant font-medium">Real-time performance metrics for your enterprise ecosystem.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none justify-center bg-surface-container-high text-primary px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-surface-container-highest transition-colors active:scale-95">
            <ArrowUpRight size={16} />
            Export Report
          </button>
          <button className="flex-1 md:flex-none justify-center bg-primary-container text-on-primary px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-primary/20">
            <Zap size={16} fill="currentColor" />
            New Campaign
          </button>
        </div>
      </section>

      {/* Hero Metrics */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="md:col-span-2 relative overflow-hidden bg-surface-container-lowest rounded-xl p-6 md:p-8 shadow-ambient flex flex-col justify-between min-h-[240px]"
        >
          <div className="absolute top-0 right-0 p-4 md:p-8">
            <div className="flex bg-surface-container-low p-1 rounded-lg">
              <button className="px-2 md:px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/40 hover:text-on-surface transition-colors">7d</button>
              <button className="px-2 md:px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-surface-container-lowest shadow-sm rounded-md text-primary">30d</button>
              <button className="px-2 md:px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/40 hover:text-on-surface transition-colors">1yr</button>
            </div>
          </div>
          <div className="space-y-1 mt-12 md:mt-0">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-on-surface-variant/60">Total Revenue</span>
            <div className="flex flex-wrap items-baseline gap-2">
              <h4 className="text-4xl md:text-6xl font-black text-primary tracking-tighter">$142,840</h4>
              <div className="bg-secondary-container px-2 py-1 rounded-md flex items-center gap-1">
                <TrendingUp size={14} className="font-bold text-on-secondary-fixed-variant" />
                <span className="text-[10px] font-bold text-on-secondary-fixed-variant">+12.4%</span>
              </div>
            </div>
          </div>
          <div className="w-full h-16 mt-4 flex items-end gap-1">
            {[40, 55, 45, 70, 60, 85, 95].map((h, i) => (
              <div 
                key={i} 
                className={cn(
                  "flex-1 rounded-t-sm transition-all duration-500",
                  i === 6 ? "bg-primary-container" : "bg-primary/10"
                )} 
                style={{ height: `${h}%` }} 
              />
            ))}
          </div>
        </motion.div>

        <MetricCard 
          title="Active Clients" 
          value="1,284" 
          trend={true} 
          trendValue="+42 this week" 
          icon={Users} 
          color="bg-primary/10" 
        />
        <MetricCard 
          title="Leads Generated" 
          value="8,492" 
          trend={false} 
          icon={Target} 
          color="bg-primary/10" 
        />
      </section>

      {/* Detailed Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h5 className="text-lg font-bold text-on-surface">Campaign Performance</h5>
            <button className="text-primary text-xs font-bold uppercase tracking-wider hover:underline">View All</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CampaignCard 
              title="Q4 Retail Expansion" 
              description="Multi-channel targeted outreach for electronics division."
              conversion="4.8%"
              spend="$12.4k"
              status="GROWTH"
              icon={Rocket}
            />
            <CampaignCard 
              title="Brand Affinity Survey" 
              description="Customer satisfaction monitoring across regions."
              conversion="32%"
              spend="45k"
              status="STABLE"
              icon={TrendingUp}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Avg CPC', value: '$0.84' },
              { label: 'Conversions', value: '2,105', active: true },
              { label: 'ROAS', value: '4.2x' }
            ].map((stat, i) => (
              <div key={i} className={cn(
                "bg-surface-container-lowest p-4 rounded-xl text-center space-y-1 shadow-sm",
                stat.active && "border-b-2 border-secondary-container"
              )}>
                <span className="text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-widest">{stat.label}</span>
                <p className="text-xl font-bold text-on-surface">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Log */}
        <div className="glass-panel rounded-2xl p-8 shadow-ambient flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <h5 className="text-lg font-bold text-on-surface">Activity Log</h5>
            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant/40">
              <MoreHorizontal size={16} />
            </button>
          </div>
          <div className="space-y-8 relative flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
            <div className="absolute left-2.5 top-2 bottom-2 w-[1px] bg-outline-variant/30" />
            {[
              { title: 'New high-value lead', desc: "Enterprise contact 'Oracle' added to pipeline.", time: '2 mins ago', icon: Zap, color: 'bg-secondary-container' },
              { title: "Campaign 'Q4 Retail' Live", desc: "Status changed to active. Delivery started.", time: '1 hour ago', icon: Mail, color: 'bg-primary/10' },
              { title: 'Weekly Audit Completed', desc: "System healthy. 4 optimizations suggested.", time: '4 hours ago', icon: CheckCircle2, color: 'bg-surface-container' },
              { title: 'API Latency Spike', desc: "Resolved: Database indexing performance issue.", time: 'Yesterday', icon: AlertCircle, color: 'bg-error-container/20' },
              { title: 'New team member added', desc: "Sarah Jenkins joined as Creative Designer.", time: '2 days ago', icon: Users, color: 'bg-tertiary/10' },
            ].map((item, i) => (
              <div key={i} className="relative flex gap-4 pl-8">
                <div className={cn(
                  "absolute left-0 top-1 w-5 h-5 rounded-full ring-4 ring-surface-container-lowest flex items-center justify-center z-10",
                  item.color
                )}>
                  <item.icon size={10} className={cn(item.color.includes('primary') ? 'text-primary' : item.color.includes('error') ? 'text-error' : 'text-on-surface-variant')} />
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface">{item.title}</p>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{item.desc}</p>
                  <span className="text-[10px] text-on-surface-variant/40 mt-2 block font-medium">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-3 border border-outline-variant/20 rounded-xl text-xs font-bold text-on-surface-variant/60 hover:bg-surface-container transition-colors shrink-0">
            Full Activity History
          </button>
        </div>
      </section>

      {/* Active Campaigns & Content */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Campaigns */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h5 className="text-lg font-bold text-on-surface">Active Campaigns</h5>
            <button className="text-primary text-xs font-bold uppercase tracking-wider hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {[
              { name: 'SaaS Growth VSL', platform: 'Instagram', status: 'Scaling', spend: '$4,200', roas: '5.8x' },
              { name: 'Bootstrap Manifesto', platform: 'LinkedIn', status: 'Active', spend: '$2,800', roas: '3.2x' },
              { name: 'Growth OS Demo', platform: 'Instagram', status: 'Scaling', spend: '$3,450', roas: '4.1x' },
            ].map((campaign, i) => (
              <div key={i} className="bg-surface-container-lowest p-6 rounded-xl shadow-sm group hover:shadow-ambient transition-all border-none flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-all">
                    {campaign.platform === 'Instagram' ? <Instagram size={20} /> : <Linkedin size={20} />}
                  </div>
                  <div>
                    <h6 className="font-bold text-on-surface group-hover:text-primary transition-colors">{campaign.name}</h6>
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold mt-1">{campaign.platform} Ads</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">ROAS</p>
                    <p className="text-sm font-black text-secondary">{campaign.roas}</p>
                  </div>
                  <div className={cn(
                    "text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider",
                    campaign.status === 'Scaling' ? "bg-secondary-container/20 text-on-secondary-fixed-variant" : "bg-surface-container text-on-surface-variant"
                  )}>
                    {campaign.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content Calendar Preview */}
        <div className="glass-panel rounded-2xl p-8 shadow-ambient">
          <div className="flex items-center justify-between mb-8">
            <h5 className="text-lg font-bold text-on-surface">Upcoming Content</h5>
            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant/40">
              <MoreHorizontal size={16} />
            </button>
          </div>
          <div className="space-y-8 relative">
            <div className="absolute left-2.5 top-2 bottom-2 w-[1px] bg-outline-variant/30" />
            {[
              { day: 'Today', title: 'The Hidden Growth Hack for SaaS Founders', platform: 'TikTok', time: '18:00', color: 'bg-primary/10' },
              { day: 'Tomorrow', title: 'Why we raised $0 and scaled to $1M ARR', platform: 'LinkedIn', time: '09:00', color: 'bg-secondary-container' },
              { day: 'Mar 24', title: 'Day in the life of a Growth Engineer', platform: 'Instagram', time: '20:00', color: 'bg-surface-container' },
            ].map((item, i) => (
              <div key={i} className="relative flex gap-4 pl-8">
                <div className={cn(
                  "absolute left-0 top-1 w-5 h-5 rounded-full ring-4 ring-surface-container-lowest flex items-center justify-center z-10",
                  item.color
                )}>
                  <Clock size={10} className={cn(item.color.includes('primary') ? 'text-primary' : item.color.includes('secondary') ? 'text-secondary' : 'text-on-surface-variant')} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{item.platform}</span>
                    <span className="text-[10px] font-bold text-on-surface-variant">{item.time}</span>
                  </div>
                  <p className="text-sm font-bold text-on-surface leading-tight">{item.title}</p>
                  <span className="text-[10px] text-on-surface-variant/40 mt-2 block font-medium">{item.day}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-12 py-3 border border-outline-variant/20 rounded-xl text-xs font-bold text-on-surface-variant/60 hover:bg-surface-container transition-colors">
            Full Calendar
          </button>
        </div>
      </section>
    </div>
  );
};
