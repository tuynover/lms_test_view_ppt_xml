import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Play,
  Square,
  RotateCcw,
  Plus,
  Trash2,
  Clock,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info,
  HelpCircle,
  BarChart3,
  FileSpreadsheet,
  Timer,
  Sparkles,
  Layers,
  StopCircle,
  Download,
  Upload,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { computeRenderStats, generateSmartSuggestions } from './utils/analysisEngine'
import { exportToExcel, formatDateTime } from './utils/excelExporter'

// Tạo danh sách ban đầu 15 dòng với nhãn Tiến trình A, B, C... hoặc File_01
function createInitialRecords() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  return Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    fileName: i < letters.length ? `Tiến trình ${letters[i]}` : `Tiến trình ${i + 1}`,
    startTime: null,
    endTime: null,
    duration: null,
    note: '',
  }))
}

// Dữ liệu mẫu demo đa luồng
function getMultiThreadDemo() {
  const base = createInitialRecords()
  const now = Date.now()
  // Tiến trình A: bắt đầu 45s trước, đang chạy
  base[0].startTime = new Date(now - 45200).toISOString()
  base[0].note = 'Render cảnh 3D phòng khách'

  // Tiến trình B: bắt đầu 30s trước, đã dừng mất 24.5s
  base[1].startTime = new Date(now - 30000).toISOString()
  base[1].endTime = new Date(now - 5500).toISOString()
  base[1].duration = 24.5
  base[1].note = 'Intro Motion Graphic 60fps'

  // Tiến trình C: bắt đầu 18s trước, đang chạy
  base[2].startTime = new Date(now - 18400).toISOString()
  base[2].note = 'Color Grading Rec709 4K'

  // Tiến trình D: đã hoàn tất trước đó mất 58.2s
  base[3].startTime = new Date(now - 90000).toISOString()
  base[3].endTime = new Date(now - 31800).toISOString()
  base[3].duration = 58.2
  base[3].note = 'Audio Visualizer Waveform'

  return base
}

