"use client";

import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color?: "orange" | "teal" | "green" | "red" | "purple";
  change?: string;
  changeType?: "positive" | "negative";
}

export function StatCard({ label, value, icon, color = "orange", change, changeType }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>
        <i className={`bi ${icon}`}></i>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {change && (
        <div className={`stat-change ${changeType || "positive"}`}>
          {changeType === "positive" ? "↑" : changeType === "negative" ? "↓" : "•"} {change}
        </div>
      )}
    </div>
  );
}

interface StatCardsGridProps {
  stats: Array<{
    label: string;
    value: string | number;
    icon: string;
    color?: "orange" | "teal" | "green" | "red" | "purple";
    change?: string;
    changeType?: "positive" | "negative";
  }>;
}

export function StatCardsGrid({ stats }: StatCardsGridProps) {
  return (
    <div className="stats-grid">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}
