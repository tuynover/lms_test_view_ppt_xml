import React, { useState, useEffect, useRef } from 'react'
import {
  Play,
  Square,
  Download,
  Upload,
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
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { computeRenderStats, generateSmartSuggestions } from './utils/analysisEngine'
import { exportToExcel, formatDateTime } from './utils/excelExporter'

// Dữ liệu ban đầu 15 dòng chuẩn theo template HK RENDER TIME LOGGER
function createInitialRecords() {
  return Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    fileName: `File_${String(i + 1).padStart(2, '0')}`,
    startTime: null,
    endTime: null,
    duration: null,
    note: '',
  }))
}

// Dữ liệu mẫu demo trực quan
function getDemoRecords() {
  const now = Date.now()
  const samples = [
    { duration: 24.5, note: 'Intro Scene - 1080p 60fps' },
    { duration: 32.1, note: 'Motion Graphic Title 3D' },
    { duration: 28.0, note: 'Lower third & VFX' },
    { duration: 115.4, note: '4K Footage + Heavy Color Grading (Bottleneck)' },
    { duration: 35.8, note: 'Interview Cam A' },
    { duration: 38.2, note: 'Interview Cam B' },
    { duration: 42.0, note: 'Audio reactive visualizer' },
    { duration: 29.5, note: 'Outro Scene & Credits' },
  ]

  const records = createInitialRecords()
  let currTime = now - 600000 // 10 phút trước

  samples.forEach((sample, idx) => {
    const start = new Date(currTime)
    const end = new Date(currTime + sample.duration * 1000)
    records[idx] = {
      id: idx + 1,
      fileName: `File_${String(idx + 1).padStart(2, '0')}`,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      duration: sample.duration,
      note: sample.note,
    }
    currTime += (sample.duration + 15) * 1000
  })

  return records
}