export default function App() {
  const [records, setRecords] = useState(() => {
    try {
      const saved = localStorage.getItem('hk_render_records_multithread')
      return saved ? JSON.parse(saved) : createInitialRecords()
    } catch {
      return createInitialRecords()
    }
  })

  // Timer cập nhật thời gian thực cho TẤT CẢ các tiến trình đang chạy
  const [nowMs, setNowMs] = useState(Date.now())
  const [newProcName, setNewProcName] = useState('')
  const [newProcNote, setNewProcNote] = useState('')
  const [showVbaGuide, setShowVbaGuide] = useState(false)
  const fileInputRef = useRef(null)

  // Lưu localStorage mỗi khi thay đổi
  useEffect(() => {
    try {
      localStorage.setItem('hk_render_records_multithread', JSON.stringify(records))
    } catch (e) {
      console.error('Failed to save', e)
    }
  }, [records])

  // Danh sách các tiến trình ĐANG CHẠY (startTime có và endTime chưa có)
  const activeProcesses = useMemo(() => {
    return records.filter((r) => r.startTime && !r.endTime)
  }, [records])

  // Cập nhật đồng hồ mỗi 100ms khi có ít nhất 1 tiến trình đang chạy
  useEffect(() => {
    if (activeProcesses.length === 0) return
    const interval = setInterval(() => {
      setNowMs(Date.now())
    }, 100)
    return () => clearInterval(interval)
  }, [activeProcesses.length])

  // Tính số giây chạy trực tiếp cho 1 record
  const getElapsedSeconds = (r) => {
    if (!r.startTime) return 0
    if (r.duration !== null && r.duration !== undefined) return r.duration
    const start = new Date(r.startTime).getTime()
    return Number(Math.max(0, (nowMs - start) / 1000).toFixed(1))
  }

  // Định dạng hiển thị đồng hồ mm:ss.s
  const formatTimerClock = (seconds) => {
    const totalSec = Math.floor(seconds)
    const ms = Math.floor((seconds - totalSec) * 10)
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`
  }

  // Thống kê & Đề xuất
  const stats = computeRenderStats(records)
  const suggestions = generateSmartSuggestions(records, stats)

  // START 1 TIẾN TRÌNH CỤ THỂ
  const handleStartProcess = (id) => {
    const nowIso = new Date().toISOString()
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              startTime: nowIso,
              endTime: null,
              duration: null,
            }
          : r
      )
    )
  }

  // STOP 1 TIẾN TRÌNH CỤ THỂ
  const handleStopProcess = (id) => {
    const nowIso = new Date().toISOString()
    const stopMs = new Date(nowIso).getTime()

    setRecords((prev) =>
      prev.map((r) => {
        if (r.id === id && r.startTime && !r.endTime) {
          const startMs = new Date(r.startTime).getTime()
          const dur = Number(Math.max(0, (stopMs - startMs) / 1000).toFixed(1))
          return {
            ...r,
            endTime: nowIso,
            duration: dur,
          }
        }
        return r
      })
    )

    try {
      confetti({
        particleCount: 35,
        spread: 55,
        origin: { y: 0.75 },
        colors: ['#10B981', '#3B82F6', '#EC4899'],
      })
    } catch {}
  }

  // START TIẾN TRÌNH MỚI (Từ Hero Bar)
  const handleStartNextAvailable = () => {
    const firstIdle = records.find((r) => !r.startTime && !r.endTime)
    const nowIso = new Date().toISOString()

    if (firstIdle) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === firstIdle.id
            ? {
                ...r,
                fileName: newProcName.trim() || r.fileName,
                note: newProcNote.trim() || r.note,
                startTime: nowIso,
                endTime: null,
                duration: null,
              }
            : r
        )
      )
    } else {
      // Nếu hết chỗ, tự thêm 1 dòng mới và Start luôn
      const newId = records.length > 0 ? Math.max(...records.map((r) => r.id)) + 1 : 1
      setRecords((prev) => [
        ...prev,
        {
          id: newId,
          fileName: newProcName.trim() || `Tiến trình ${newId}`,
          note: newProcNote.trim(),
          startTime: nowIso,
          endTime: null,
          duration: null,
        },
      ])
    }

    setNewProcName('')
    setNewProcNote('')
  }

  // DỪNG TẤT CẢ TIẾN TRÌNH ĐANG CHẠY
  const handleStopAllActive = () => {
    if (activeProcesses.length === 0) return
    const nowIso = new Date().toISOString()
    const stopMs = new Date(nowIso).getTime()

    setRecords((prev) =>
      prev.map((r) => {
        if (r.startTime && !r.endTime) {
          const startMs = new Date(r.startTime).getTime()
          return {
            ...r,
            endTime: nowIso,
            duration: Number(Math.max(0, (stopMs - startMs) / 1000).toFixed(1)),
          }
        }
        return r
      })
    )
  }

  // KHỞI CHẠY TẤT CẢ CÁC TIẾN TRÌNH CHƯA CHẠY
  const handleStartAllIdle = () => {
    const nowIso = new Date().toISOString()
    setRecords((prev) =>
      prev.map((r) => (!r.startTime ? { ...r, startTime: nowIso, endTime: null, duration: null } : r))
    )
  }

  // Đo lại dòng cụ thể
  const handleResetRow = (id) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, startTime: null, endTime: null, duration: null } : r
      )
    )
  }

  // Xóa dòng
  const handleDeleteRow = (id) => {
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  // Thêm dòng mới
  const handleAddRow = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const newId = records.length > 0 ? Math.max(...records.map((r) => r.id)) + 1 : 1
    const letterIdx = newId - 1
    const defaultName =
      letterIdx < letters.length ? `Tiến trình ${letters[letterIdx]}` : `Tiến trình ${newId}`

    setRecords((prev) => [
      ...prev,
      {
        id: newId,
        fileName: defaultName,
        startTime: null,
        endTime: null,
        duration: null,
        note: '',
      },
    ])
  }

  // Xóa trắng
  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn làm mới toàn bộ danh sách tiến trình?')) {
      setRecords(createInitialRecords())
      localStorage.removeItem('hk_render_records_multithread')
    }
  }

  // Nạp dữ liệu mẫu
  const handleLoadDemo = () => {
    setRecords(getMultiThreadDemo())
  }

  // Xuất Excel
  const handleExportExcel = async () => {
    await exportToExcel(records, stats, suggestions)
  }

  // Nhập CSV
  const handleImportCSV = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const text = evt.target.result
        const lines = text.split('\n').filter((l) => l.trim().length > 0)
        const parsed = []
        let stt = 1
        lines.forEach((line) => {
          const parts = line.split(',')
          if (parts[0] && !isNaN(parseInt(parts[0].trim()))) {
            const rowId = parseInt(parts[0].trim())
            const startTimeStr = parts[2]?.trim() || null
            const endTimeStr = parts[4]?.trim() || null
            const durVal = parseFloat(parts[5]?.trim())
            parsed.push({
              id: rowId || stt++,
              fileName: parts[6]?.startsWith('File:') ? parts[6].replace('File:', '').trim() : `Tiến trình ${rowId || stt}`,
              startTime: startTimeStr ? new Date().toISOString() : null,
              endTime: endTimeStr ? new Date().toISOString() : null,
              duration: !isNaN(durVal) ? durVal : null,
              note: parts[6]?.trim() || '',
            })
          }
        })
        if (parsed.length > 0) {
          setRecords(parsed)
          alert(`Đã nhập ${parsed.length} tiến trình thành công!`)
        }
      } catch (err) {
        alert('Lỗi nhập file: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-[#0F172A]/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold tracking-wide text-lg bg-gradient-to-r from-blue-400 via-indigo-200 to-white bg-clip-text text-transparent">
                  HK RENDER TIME LOGGER
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  Đa Luồng Song Song
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Khởi chạy nhiều bộ đếm độc lập (A, B, C...) & Dừng riêng biệt theo thứ tự tùy ý
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleLoadDemo}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Xem mô phỏng tiến trình A, B, C chạy và dừng riêng biệt"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Demo Đa Luồng</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span>Nhập CSV</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleImportCSV}
            />

            <button
              onClick={handleClearAll}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-red-950/50 text-slate-300 hover:text-red-400 border border-slate-700 transition"
              title="Làm mới toàn bộ danh sách"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Làm mới</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition transform active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất File Excel</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-6 w-full">
        {/* HERO MULTI-PROCESS CONTROL PANEL */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-[#131B2E] via-[#0E1526] to-[#0A0F1D] p-5 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col space-y-4">
            {/* Hàng 1: Khởi chạy tiến trình mới */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
                <input
                  type="text"
                  placeholder="Tên tiến trình mới (VD: Tiến trình A, B, Scene 01...)"
                  value={newProcName}
                  onChange={(e) => setNewProcName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleStartNextAvailable()
                  }}
                  className="w-full sm:w-64 px-4 py-2.5 text-xs rounded-xl bg-slate-900/90 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Ghi chú (độ phân giải, effect...)"
                  value={newProcNote}
                  onChange={(e) => setNewProcNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleStartNextAvailable()
                  }}
                  className="w-full sm:w-80 px-4 py-2.5 text-xs rounded-xl bg-slate-900/90 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={handleStartNextAvailable}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all transform active:scale-95 shrink-0"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>+ START TIẾN TRÌNH MỚI</span>
                </button>
              </div>

              {/* Nút hành động hàng loạt */}
              <div className="flex items-center space-x-2 shrink-0">
                {activeProcesses.length > 0 && (
                  <button
                    onClick={handleStopAllActive}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
                    title="Dừng tất cả các tiến trình đang chạy cùng 1 lúc"
                  >
                    <StopCircle className="w-4 h-4 text-rose-400" />
                    <span>Dừng tất cả ({activeProcesses.length})</span>
                  </button>
                )}

                <button
                  onClick={handleAddRow}
                  className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm dòng trống</span>
                </button>
              </div>
            </div>

            {/* Hàng 2: DOCK CÁC TIẾN TRÌNH ĐANG CHẠY TRỰC TIẾP (LIVE ACTIVE THREADS) */}
            <div className="pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  <span className="relative flex h-2.5 w-2.5">
                    {activeProcesses.length > 0 && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                        activeProcesses.length > 0 ? 'bg-rose-500' : 'bg-slate-600'
                      }`}
                    ></span>
                  </span>
                  <span>
                    Các Tiến Trình Đang Chạy Song Song ({activeProcesses.length}):
                  </span>
                </div>
                {activeProcesses.length === 0 && (
                  <span className="text-xs text-slate-500 italic">
                    Chưa có tiến trình nào đang chạy. Nhấn nút Play ở bảng hoặc nút Start ở trên để chạy.
                  </span>
                )}
              </div>

              {activeProcesses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {activeProcesses.map((proc) => {
                    const elapsed = getElapsedSeconds(proc)
                    return (
                      <div
                        key={proc.id}
                        className="p-3 rounded-xl border border-rose-500/30 bg-rose-950/20 backdrop-blur flex items-center justify-between shadow-lg shadow-rose-950/20"
                      >
                        <div className="truncate pr-2">
                          <div className="text-xs font-bold text-slate-100 truncate">
                            {proc.fileName}
                          </div>
                          <div className="font-mono text-base font-extrabold text-amber-400 mt-0.5">
                            {formatTimerClock(elapsed)}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {proc.note || `Bắt đầu lúc ${formatDateTime(proc.startTime).slice(11)}`}
                          </div>
                        </div>

                        {/* NÚT DỪNG RIÊNG BIỆT CHO TIẾN TRÌNH NÀY */}
                        <button
                          onClick={() => handleStopProcess(proc.id)}
                          className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-md shadow-rose-950/50 transition transform hover:scale-105 active:scale-95 shrink-0"
                          title={`Dừng riêng biệt cho ${proc.fileName}`}
                        >
                          <Square className="w-3.5 h-3.5 fill-white" />
                          <span>DỪNG</span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 text-center text-xs text-slate-400">
                  ⚡ <strong className="text-slate-300">Mẹo đa luồng:</strong> Bạn có thể nhấn <code className="text-emerald-400">Start</code> cho Tiến trình A, rồi tiếp tục nhấn <code className="text-emerald-400">Start</code> cho Tiến trình B và C. Sau đó có thể nhấn <code className="text-rose-400">Dừng</code> cho Tiến trình B trước, rồi A, rồi C tùy ý!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* THẺ CHỈ SỐ THỐNG KÊ (KPIs) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Đang chạy song song */}
          <div className="bg-[#0F172A] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
              Đang chạy
              <Timer className="w-3.5 h-3.5 text-amber-400" />
            </span>
            <div className="mt-2">
              <div className="text-2xl font-bold text-amber-400 font-mono">
                {stats.activeCount}
                <span className="text-xs text-slate-400 font-normal ml-1">luồng</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">
                {stats.activeCount > 1 ? 'Render đa luồng' : stats.activeCount === 1 ? '1 luồng đang chạy' : 'Đang tạm nghỉ'}
              </p>
            </div>
          </div>

          {/* Đã hoàn tất */}
          <div className="bg-[#0F172A] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
              Đã hoàn tất
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </span>
            <div className="mt-2">
              <div className="text-2xl font-bold text-white font-mono">
                {stats.completedCount}{' '}
                <span className="text-xs text-slate-400 font-normal">/ {records.length}</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${records.length > 0 ? (stats.completedCount / records.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Render trung bình */}
          <div className="bg-[#0F172A] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
              TB mỗi tiến trình
              <Clock className="w-3.5 h-3.5 text-blue-400" />
            </span>
            <div className="mt-2">
              <div className="text-2xl font-bold text-blue-400 font-mono">
                {stats.avgTime > 0 ? stats.avgTime.toFixed(1) : '0'}
                <span className="text-xs text-slate-400 font-normal ml-1">giây</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">
                {stats.avgTime > 60 ? 'Tải nặng' : stats.avgTime > 0 ? 'Tốc độ tốt' : 'Chưa có dữ liệu'}
              </p>
            </div>
          </div>

          {/* Nhanh nhất */}
          <div className="bg-[#0F172A] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
              Nhanh nhất
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
            </span>
            <div className="mt-2">
              <div className="text-2xl font-bold text-emerald-400 font-mono">
                {stats.minTime > 0 ? stats.minTime : '0'}
                <span className="text-xs text-slate-400 font-normal ml-1">giây</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">
                {stats.fastestFile ? stats.fastestFile.fileName : '-'}
              </p>
            </div>
          </div>

          {/* Chậm nhất */}
          <div className="bg-[#0F172A] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
              Chậm nhất
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </span>
            <div className="mt-2">
              <div className="text-2xl font-bold text-rose-400 font-mono">
                {stats.maxTime > 0 ? stats.maxTime : '0'}
                <span className="text-xs text-slate-400 font-normal ml-1">giây</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">
                {stats.slowestFile ? stats.slowestFile.fileName : '-'}
              </p>
            </div>
          </div>

          {/* Tổng thời gian tích lũy */}
          <div className="bg-[#0F172A] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
              Tổng thời gian
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            </span>
            <div className="mt-2">
              <div className="text-2xl font-bold text-purple-400 font-mono">
                {stats.totalTime > 0 ? stats.totalTime.toFixed(0) : '0'}
                <span className="text-xs text-slate-400 font-normal ml-1">s</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">
                ~{(stats.totalTime / 60).toFixed(1)} phút tích lũy
              </p>
            </div>
          </div>
        </div>

        {/* PHẦN ĐỀ XUẤT THÔNG MINH */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Phân Tích Hiệu Suất Đa Luồng & Đề Xuất Tối Ưu
              </h2>
            </div>
            <button
              onClick={() => setShowVbaGuide(!showVbaGuide)}
              className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center space-x-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Xem nguyên lý Excel & VBA</span>
            </button>
          </div>

          {showVbaGuide && (
            <div className="mb-4 p-4 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-300 space-y-3">
              <div className="flex items-center justify-between font-semibold text-slate-200">
                <span>Tại sao Web App này vượt trội hơn Excel Macro đơn luồng?</span>
                <button
                  onClick={() => setShowVbaGuide(false)}
                  className="text-slate-400 hover:text-white"
                >
                  Đóng ✕
                </button>
              </div>
              <p>
                Trong Excel VBA truyền thống, việc theo dõi nhiều tiến trình chạy song song (Start A, B, C rồi dừng riêng biệt B, A, C) rất khó quản lý vì người dùng phải tự tìm đúng dòng trong bảng và nhập ký tự vào cột B/D.
              </p>
              <p className="text-indigo-400 font-medium">
                🚀 Trên Web App này: Từng tiến trình A, B, C có bộ đếm độc lập hoàn toàn với độ trễ 0ms. Khi bạn bấm Dừng tiến trình nào, thời điểm bắt đầu và kết thúc của đúng dòng đó sẽ được chốt lại, sau đó xuất ra file Excel chuẩn 100% template HK RENDER TIME LOGGER!
              </p>
            </div>
          )}

          {/* Cards Đề xuất sinh ra từ Analysis Engine */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((sug) => {
              const isWarning = sug.level === 'warning'
              const isSuccess = sug.level === 'success'
              const isTip = sug.level === 'tip'

              const borderClass = isWarning
                ? 'border-amber-500/30 bg-amber-500/5'
                : isSuccess
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : isTip
                ? 'border-blue-500/30 bg-blue-500/5'
                : 'border-slate-800 bg-slate-900/40'

              const icon = isWarning ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              ) : isSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              ) : isTip ? (
                <Zap className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              )

              return (
                <div key={sug.id} className={`p-3.5 rounded-xl border ${borderClass} flex items-start space-x-3`}>
                  {icon}
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">{sug.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{sug.content}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* BẢNG QUẢN LÝ TIẾN TRÌNH CHI TIẾT */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#11192C]">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-200">
                Danh Sách Tiến Trình & Bộ Đếm Thời Gian Riêng Biệt
              </h3>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                {records.length} tiến trình
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleStartAllIdle}
                className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition"
                title="Bắt đầu đồng loạt các tiến trình chưa chạy"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Start tất cả chưa chạy</span>
              </button>

              <button
                onClick={handleAddRow}
                className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm dòng</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0C1222] text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3 px-3 text-center w-12">STT</th>
                  <th className="py-3 px-4 min-w-[150px]">Tên Tiến Trình / File</th>
                  <th className="py-3 px-4 min-w-[170px] text-center">Thời Điểm Bắt Đầu</th>
                  <th className="py-3 px-4 min-w-[170px] text-center">Thời Điểm Kết Thúc</th>
                  <th className="py-3 px-4 text-right min-w-[120px]">Thời Gian (giây)</th>
                  <th className="py-3 px-4 min-w-[100px] text-center">Đánh Giá</th>
                  <th className="py-3 px-4 min-w-[180px]">Ghi Chú</th>
                  <th className="py-3 px-3 text-center w-36">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {records.map((r) => {
                  const isRunning = r.startTime && !r.endTime
                  const isCompleted = r.duration !== null && r.duration !== undefined
                  const elapsed = getElapsedSeconds(r)

                  const isBottleneck =
                    isCompleted && stats.avgTime > 0 && r.duration > stats.avgTime * 1.3
                  const isSuperFast =
                    isCompleted && stats.avgTime > 0 && r.duration < stats.avgTime * 0.7

                  let pctVsAvg = 0
                  if (isCompleted && stats.avgTime > 0) {
                    pctVsAvg = Math.round(((r.duration - stats.avgTime) / stats.avgTime) * 100)
                  }

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isRunning ? 'bg-indigo-950/20' : ''
                      }`}
                    >
                      {/* STT */}
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-400">
                        {r.id}
                      </td>

                      {/* Tên Tiến Trình */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={r.fileName}
                            onChange={(e) => {
                              const val = e.target.value
                              setRecords((prev) =>
                                prev.map((item) => (item.id === r.id ? { ...item, fileName: val } : item))
                              )
                            }}
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 text-slate-200 font-semibold focus:outline-none px-1 py-0.5 rounded text-xs"
                          />
                        </div>
                      </td>

                      {/* Thời điểm bắt đầu */}
                      <td className="py-3 px-4 text-center font-mono text-slate-300">
                        {r.startTime ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                            {formatDateTime(r.startTime)}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Thời điểm kết thúc */}
                      <td className="py-3 px-4 text-center font-mono text-slate-300">
                        {r.endTime ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                            {formatDateTime(r.endTime)}
                          </span>
                        ) : isRunning ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            <span>Đang chạy...</span>
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Thời Gian (giây) */}
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {isRunning ? (
                          <span className="text-amber-400 text-sm font-black animate-pulse">
                            {elapsed}s
                          </span>
                        ) : isCompleted ? (
                          <span
                            className={
                              isBottleneck
                                ? 'text-rose-400 text-sm'
                                : isSuperFast
                                ? 'text-emerald-400 text-sm'
                                : 'text-slate-200 text-sm'
                            }
                          >
                            {r.duration}s
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Đánh Giá / Tỉ lệ */}
                      <td className="py-3 px-4 text-center">
                        {isCompleted && stats.avgTime > 0 ? (
                          <div className="flex flex-col items-center">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                isBottleneck
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : isSuperFast
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {pctVsAvg > 0 ? `+${pctVsAvg}% TB` : `${pctVsAvg}% TB`}
                            </span>
                            <span className="text-[10px] text-slate-500 mt-0.5">
                              {isBottleneck ? 'Chậm' : isSuperFast ? 'Nhanh' : 'Chuẩn'}
                            </span>
                          </div>
                        ) : isRunning ? (
                          <span className="text-[10px] text-amber-400 font-medium">Live</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Ghi Chú */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="Thêm ghi chú..."
                          value={r.note}
                          onChange={(e) => {
                            const val = e.target.value
                            setRecords((prev) =>
                              prev.map((item) => (item.id === r.id ? { ...item, note: val } : item))
                            )
                          }}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 text-slate-300 placeholder-slate-600 focus:outline-none px-1 py-0.5 rounded text-xs"
                        />
                      </td>

                      {/* Thao Tác Từng Tiến Trình */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center space-x-1.5">
                          {isRunning ? (
                            // NÚT DỪNG RIÊNG CHO DÒNG NÀY
                            <button
                              onClick={() => handleStopProcess(r.id)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] shadow-sm shadow-rose-950 transition active:scale-95"
                              title={`Dừng tiến trình ${r.fileName}`}
                            >
                              <Square className="w-3 h-3 fill-white" />
                              <span>Dừng</span>
                            </button>
                          ) : !r.startTime ? (
                            // NÚT BẮT ĐẦU CHO DÒNG NÀY
                            <button
                              onClick={() => handleStartProcess(r.id)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm shadow-emerald-950 transition active:scale-95"
                              title={`Khởi chạy tiến trình ${r.fileName}`}
                            >
                              <Play className="w-3 h-3 fill-white" />
                              <span>Start</span>
                            </button>
                          ) : (
                            // NÚT ĐO LẠI
                            <button
                              onClick={() => handleResetRow(r.id)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
                              title="Đo lại tiến trình này"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteRow(r.id)}
                            className="p-1 rounded hover:bg-red-950/50 text-slate-500 hover:text-rose-400 transition"
                            title="Xóa tiến trình này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer bảng thống kê chuẩn template HK RENDER */}
          <div className="p-4 bg-[#0A0F1E] border-t border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="flex justify-between items-center py-1 border-b md:border-b-0 md:border-r border-slate-800/80 pr-4">
              <span className="text-slate-400">Số file/tiến trình đã hoàn tất:</span>
              <span className="font-mono font-bold text-white text-sm">{stats.completedCount}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b md:border-b-0 md:border-r border-slate-800/80 pr-4">
              <span className="text-slate-400">Render trung bình (giây):</span>
              <span className="font-mono font-bold text-blue-400 text-sm">
                {stats.avgTime ? stats.avgTime.toFixed(1) : '0'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b md:border-b-0 md:border-r border-slate-800/80 pr-4">
              <span className="text-slate-400">Nhanh nhất (giây):</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">{stats.minTime ?? 0}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Chậm nhất (giây):</span>
              <span className="font-mono font-bold text-rose-400 text-sm">{stats.maxTime ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0B101D] text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              ⚡
            </div>
            <div>
              <span className="font-semibold text-slate-200">
                Sẵn sàng xuất file Excel & lưu trữ phiên làm việc tự động
              </span>
              <p className="text-[11px] text-slate-400">
                Mọi thời điểm bắt đầu và kết thúc độc lập của từng tiến trình được lưu vào LocalStorage và xuất ra đúng template Excel.
              </p>
            </div>
          </div>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tải Báo Cáo Excel</span>
          </button>
        </div>
      </main>
    </div>
  )
}
