/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import { format } from "date-fns";
import { RefreshCw, FileText, Calendar, TrendingUp } from "lucide-react";
import { GoogleGenAI } from "@google/genai";

interface Report {
  id: number;
  date: string;
  content: string;
  created_at: string;
}

export default function App() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/reports");
      if (res.ok) {
        const data = await res.json();
        setReports(data);
        if (data.length > 0 && !selectedReport) {
          setSelectedReport(data[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        You are an expert financial analyst. Please analyze the current state of the NASDAQ and KOSPI markets.
        Provide a comprehensive report including:
        1. Recent performance and key metrics.
        2. Major news or events affecting the markets.
        3. Key stocks driving the market movements.
        4. A brief outlook for the upcoming days.
        
        IMPORTANT: The entire report MUST be written in Korean.
        Format the report in Markdown. Make it professional and easy to read.
        Use the googleSearch tool to get the most up-to-date information.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const content = response.text;
      const today = new Date().toISOString().split("T")[0];

      if (content) {
        const res = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: today, content }),
        });
        
        if (res.ok) {
          await fetchReports();
        } else {
          console.error("Failed to save report to backend");
        }
      }
    } catch (error) {
      console.error("Failed to generate report:", error);
    } finally {
      setGenerating(false);
    }
  };

  // Automatically generate report if none exists for today
  useEffect(() => {
    if (!loading && reports.length >= 0) {
      const today = new Date().toISOString().split("T")[0];
      const hasTodayReport = reports.some(r => r.date === today);
      if (!hasTodayReport && !generating) {
        // We can optionally auto-generate here, but to avoid spamming the API on every reload,
        // let's just let the user click the button, or we can auto-trigger it once.
        // For now, let's auto-trigger it if the reports list is completely empty.
        if (reports.length === 0) {
          handleGenerate();
        }
      }
    }
  }, [loading, reports]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col h-screen overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Market Insight</h1>
          </div>
        </div>

        <div className="p-4">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating..." : "Generate Now"}
          </button>
          <p className="text-xs text-slate-500 mt-2 text-center">
            Auto-generates daily at 7:00 AM
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">Recent Reports</h2>
          {loading ? (
            <div className="flex justify-center p-4">
              <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center p-4 text-slate-500 text-sm">
              No reports generated yet.
            </div>
          ) : (
            reports.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className={`w-full text-left p-3 rounded-xl transition-all ${
                  selectedReport?.id === report.id
                    ? "bg-indigo-50 border border-indigo-100 shadow-sm"
                    : "hover:bg-slate-50 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className={`w-4 h-4 ${selectedReport?.id === report.id ? "text-indigo-600" : "text-slate-400"}`} />
                  <span className={`font-medium text-sm ${selectedReport?.id === report.id ? "text-indigo-900" : "text-slate-700"}`}>
                    {format(new Date(report.date), "MMMM d, yyyy")}
                  </span>
                </div>
                <div className="text-xs text-slate-500 truncate pl-6">
                  NASDAQ & KOSPI Daily Analysis
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 h-screen overflow-y-auto bg-slate-50">
        {selectedReport ? (
          <div className="max-w-4xl mx-auto p-6 md:p-12">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 text-white p-8 md:p-10">
                <div className="flex items-center gap-2 text-indigo-300 mb-4">
                  <FileText className="w-5 h-5" />
                  <span className="font-medium tracking-wide uppercase text-sm">Daily Market Report</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                  NASDAQ & KOSPI Analysis
                </h2>
                <p className="text-slate-400 font-medium">
                  {format(new Date(selectedReport.date), "EEEE, MMMM do, yyyy")}
                </p>
              </div>
              
              <div className="p-8 md:p-10 prose prose-slate prose-indigo max-w-none prose-headings:font-semibold prose-a:text-indigo-600">
                <Markdown>{selectedReport.content}</Markdown>
              </div>
              
              <div className="bg-slate-50 border-t border-slate-200 p-6 text-center text-sm text-slate-500">
                Generated by AI Market Analyst at {format(new Date(selectedReport.created_at + "Z"), "h:mm a")}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6">
            <FileText className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium text-slate-500">Select a report to view</p>
            <p className="text-sm mt-2 max-w-sm text-center">
              Daily reports analyzing the NASDAQ and KOSPI markets are generated every morning at 7:00 AM.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
