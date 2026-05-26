"use client";

import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Activity, Users, TrendingUp, TrendingDown, Target, Award } from 'lucide-react';
import Papa from 'papaparse';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend
} from 'recharts';

export type PerformanceData = {
  週開始日: string;
  スタッフ: string;
  業務処理力: number;
  顧客対応力: number;
  主体性改善力: number;
  学習成長: number;
  チーム貢献: number;
  総合スコア: number;
  ハイライト: string;
};

export const DashboardGrid = () => {
  const [data, setData] = useState<PerformanceData[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>("A");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      const response = await fetch('/performance_data.csv');
      const csvText = await response.text();
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          setData(results.data as PerformanceData[]);
          setLastUpdated(new Date());
        }
      });
    } catch (error) {
      console.error("Error fetching CSV", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000); // 5 mins
    return () => clearInterval(interval);
  }, []);

  // Compute metrics
  const staffs = Array.from(new Set(data.map(d => d.スタッフ))).filter(Boolean) as string[];
  
  const sortedWeeks = Array.from(new Set(data.map(d => d.週開始日))).sort().reverse() as string[];
  const latestWeek = sortedWeeks[0];
  const prevWeek = sortedWeeks[1];

  const getLatestScore = (staff: string) => data.find(d => d.スタッフ === staff && d.週開始日 === latestWeek)?.総合スコア || 0;
  const getPrevScore = (staff: string) => data.find(d => d.スタッフ === staff && d.週開始日 === prevWeek)?.総合スコア || 0;
  
  const lineChartData = sortedWeeks.slice().reverse().map(week => {
    const obj: any = { name: week };
    staffs.forEach(staff => {
      const record = data.find(d => d.スタッフ === staff && d.週開始日 === week);
      if (record) obj[staff] = record.総合スコア;
    });
    return obj;
  });

  const radarData = data.filter(d => d.スタッフ === selectedStaff && d.週開始日 === latestWeek).map(d => [
    { subject: '業務処理力', A: d.業務処理力, fullMark: 30 },
    { subject: '顧客対応力', A: d.顧客対応力, fullMark: 30 },
    { subject: '主体性改善力', A: d.主体性改善力, fullMark: 30 },
    { subject: '学習成長', A: d.学習成長, fullMark: 30 },
    { subject: 'チーム貢献', A: d.チーム貢献, fullMark: 30 },
  ]).flat();

  const rankingData = staffs.map(staff => {
    const staffRecords = data.filter(d => d.スタッフ === staff);
    const avg = staffRecords.reduce((sum, r) => sum + r.総合スコア, 0) / (staffRecords.length || 1);
    return { staff, avg: Math.round(avg * 10) / 10 };
  }).sort((a, b) => b.avg - a.avg);

  return (
    <section id='dashboard' className='bg-base-200 rounded-3xl p-6 md:p-10 my-8 max-w-7xl mx-auto shadow-[0_8px_30px_rgb(0,0,0,0.04)]'>
        <div className='flex flex-col md:flex-row items-end justify-between w-full mb-10'>
          <div className='flex flex-col w-full items-start justify-start gap-4'>
            <div className='flex flex-col md:flex-row gap-2 items-end w-full justify-between'>
              <h2 className="relative text-4xl md:text-5xl font-sans font-bold max-w-xl text-left leading-[1.1em] text-base-content tracking-tight">
                Performance Dashboard <br/> 
                <span className="text-2xl text-highlight font-medium mt-2 block flex items-center gap-2">
                  <Activity className="inline-flex text-highlight fill-highlight/10 rotate-12" size={32} />
                  Staff Analytics
                </span>
              </h2>
              <div className='flex flex-col items-end text-sm text-neutral bg-base-100 px-4 py-2 rounded-xl border border-base-300'>
                <span>最終更新</span>
                <span className="font-bold text-base-content">{lastUpdated.toLocaleTimeString()}</span>
              </div>
           </div>
          </div>
        </div>

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-6 auto-rows-min">
            
            {/* サマリーカード */}
            <div className="md:col-span-2 overflow-hidden hover:scale-[1.01] hover:shadow-[-6px_6px_32px_8px_rgba(192,192,192,0.15)] hover:-rotate-1 transition-all duration-300 relative bg-primary/10 border border-primary/20 rounded-3xl flex flex-col p-6">
              <h3 className='text-xl font-bold mb-4 text-base-content flex items-center gap-2'>
                <Users size={22} className="text-primary" /> 直近サマリー ({latestWeek || '-'})
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
                {staffs.map(staff => {
                  const current = getLatestScore(staff);
                  const prev = getPrevScore(staff);
                  const diff = current - prev;
                  const isUp = diff > 0;
                  const isDown = diff < 0;
                  return (
                    <div key={staff} className="bg-white rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:scale-105 transition-transform duration-200">
                      <div className="text-neutral text-sm font-semibold">スタッフ {staff}</div>
                      <div className="text-4xl font-extrabold text-base-content my-2">{current}</div>
                      <div className={cn("text-xs font-bold flex items-center gap-1", isUp ? "text-success" : isDown ? "text-error" : "text-neutral")}>
                        {isUp ? <TrendingUp size={16} /> : isDown ? <TrendingDown size={16} /> : null}
                        {prevWeek ? `${diff > 0 ? '+' : ''}${diff} (前週比)` : '-'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* スコア推移グラフ */}
            <div className="md:col-span-2 overflow-hidden hover:scale-[1.01] hover:shadow-[-6px_6px_32px_8px_rgba(192,192,192,0.15)] hover:rotate-1 transition-all duration-300 relative bg-highlight/10 border border-highlight/20 rounded-3xl flex flex-col p-6">
              <h3 className='text-xl font-bold mb-4 text-base-content flex items-center gap-2'>
                <TrendingUp size={22} className="text-highlight" /> スコア推移
              </h3>
              <div className="w-full h-[250px] bg-white rounded-2xl p-4 shadow-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#777" fontSize={12} tickMargin={10} />
                    <YAxis stroke="#777" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', color: '#0A0A0A', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend wrapperStyle={{ fontSize: '13px', fontWeight: '500' }} />
                    {staffs.map((staff, i) => (
                      <Line key={staff} type="monotone" dataKey={staff} stroke={`hsl(${(i * 60) % 360}, 70%, 55%)`} strokeWidth={3} activeDot={{ r: 6 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 5軸レーダーチャート */}
            <div className="md:col-span-2 overflow-hidden hover:scale-[1.01] hover:shadow-[-6px_6px_32px_8px_rgba(192,192,192,0.15)] hover:-rotate-1 transition-all duration-300 relative bg-accent/15 border border-accent/20 rounded-3xl flex flex-col p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className='text-xl font-bold text-base-content flex items-center gap-2'>
                  <Target size={22} className="text-accent" /> スキルバランス
                </h3>
                <div className="flex items-center gap-2 z-10">
                  <select 
                    className="bg-white text-base-content font-semibold text-sm rounded-xl border-none shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                  >
                    {staffs.map(s => <option key={s} value={s}>スタッフ {s}</option>)}
                  </select>
                  <Link href="/skills" className="bg-white text-accent hover:bg-accent hover:text-white transition-colors px-4 py-2 rounded-xl text-sm font-bold shadow-sm border border-accent/20">
                    詳細を見る
                  </Link>
                </div>
              </div>
              <div className="w-full h-[250px] flex items-center justify-center bg-white rounded-2xl p-2 shadow-sm">
                {radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#555', fontSize: 12, fontWeight: 600 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 30]} tick={{ fill: '#888' }} />
                      <Radar name={`Staff ${selectedStaff}`} dataKey="A" stroke="#439775" fill="#439775" fillOpacity={0.4} strokeWidth={2} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-neutral font-medium">データがありません</div>
                )}
              </div>
            </div>

            {/* 賞与参考スコア */}
            <div className="md:col-span-2 overflow-hidden hover:scale-[1.01] hover:shadow-[-6px_6px_32px_8px_rgba(192,192,192,0.15)] hover:rotate-1 transition-all duration-300 relative bg-secondary/30 border border-secondary/40 rounded-3xl flex flex-col p-6">
              <h3 className='text-xl font-bold mb-4 text-base-content flex items-center gap-2'>
                <Award size={22} className="text-yellow-600" /> 賞与参考スコア (累積平均)
              </h3>
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="flex flex-col gap-3">
                  {rankingData.map((item, index) => (
                    <div key={item.staff} className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-black text-lg", 
                          index === 0 ? "bg-warning text-yellow-900" : 
                          index === 1 ? "bg-slate-200 text-slate-700" : 
                          index === 2 ? "bg-orange-200 text-orange-900" : "bg-base-100 text-neutral"
                        )}>
                          {index + 1}
                        </div>
                        <span className="font-bold text-lg">スタッフ {item.staff}</span>
                      </div>
                      <div className="text-3xl font-extrabold font-display tracking-tight text-base-content">
                        {item.avg.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

        </div>
    </section>
  );
};