export default function App() {
  const [records, setRecords] = useState(() => {
    try {
      const saved = localStorage.getItem('hk_render_records')
      return saved ? JSON.parse(saved) : createInitialRecords()
    } catch {
      return createInitialRecords()
    }
  })

  // Trạng thái live render
  const [activeId, setActiveId] = useState(null)
  const [liveDuration, setLiveDuration] = useState(0)
  const [quickFileName, setQuickFileName] = useState('')
  const [quickNote, setQuickNote] = useState('')
  const [showVbaGuide, setShowVbaGuide] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard') // dashboard | table | analytics

  // Lưu localStorage khi có thay đổi
  useEffect(() => {
    try {
      localStorage.setItem('hk_render_records', JSON.stringify(records))
    } catch (e) {
      console.error('Failed to save to localStorage', e)
    }
  }, [records])

  // Timer chạy theo thời gian thực (update mỗi 100ms)
  useEffect(() => {
    let interval = null
    if (activeId !== null) {
      const activeRecord = records.find((r) => r.id === activeId)
      if (activeRecord && activeRecord.startTime) {
        const startMs = new Date(activeRecord.startTime).getTime()
        interval = setInterval(() => {
          const nowMs = Date.now()
          const diffSec = Math.max(0, (nowMs - startMs) / 1000)
          setLiveDuration(Number(diffSec.toFixed(1)))
        }, 100)
      }
    } else {
      setLiveDuration(0)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [activeId, records])

  // Thống kê & Phân tích thông minh
  const stats = computeRenderStats(records)
  const suggestions = generateSmartSuggestions(records, stats)

  // Tìm STT kế tiếp cần render
  const nextTarget = records.find((r) => !r.startTime && !r.endTime)
  const currentRunning = records.find((r) => r.id === activeId)

  // BẮT ĐẦU RENDER (Click lần đầu)
  const handleStart = (targetId) => {
    const idToStart = targetId || (nextTarget ? nextTarget.id : records.length + 1)

    const nowIso = new Date().toISOString()
    setRecords((prev) => {
      const exists = prev.some((r) => r.id === idToStart)
      if (exists) {
        return prev.map((r) =>
          r.id === idToStart
            ? {
                ...r,
                startTime: nowIso,
                endTime: null,
                duration: null,
                fileName: quickFileName.trim() || r.fileName,
                note: quickNote.trim() || r.note,
              }
            : r
        )
      } else {
        return [
          ...prev,
          {
            id: idToStart,
            fileName: quickFileName.trim() || `File_${String(idToStart).padStart(2, '0')}`,
            startTime: nowIso,
            endTime: null,
            duration: null,
            note: quickNote.trim(),
          },
        ]
      }
    })

    setActiveId(idToStart)
    setLiveDuration(0)
  }

  // KẾT THÚC RENDER (Click lần sau)
  const handleStop = (targetId) => {
    const idToStop = targetId || activeId
    if (!idToStop) return

    const nowIso = new Date().toISOString()
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id === idToStop && r.startTime) {
          const startMs = new Date(r.startTime).getTime()
          const endMs = new Date(nowIso).getTime()
          const durSec = Number(Math.max(0, (endMs - startMs) / 1000).toFixed(1))
          return {
            ...r,
            endTime: nowIso,
            duration: durSec,
          }
        }
        return r
      })
    )

    setActiveId(null)
    setLiveDuration(0)
    setQuickFileName('')
    setQuickNote('')

    // Bắn pháo hoa nhỏ ăn mừng hoàn thành
    try {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#10B981', '#3B82F6', '#8B5CF6'],
      })
    } catch {}
  }

  // Phím tắt Spacebar để Start / Stop
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Tránh kích hoạt khi người dùng đang gõ trong input / textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return

      if (e.code === 'Space') {
        e.preventDefault()
        if (activeId !== null) {
          handleStop()
        } else {
          handleStart()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeId, nextTarget, quickFileName, quickNote])

  // Reset hàng cụ thể
  const handleResetRow = (id) => {
    if (activeId === id) setActiveId(null)
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, startTime: null, endTime: null, duration: null, note: '' }
          : r
      )
    )
  }

  // Xóa hàng
  const handleDeleteRow = (id) => {
    if (activeId === id) setActiveId(null)
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  // Thêm hàng mới
  const handleAddRow = () => {
    setRecords((prev) => [
      ...prev,
      {
        id: prev.length > 0 ? Math.max(...prev.map((r) => r.id)) + 1 : 1,
        fileName: `File_${String(prev.length + 1).padStart(2, '0')}`,
        startTime: null,
        endTime: null,
        duration: null,
        note: '',
      },
    ])
  }

  // Xóa tất cả (Reset về ban đầu)
  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu để bắt đầu phiên mới?')) {
      setActiveId(null)
      setRecords(createInitialRecords())
      localStorage.removeItem('hk_render_records')
    }
  }

  // Nạp dữ liệu mẫu
  const handleLoadDemo = () => {
    setActiveId(null)
    setRecords(getDemoRecords())
  }

  // Xuất file Excel
  const handleExportExcel = async () => {
    await exportToExcel(records, stats, suggestions)
  }

  // Nhập file CSV / Excel cơ bản
  const fileInputRef = useRef(null)
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
          // Kiểm tra nếu là dòng dữ liệu STT là số
          if (parts[0] && !isNaN(parseInt(parts[0].trim()))) {
            const rowId = parseInt(parts[0].trim())
            const startTimeStr = parts[2]?.trim() || null
            const endTimeStr = parts[4]?.trim() || null
            const durVal = parseFloat(parts[5]?.trim())
            parsed.push({
              id: rowId || stt++,
              fileName: `File_${String(rowId || stt).padStart(2, '0')}`,
              startTime: startTimeStr ? new Date().toISOString() : null,
              endTime: endTimeStr ? new Date().toISOString() : null,
              duration: !isNaN(durVal) ? durVal : null,
              note: parts[6]?.trim() || '',
            })
          }
        })
        if (parsed.length > 0) {
          setRecords(parsed)
          alert(`Đã nhập thành công ${parsed.length} dòng dữ liệu!`)
        } else {
          alert('Không tìm thấy dòng dữ liệu hợp lệ trong file. Vui lòng kiểm tra định dạng.')
        }
      } catch (err) {
        alert('Lỗi khi đọc file: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-[#0F172A]/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Timer className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold tracking-wide text-lg bg-gradient-to-r from-blue-400 via-indigo-200 to-white bg-clip-text text-transparent">
                  HK RENDER TIME LOGGER
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Web Edition
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Theo dõi thời gian render, phân tích tỉ lệ & đề xuất tối ưu hóa
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleLoadDemo}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Nạp dữ liệu giả lập để xem biểu đồ và đề xuất"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Dữ liệu Demo</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Nhập dữ liệu từ file CSV"
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
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-red-950/50 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-800/40 transition"
              title="Xóa trắng bảng để đo đợt mới"
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

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-6 w-full">
        {/* HERO CONTROLLER: 1-Click Fast Render Timer */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-[#131B2E] to-[#0D1322] p-6 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Cột trái: Bộ điều khiển Start/Stop nhanh */}
            <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
              {activeId !== null ? (
                // NÚT KẾT THÚC (Click lần sau)
                <button
                  onClick={() => handleStop()}
                  className="group relative flex items-center justify-center space-x-3 w-full sm:w-72 h-20 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 text-white font-bold text-lg shadow-xl shadow-rose-900/40 transition-all transform hover:scale-[1.02] active:scale-98 animate-pulse"
                >
                  <Square className="w-7 h-7 fill-white" />
                  <div className="text-left">
                    <div className="text-xs uppercase tracking-wider text-rose-200">
                      Đang Render File #{activeId}
                    </div>
                    <div className="text-xl font-extrabold">KẾT THÚC RENDER</div>
                  </div>
                </button>
              ) : (
                // NÚT BẮT ĐẦU (Click lần đầu)
                <button
                  onClick={() => handleStart()}
                  className="group relative flex items-center justify-center space-x-3 w-full sm:w-72 h-20 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-lg shadow-xl shadow-emerald-900/40 transition-all transform hover:scale-[1.02] active:scale-98"
                >
                  <Play className="w-7 h-7 fill-white" />
                  <div className="text-left">
                    <div className="text-xs uppercase tracking-wider text-emerald-200">
                      {nextTarget ? `Tiếp theo: File #${nextTarget.id}` : 'Thêm & Render File mới'}
                    </div>
                    <div className="text-xl font-extrabold">BẮT ĐẦU RENDER</div>
                  </div>
                </button>
              )}

              {/* Đồng hồ Stopwatch đếm trực tiếp */}
              <div className="flex flex-col items-center sm:items-start">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                  {activeId !== null ? 'Thời gian render thực tế' : 'Đồng hồ đếm thời gian'}
                </span>
                <div className="font-mono text-4xl sm:text-5xl font-black tracking-tight text-white flex items-baseline space-x-2">
                  <span
                    className={
                      activeId !== null
                        ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                        : 'text-slate-500'
                    }
                  >
                    {liveDuration > 0 ? liveDuration.toFixed(1) : '0.0'}
                  </span>
                  <span className="text-lg text-slate-400 font-sans font-normal">giây</span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 mt-1">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                    SPACE
                  </span>
                  <span>Nhấn Spacebar để Bắt đầu / Dừng tức thì</span>
                </div>
              </div>
            </div>

            {/* Cột phải: Form nhập nhanh tên file hoặc ghi chú */}
            <div className="w-full lg:w-96 bg-slate-900/70 p-4 rounded-xl border border-slate-800/80 backdrop-blur">
              <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>Thông tin file render hiện tại</span>
                {activeId !== null && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                    Đang ghi nhận
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Tên file (ví dụ: Scene_01_Intro.mp4)"
                  value={
                    activeId !== null
                      ? currentRunning?.fileName || ''
                      : quickFileName
                  }
                  onChange={(e) => {
                    const val = e.target.value
                    if (activeId !== null) {
                      setRecords((prev) =>
                        prev.map((r) => (r.id === activeId ? { ...r, fileName: val } : r))
                      )
                    } else {
                      setQuickFileName(val)
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800/90 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Ghi chú (độ phân giải, preset, hiệu ứng...)"
                  value={
                    activeId !== null
                      ? currentRunning?.note || ''
                      : quickNote
                  }
                  onChange={(e) => {
                    const val = e.target.value
                    if (activeId !== null) {
                      setRecords((prev) =>
                        prev.map((r) => (r.id === activeId ? { ...r, note: val } : r))
                      )
                    } else {
                      setQuickNote(val)
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800/90 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {activeId !== null && (
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => {
                      if (window.confirm('Hủy bỏ lượt render file hiện tại?')) {
                        handleResetRow(activeId)
                      }
                    }}
                    className="text-[11px] text-slate-400 hover:text-rose-400 transition"
                  >
                    Hủy lượt đo này
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* THẺ CHỈ SỐ THỐNG KÊ (KPIs) */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* 1. Số file hoàn tất */}
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

          {/* 2. Render trung bình */}
          <div className="bg-[#0F172A] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
              TB mỗi file
              <Clock className="w-3.5 h-3.5 text-blue-400" />
            </span>
            <div className="mt-2">
              <div className="text-2xl font-bold text-blue-400 font-mono">
                {stats.avgTime > 0 ? stats.avgTime.toFixed(1) : '0'}
                <span className="text-xs text-slate-400 font-normal ml-1">giây</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">
                {stats.avgTime > 60 ? 'Hơi chậm' : stats.avgTime > 0 ? 'Tốc độ ổn' : 'Chưa có dữ liệu'}
              </p>
            </div>
          </div>

          {/* 3. Nhanh nhất */}
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
                {stats.fastestFile ? `File #${stats.fastestFile.id}` : '-'}
              </p>
            </div>
          </div>

          {/* 4. Chậm nhất */}
          <div className="bg-[#0F172A] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
              Chậm nhất
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </span>
            <div className="mt-2">
              <div className="text-2xl font-bold text-amber-400 font-mono">
                {stats.maxTime > 0 ? stats.maxTime : '0'}
                <span className="text-xs text-slate-400 font-normal ml-1">giây</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">
                {stats.slowestFile ? `File #${stats.slowestFile.id}` : '-'}
              </p>
            </div>
          </div>

          {/* 5. Tổng thời gian tích lũy */}
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
                ~{(stats.totalTime / 60).toFixed(1)} phút làm việc
              </p>
            </div>
          </div>

          {/* 6. Điểm ổn định hiệu năng */}
          <div className="bg-[#0F172A] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
              Độ ổn định
              <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
            </span>
            <div className="mt-2">
              <div className="text-2xl font-bold text-indigo-400 font-mono">
                {stats.completedCount >= 2 ? `${stats.stabilityScore}%` : '100%'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">
                {stats.stabilityScore >= 80
                  ? 'Rất đồng đều'
                  : stats.stabilityScore >= 60
                  ? 'Bình thường'
                  : 'Chênh lệch cao'}
              </p>
            </div>
          </div>
        </div>

        {/* PHẦN ĐỀ XUẤT THÔNG MINH DỰA TRÊN DỮ LIỆU FILE EXCEL */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Phân Tích Dữ Liệu & Đề Xuất Tối Ưu Hóa Render
              </h2>
            </div>
            <button
              onClick={() => setShowVbaGuide(!showVbaGuide)}
              className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center space-x-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Xem hướng dẫn & VBA gốc</span>
            </button>
          </div>

          {/* Modal / Collapse hướng dẫn VBA */}
          {showVbaGuide && (
            <div className="mb-4 p-4 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-300 space-y-3">
              <div className="flex items-center justify-between font-semibold text-slate-200">
                <span>Nguyên lý hoạt động file Excel & Macro VBA gốc:</span>
                <button
                  onClick={() => setShowVbaGuide(false)}
                  className="text-slate-400 hover:text-white"
                >
                  Đóng ✕
                </button>
              </div>
              <p>
                File Excel gốc sử dụng sự kiện <code className="text-amber-300">Worksheet_Change</code>.
                Khi bạn nhập ký tự vào cột B rồi Enter, VBA tự điền thời gian bắt đầu vào cột C. Khi xong,
                nhập ký tự vào cột D rồi Enter để ghi thời gian kết thúc vào cột E.
              </p>
              <div className="p-2 rounded bg-black/50 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-40">
                <pre>{`Private Sub Worksheet_Change(ByVal Target As Range)
    ' Ghi timestamp cố định tại C khi nhập B, và E khi nhập D
    If Target.Column = 2 Then Me.Cells(Target.Row, "C").Value = Now
    If Target.Column = 4 Then Me.Cells(Target.Row, "E").Value = Now
End Sub`}</pre>
              </div>
              <p className="text-emerald-400 font-medium">
                💡 Trên phiên bản Web này: Bạn không cần cài đặt Macro hay Excel phức tạp. Chỉ cần click
                chuột 1 lần hoặc nhấn Spacebar, mọi công thức tính toán và phân tích được tự động hóa 100%!
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

          {/* Phân bố tỉ lệ thời gian render */}
          {stats.completedCount > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="flex items-center space-x-3 text-slate-400">
                <span className="font-semibold text-slate-300">Phân bố thời gian render:</span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>&lt;20s ({stats.distribution.fast})</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>20-50s ({stats.distribution.normal})</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>50-100s ({stats.distribution.medium})</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>&gt;100s ({stats.distribution.slow})</span>
                </span>
              </div>
              <div className="text-slate-400">
                Độ lệch chuẩn: <span className="font-mono text-slate-200">±{stats.stdDev?.toFixed(1) || 0}s</span>
              </div>
            </div>
          )}
        </div>

        {/* BẢNG CHI TIẾT DỮ LIỆU TƯƠNG THÍCH MẪU EXCEL HK RENDER */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#11192C]">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-slate-200">
                Danh Sách Chi Tiết Các File Render
              </h3>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                {records.length} dòng
              </span>
            </div>

            <div className="flex items-center space-x-2">
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
                  <th className="py-3 px-4 min-w-[140px]">Tên File</th>
                  <th className="py-3 px-4 min-w-[170px] text-center">Thời Điểm Bắt Đầu</th>
                  <th className="py-3 px-4 min-w-[170px] text-center">Thời Điểm Kết Thúc</th>
                  <th className="py-3 px-4 text-right min-w-[110px]">Render (giây)</th>
                  <th className="py-3 px-4 min-w-[100px] text-center">Tỉ Lệ / Đánh Giá</th>
                  <th className="py-3 px-4 min-w-[180px]">Ghi Chú</th>
                  <th className="py-3 px-3 text-center w-28">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {records.map((r, index) => {
                  const isRunning = activeId === r.id
                  const isCompleted = r.duration !== null && r.duration !== undefined
                  const isBottleneck =
                    isCompleted && stats.avgTime > 0 && r.duration > stats.avgTime * 1.3
                  const isSuperFast =
                    isCompleted && stats.avgTime > 0 && r.duration < stats.avgTime * 0.7

                  // Tỉ lệ % so với trung bình
                  let pctVsAvg = 0
                  if (isCompleted && stats.avgTime > 0) {
                    pctVsAvg = Math.round(((r.duration - stats.avgTime) / stats.avgTime) * 100)
                  }

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isRunning ? 'bg-blue-950/20' : ''
                      }`}
                    >
                      {/* STT */}
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-400">
                        {r.id}
                      </td>

                      {/* Tên File */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={r.fileName}
                          onChange={(e) => {
                            const val = e.target.value
                            setRecords((prev) =>
                              prev.map((item) => (item.id === r.id ? { ...item, fileName: val } : item))
                            )
                          }}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 text-slate-200 font-medium focus:outline-none px-1 py-0.5 rounded text-xs"
                        />
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
                            <span>Đang render...</span>
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Render (giây) */}
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {isRunning ? (
                          <span className="text-amber-400 text-sm animate-pulse">
                            {liveDuration.toFixed(1)}s
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

                      {/* Tỉ lệ / Đánh giá */}
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
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Ghi chú */}
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
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 text-slate-300 placeholder-slate-600 focus:outline-none px-1 py-0.5 rounded text-xs"
                        />
                      </td>

                      {/* Thao tác từng dòng */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center space-x-1">
                          {isRunning ? (
                            <button
                              onClick={() => handleStop(r.id)}
                              className="p-1 rounded bg-rose-600 hover:bg-rose-500 text-white transition"
                              title="Dừng render dòng này"
                            >
                              <Square className="w-3.5 h-3.5 fill-white" />
                            </button>
                          ) : !r.startTime ? (
                            <button
                              onClick={() => handleStart(r.id)}
                              className="p-1 rounded bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white transition"
                              title="Bắt đầu render dòng này"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleResetRow(r.id)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
                              title="Đo lại dòng này"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteRow(r.id)}
                            className="p-1 rounded hover:bg-red-950/50 text-slate-500 hover:text-rose-400 transition"
                            title="Xóa dòng này"
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

          {/* Footer bảng: Thống kê nhanh dưới bảng giống hệt file Excel HK Render */}
          <div className="p-4 bg-[#0A0F1E] border-t border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="flex justify-between items-center py-1 border-b md:border-b-0 md:border-r border-slate-800/80 pr-4">
              <span className="text-slate-400">Số file đã hoàn tất:</span>
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
              <span className="font-mono font-bold text-amber-400 text-sm">{stats.maxTime ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Hướng Dẫn Deploy Lên Vercel & Render */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0B101D] text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 font-bold">
              ▲
            </div>
            <div>
              <span className="font-semibold text-slate-200">
                Sẵn sàng triển khai lên Vercel hoặc Render:
              </span>
              <p className="text-[11px] text-slate-400">
                Chạy lệnh <code className="text-blue-400">npm run build</code> rồi liên kết GitHub repo với
                Vercel (chọn Framework Vite) hoặc Render Static Site chỉ với 1 click!
              </p>
            </div>
          </div>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tải Excel Log Ngay</span>
          </button>
        </div>
      </main>
    </div>
  )
}
