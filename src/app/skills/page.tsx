"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Target, Users } from 'lucide-react';
import Papa from 'papaparse';
import {
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip
} from 'recharts';
import type { PerformanceData } from "@/components/ui/colorful-bento-grid";

export default function SkillsPage() {
  const [data, setData] = useState<PerformanceData[]>([]);
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
  }, []);

  const staffs = Array.from(new Set(data.map(d => d.スタッフ))).filter(Boolean) as string[];
  const sortedWeeks = Array.from(new Set(data.map(d => d.週開始日))).sort().reverse() as string[];
  const latestWeek = sortedWeeks[0];

  return (
    <main className="min-h-screen p-4 md:p-8 bg-base-100 flex flex-col items-center">
      <div className="max-w-7xl w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="bg-white p-3 rounded-xl shadow-sm hover:shadow-md hover:bg-base-300 transition-all text-neutral">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold font-sans flex items-center gap-2 text-base-content">
                <Target className="text-accent" size={32} />
                スキルバランス詳細比較
              </h1>
              <p className="text-muted mt-1 flex items-center gap-2">
                <Users size={16} /> 直近週 ({latestWeek || '-'}) の全スタッフ比較
              </p>
            </div>
          </div>
          <div className='flex flex-col items-end text-sm text-neutral bg-white px-4 py-2 rounded-xl shadow-sm border border-base-300'>
            <span>最終更新</span>
            <span className="font-bold text-base-content">{lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Grid of Radar Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staffs.map((staff, i) => {
            const radarData = data.filter(d => d.スタッフ === staff && d.週開始日 === latestWeek).map(d => [
              { subject: '業務処理力', A: d.業務処理力, fullMark: 30 },
              { subject: '顧客対応力', A: d.顧客対応力, fullMark: 30 },
              { subject: '主体性改善力', A: d.主体性改善力, fullMark: 30 },
              { subject: '学習成長', A: d.学習成長, fullMark: 30 },
              { subject: 'チーム貢献', A: d.チーム貢献, fullMark: 30 },
            ]).flat();

            const score = data.find(d => d.スタッフ === staff && d.週開始日 === latestWeek)?.総合スコア || 0;

            return (
              <div key={staff} className="bg-accent/10 border border-accent/20 rounded-3xl p-6 flex flex-col hover:scale-[1.02] hover:shadow-lg transition-transform duration-300">
                <div className="flex justify-between items-center mb-4 border-b border-accent/20 pb-4">
                  <h2 className="text-2xl font-bold text-base-content">スタッフ {staff}</h2>
                  <div className="bg-white px-3 py-1 rounded-lg shadow-sm">
                    <span className="text-xs font-bold text-muted mr-1">総合</span>
                    <span className="text-xl font-extrabold text-accent">{score}</span>
                  </div>
                </div>
                <div className="w-full min-h-[280px] h-[280px] bg-white rounded-2xl p-2 shadow-sm flex items-center justify-center">
                  {radarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#555', fontSize: 11, fontWeight: 600 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 30]} tick={{ fill: '#888' }} />
                        <Radar name={`Staff ${staff}`} dataKey="A" stroke={`hsl(${(i * 60) % 360}, 70%, 45%)`} fill={`hsl(${(i * 60) % 360}, 70%, 45%)`} fillOpacity={0.4} strokeWidth={2} />
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-neutral font-medium">データがありません</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
