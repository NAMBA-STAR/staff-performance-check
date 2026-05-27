"use client";

import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Activity, Users, TrendingUp, TrendingDown, Target, Award, Clock, Zap, AlertTriangle } from 'lucide-react';
import Papa from 'papaparse';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
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
  Legend,
  ReferenceLine
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
  週間労働時間: number;
  残業時間: number;
  超過アラート: string;
  生産性係数: number;
  ハイライト: string;
};

export const DashboardGrid = () => {
  const [data, setData] = useState<PerformanceData[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>("A");
  const [selectedGlobalWeek, setSelectedGlobalWeek] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Tabs for productivity
  const [prodView, setProdView] = useState<"bar" | "trend">("bar");

  const fetchData = async () => {
    try {
      const response = await fetch('/performance_data.csv');
      const csvText = await response.text();
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedData = results.data as PerformanceData[];
          setData(parsedData);
          setLastUpdated(new Date());
          
          // Set initial week if not set
          if (!selectedGlobalWeek && parsedData.length > 0) {
            const weeks = Array.from(new Set(parsedData.map(d => d.週開始日))).sort().reverse() as string[];
            if (weeks.length > 0) setSelectedGlobalWeek(weeks[0]);
          }
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
  
  const currentWeekIndex = sortedWeeks.indexOf(selectedGlobalWeek);
  const prevWeek = currentWeekIndex >= 0 && currentWeekIndex + 1 < sortedWeeks.length ? sortedWeeks[currentWeekIndex + 1] : null;

  const getScore = (staff: string, week: string | null) => week ? (data.find(d => d.スタッフ === staff && d.週開始日 === week)?.総合スコア || 0) : 0;

  // Alerts for selected week
  const overworkingStaffs = data.filter(d => d.週開始日 === selectedGlobalWeek && String(d.超過アラート).toUpperCase() === "TRUE").map(d => d.スタッフ);

  // Line Chart Data
  const lineChartData = sortedWeeks.slice().reverse().map(week => {
    const obj: any = { name: week };
    staffs.forEach(staff => {
      const record = data.find(d => d.スタッフ === staff && d.週開始日 === week);
      if (record) obj[staff] = record.総合スコア;
    });
    return obj;
  });
  
  // Prod Trend Data
  const prodTrendData = sortedWeeks.slice().reverse().map(week => {
    const obj: any = { name: week };
    staffs.forEach(staff => {
      const record = data.find(d => d.スタッフ === staff && d.週開始日 === week);
      if (record) obj[staff] = record.生産性係数;
    });
    return obj;
  });

  // Radar Data
  const radarData = data.filter(d => d.スタッフ === selectedStaff && d.週開始日 === selectedGlobalWeek).map(d => [
    { subject: '業務処理力', A: d.業務処理力, fullMark: 30 },
    { subject: '顧客対応力', A: d.顧客対応力, fullMark: 30 },
    { subject: '主体性改善力', A: d.主体性改善力, fullMark: 30 },
    { subject: '学習成長', A: d.学習成長, fullMark: 30 },
    { subject: 'チーム貢献', A: d.チーム貢献, fullMark: 30 },
  ]).flat();

  // Prod Bar Data
  const prodBarData = staffs.map(staff => {
    const record = data.find(d => d.スタッフ === staff && d.週開始日 === selectedGlobalWeek);
    return {
      staff,
      生産性係数: record?.生産性係数 || 0
    };
  });
  
  const getProductivityColor = (value: number) => {
    if (value >= 1.0) return "#22c55e"; // green
    if (value >= 0.8) return "#eab308"; // yellow
    if (value >= 0.6) return "#ef4444"; // red
    return "#7f1d1d"; // dark red
  };

  // Attendance Data
  const attendanceData = staffs.map(staff => {
    const record = data.find(d => d.スタッフ === staff && d.週開始日 === selectedGlobalWeek);
    // Determine base hours excluding overtime (Assuming 週間労働時間 includes overtime)
    // If 週間労働時間 is total, base = total - overtime. But let's assume they are separate or stacked normally.
    // The prompt says: "週間労働時間（基本）と残業時間（積み上げ）". So we treat them as stacked values.
    // Assuming '週間労働時間' is the base or total. Let's stack them directly as requested: base and overtime.
    return {
      staff,
      基本労働時間: (record?.週間労働時間 || 0) - (record?.残業時間 || 0),
      残業時間: record?.残業時間 || 0,
      total: record?.週間労働時間 || 0
    };
  });

  // Ranking
  const rankingData = staffs.map(staff => {
    const staffRecords = data.filter(d => d.スタッフ === staff);
    const scoreAvg = staffRecords.reduce((sum, r) => sum + (r.総合スコア || 0), 0) / (staffRecords.length || 1);
    const prodAvg = staffRecords.reduce((sum, r) => sum + (r.生産性係数 || 0), 0) / (staffRecords.length || 1);
    return { staff, scoreAvg: Math.round(scoreAvg * 10) / 10, prodAvg: Math.round(prodAvg * 100) / 100 };
  }).sort((a, b) => b.scoreAvg - a.scoreAvg);

  return (
    <section id='dashboard' className='bg-base-200 rounded-3xl p-6 md:p-10 my-8 max-w-[1400px] mx-auto shadow-[0_8px_30px_rgb(0,0,0,0.04)]'>
        {overworkingStaffs.length > 0 && (
          <div className="mb-6 bg-red-100 border border-red-300 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <AlertTriangle className="text-red-600 shrink-0" size={24} />
            <p className="text-red-800 font-bold">
              ⚠️ 過重労働アラート：{overworkingStaffs.join("、")} が今週の労働時間が上限を超えています。
            </p>
          </div>
        )}

        <div className='flex flex-col md:flex-row items-end justify-between w-full mb-10'>
          <div className='flex flex-col w-full items-start justify-start gap-4'>
            <div className='flex flex-col md:flex-row gap-4 items-end w-full justify-between'>
              <h2 className="relative text-4xl md:text-5xl font-sans font-bold max-w-xl text-left leading-[1.1em] text-base-content tracking-tight">
                Performance Dashboard <br/> 
                <span className="text-2xl text-highlight font-medium mt-2 block flex items-center gap-2">
                  <Activity className="inline-flex text-highlight fill-highlight/10 rotate-12" size={32} />
                  Staff Analytics
                </span>
              </h2>
              <div className='flex flex-col sm:flex-row items-end gap-3'>
                <div className='flex flex-col items-start sm:items-end text-sm text-neutral bg-base-100 px-4 py-2 rounded-xl border border-base-300'>
                  <span className="text-xs">対象週</span>
                  <select 
                    className="font-bold text-base-content bg-transparent focus:outline-none cursor-pointer"
                    value={selectedGlobalWeek}
                    onChange={(e) => setSelectedGlobalWeek(e.target.value)}
                  >
                    {sortedWeeks.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div className='flex flex-col items-end text-sm text-neutral bg-base-100 px-4 py-2 rounded-xl border border-base-300'>
                  <span className="text-xs">最終更新</span>
                  <span className="font-bold text-base-content">{lastUpdated.toLocaleTimeString()}</span>
                </div>
              </div>
           </div>
          </div>
        </div>

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-min">
            
            {/* 1. サマリーカード */}
            <div className="md:col-span-2 overflow-hidden hover:scale-[1.01] hover:shadow-[-6px_6px_32px_8px_rgba(192,192,192,0.15)] transition-all duration-300 relative bg-primary/10 border border-primary/20 rounded-3xl flex flex-col p-6">
              <h3 className='text-xl font-bold mb-4 text-base-content flex items-center gap-2'>
                <Users size={22} className="text-primary" /> 直近サマリー ({selectedGlobalWeek || '-'})
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
                {staffs.map(staff => {
                  const current = getScore(staff, selectedGlobalWeek);
                  const prev = getScore(staff, prevWeek);
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

            {/* 2. 生産性係数パネル */}
            <div className="md:col-span-2 overflow-hidden hover:scale-[1.01] hover:shadow-[-6px_6px_32px_8px_rgba(192,192,192,0.15)] transition-all duration-300 relative bg-emerald-50 border border-emerald-200 rounded-3xl flex flex-col p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className='text-xl font-bold text-base-content flex items-center gap-2'>
                  <Zap size={22} className="text-emerald-600" /> 生産性係数
                </h3>
                <div className="bg-white rounded-lg p-1 shadow-sm flex text-xs font-bold">
                  <button onClick={() => setProdView('bar')} className={cn("px-3 py-1 rounded-md transition-colors", prodView === 'bar' ? "bg-emerald-100 text-emerald-800" : "text-neutral hover:bg-base-100")}>今週</button>
                  <button onClick={() => setProdView('trend')} className={cn("px-3 py-1 rounded-md transition-colors", prodView === 'trend' ? "bg-emerald-100 text-emerald-800" : "text-neutral hover:bg-base-100")}>推移</button>
                </div>
              </div>
              <div className="w-full h-[250px] bg-white rounded-2xl p-4 shadow-sm">
                <ResponsiveContainer width="100%" height="100%">
                  {prodView === 'bar' ? (
                    <BarChart data={prodBarData} margin={{ top: 15, right: 20, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="staff" stroke="#777" fontSize={12} tickMargin={10} tickFormatter={(val) => `St ${val}`} />
                      <YAxis stroke="#777" fontSize={12} domain={[0, 'dataMax + 0.2']} />
                      <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <ReferenceLine y={1.0} stroke="#9ca3af" strokeDasharray="3 3" label={{ position: 'right', value: '1.0', fill: '#6b7280', fontSize: 11 }} />
                      <Bar dataKey="生産性係数" radius={[6, 6, 0, 0]} maxBarSize={50}>
                        {prodBarData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getProductivityColor(entry.生産性係数)} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <LineChart data={prodTrendData} margin={{ top: 15, right: 20, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="name" stroke="#777" fontSize={12} tickMargin={10} />
                      <YAxis stroke="#777" fontSize={12} domain={[0, 'auto']} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <ReferenceLine y={1.0} stroke="#9ca3af" strokeDasharray="3 3" />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      {staffs.map((staff, i) => (
                        <Line key={staff} type="monotone" dataKey={staff} stroke={`hsl(${(i * 60) % 360}, 70%, 55%)`} strokeWidth={3} activeDot={{ r: 5 }} />
                      ))}
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. 勤怠パネル */}
            <div className="md:col-span-2 overflow-hidden hover:scale-[1.01] hover:shadow-[-6px_6px_32px_8px_rgba(192,192,192,0.15)] transition-all duration-300 relative bg-amber-50 border border-amber-200 rounded-3xl flex flex-col p-6">
              <h3 className='text-xl font-bold mb-4 text-base-content flex items-center gap-2'>
                <Clock size={22} className="text-amber-600" /> 週間労働時間 ({selectedGlobalWeek || '-'})
              </h3>
              <div className="w-full h-[250px] bg-white rounded-2xl p-4 shadow-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceData} margin={{ top: 15, right: 20, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="staff" stroke="#777" fontSize={12} tickMargin={10} tickFormatter={(val) => `St ${val}`} />
                    <YAxis stroke="#777" fontSize={12} />
                    <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="5 5" label={{ position: 'top', value: '法定40h', fill: '#ef4444', fontSize: 11, fontWeight: 'bold' }} />
                    <Bar dataKey="基本労働時間" stackId="a" fill="#60a5fa" radius={[0, 0, 4, 4]} maxBarSize={60} />
                    <Bar dataKey="残業時間" stackId="a" fill="#fb923c" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 4. スコア推移グラフ */}
            <div className="md:col-span-2 overflow-hidden hover:scale-[1.01] hover:shadow-[-6px_6px_32px_8px_rgba(192,192,192,0.15)] transition-all duration-300 relative bg-highlight/10 border border-highlight/20 rounded-3xl flex flex-col p-6">
              <h3 className='text-xl font-bold mb-4 text-base-content flex items-center gap-2'>
                <TrendingUp size={22} className="text-highlight" /> 総合スコア推移
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

            {/* 5. 5軸レーダーチャート */}
            <div className="md:col-span-2 overflow-hidden hover:scale-[1.01] hover:shadow-[-6px_6px_32px_8px_rgba(192,192,192,0.15)] transition-all duration-300 relative bg-accent/15 border border-accent/20 rounded-3xl flex flex-col p-6">
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

            {/* 6. 賞与参考スコア */}
            <div className="md:col-span-2 overflow-hidden hover:scale-[1.01] hover:shadow-[-6px_6px_32px_8px_rgba(192,192,192,0.15)] transition-all duration-300 relative bg-secondary/30 border border-secondary/40 rounded-3xl flex flex-col p-6">
              <h3 className='text-xl font-bold mb-4 text-base-content flex items-center gap-2'>
                <Award size={22} className="text-yellow-600" /> 賞与参考スコア (全期間平均)
              </h3>
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="flex flex-col gap-3">
                  {rankingData.map((item, index) => (
                    <div key={item.staff} className="flex flex-col bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow gap-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-black text-sm", 
                            index === 0 ? "bg-warning text-yellow-900" : 
                            index === 1 ? "bg-slate-200 text-slate-700" : 
                            index === 2 ? "bg-orange-200 text-orange-900" : "bg-base-100 text-neutral"
                          )}>
                            {index + 1}
                          </div>
                          <span className="font-bold text-lg">スタッフ {item.staff}</span>
                        </div>
                        <div className="text-2xl font-extrabold font-display tracking-tight text-base-content">
                          {item.scoreAvg.toFixed(1)} <span className="text-sm text-muted font-sans font-medium">点</span>
                        </div>
                      </div>
                      <div className="flex justify-end text-sm font-semibold text-emerald-700 mt-1">
                        生産性平均: {item.prodAvg.toFixed(2)}
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
