// Engine phân tích dữ liệu Render và sinh đề xuất thông minh

export function computeRenderStats(records) {
  const completed = records.filter(
    (r) => r.duration !== null && r.duration !== undefined && !isNaN(r.duration)
  )

  const active = records.find((r) => r.startTime && !r.endTime)

  if (completed.length === 0) {
    return {
      completedCount: 0,
      totalCount: records.length,
      activeCount: active ? 1 : 0,
      totalTime: 0,
      avgTime: 0,
      minTime: 0,
      maxTime: 0,
      fastestFile: null,
      slowestFile: null,
      distribution: { fast: 0, normal: 0, medium: 0, slow: 0 },
      stabilityScore: 100,
    }
  }

  const durations = completed.map((r) => r.duration)
  const totalTime = durations.reduce((acc, curr) => acc + curr, 0)
  const avgTime = totalTime / durations.length

  let minTime = durations[0]
  let maxTime = durations[0]
  let fastestFile = completed[0]
  let slowestFile = completed[0]

  completed.forEach((r) => {
    if (r.duration < minTime) {
      minTime = r.duration
      fastestFile = r
    }
    if (r.duration > maxTime) {
      maxTime = r.duration
      slowestFile = r
    }
  })

  // Phân bố tỉ lệ
  // fast: < 20s, normal: 20-50s, medium: 50-100s, slow: > 100s
  const dist = { fast: 0, normal: 0, medium: 0, slow: 0 }
  completed.forEach((r) => {
    if (r.duration < 20) dist.fast++
    else if (r.duration <= 50) dist.normal++
    else if (r.duration <= 100) dist.medium++
    else dist.slow++
  })

  // Tính phương sai & độ lệch chuẩn để đo độ ổn định render (Stability Score)
  const variance =
    durations.reduce((acc, d) => acc + Math.pow(d - avgTime, 2), 0) / durations.length
  const stdDev = Math.sqrt(variance)
  // Điểm ổn định từ 0 - 100% (càng lệch ít so với mean thì điểm càng cao)
  const cv = avgTime > 0 ? (stdDev / avgTime) * 100 : 0
  const stabilityScore = Math.max(10, Math.min(100, Math.round(100 - cv)))

  return {
    completedCount: completed.length,
    totalCount: records.length,
    activeCount: active ? 1 : 0,
    totalTime,
    avgTime,
    minTime,
    maxTime,
    fastestFile,
    slowestFile,
    stdDev,
    distribution: dist,
    stabilityScore,
  }
}

export function generateSmartSuggestions(records, stats) {
  const suggestions = []
  const completed = records.filter((r) => r.duration !== null && r.duration !== undefined)

  if (completed.length === 0) {
    suggestions.push({
      id: 'no-data',
      level: 'info',
      title: 'Chưa có đủ dữ liệu render',
      content:
        'Nhấn "BẮT ĐẦU RENDER" cho file đầu tiên, sau đó nhấn "KẾT THÚC" để hệ thống tự động ghi nhận thời gian và phân tích tỉ lệ tối ưu.',
    })
    return suggestions
  }

  // 1. Phân tích Bottleneck (File render lâu đột biến)
  if (stats.completedCount >= 2 && stats.maxTime > stats.avgTime * 1.4) {
    const diffPct = Math.round(((stats.maxTime - stats.avgTime) / stats.avgTime) * 100)
    suggestions.push({
      id: 'bottleneck',
      level: 'warning',
      title: `Phát hiện Bottleneck: File #${stats.slowestFile?.id || ''} chậm hơn ${diffPct}% so với trung bình`,
      content: `File #${stats.slowestFile?.id} mất tới ${stats.slowestFile?.duration}s trong khi trung bình các file chỉ mất ${stats.avgTime.toFixed(1)}s. Đề xuất: Kiểm tra file này có áp dụng hiệu ứng Motion Blur, 3D Ray-tracing, Noise Reduction hay footage gốc có độ phân giải 4K/60fps chưa được tạo proxy.`,
    })
  }

  // 2. Phân tích xu hướng quá nhiệt / nghẽn RAM (Thermal Throttling / Memory Leak)
  if (completed.length >= 4) {
    const half = Math.floor(completed.length / 2)
    const firstHalfAvg =
      completed.slice(0, half).reduce((sum, r) => sum + r.duration, 0) / half
    const secondHalfAvg =
      completed.slice(half).reduce((sum, r) => sum + r.duration, 0) / (completed.length - half)

    if (secondHalfAvg > firstHalfAvg * 1.25) {
      suggestions.push({
        id: 'thermal-leak',
        level: 'warning',
        title: 'Cảnh báo: Thời gian render có xu hướng tăng dần theo chu kỳ',
        content: `Nửa sau render chậm hơn nửa đầu ${Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100)}%. Hiện tượng này thường do CPU/GPU bị Thermal Throttling (nóng giảm xung nhịp) hoặc phần mềm bị đầy RAM/Disk Cache. Đề xuất: Tạm dừng 2 phút, Purge All Memory & Disk Cache, và kiểm tra quạt tản nhiệt.`,
      })
    } else if (secondHalfAvg < firstHalfAvg * 0.85) {
      suggestions.push({
        id: 'cache-warmup',
        level: 'success',
        title: 'Hiệu suất tăng tốc: Cache đã được tối ưu',
        content: `Nửa sau render nhanh hơn nửa đầu ${Math.round(((firstHalfAvg - secondHalfAvg) / firstHalfAvg) * 100)}%. Hệ thống đang tận dụng tốt bộ nhớ đệm RAM và GPU Shader Cache.`,
      })
    }
  }

  // 3. Đánh giá độ ổn định của toàn bộ Batch
  if (stats.stabilityScore < 60 && stats.completedCount >= 3) {
    suggestions.push({
      id: 'stability-low',
      level: 'warning',
      title: 'Độ đồng đều giữa các file thấp (Stability Score: ' + stats.stabilityScore + '%)',
      content:
        'Thời gian giữa các file dao động rất lớn (từ ' +
        stats.minTime +
        's đến ' +
        stats.maxTime +
        's). Bạn nên phân loại file theo nhóm "Cảnh phức tạp (Nhiều VFX)" và "Cảnh nhẹ (Motion Graphic đơn giản)" để quản lý tiến độ chuẩn xác hơn.',
    })
  } else if (stats.stabilityScore >= 80 && stats.completedCount >= 3) {
    suggestions.push({
      id: 'stability-high',
      level: 'success',
      title: 'Quy trình render rất đồng đều & ổn định (' + stats.stabilityScore + '%)',
      content:
        'Tốc độ render giữa các file rất nhất quán. Điều này cho thấy pipeline dựng phim và thiết lập thông số xuất khẩu (export preset) đang đạt chuẩn tối ưu.',
    })
  }

  // 4. Dự đoán thời gian còn lại (ETA Forecast)
  const remainingCount = records.length - stats.completedCount
  if (remainingCount > 0 && stats.avgTime > 0) {
    const estRemainingSeconds = remainingCount * stats.avgTime
    const estMinutes = (estRemainingSeconds / 60).toFixed(1)
    suggestions.push({
      id: 'eta-forecast',
      level: 'tip',
      title: `Dự báo hoàn thành (ETA): Còn ~${estMinutes} phút cho ${remainingCount} file tiếp theo`,
      content: `Dựa trên tốc độ trung bình hiện tại (${stats.avgTime.toFixed(1)}s/file), dự kiến toàn bộ ${remainingCount} file còn lại sẽ mất khoảng ${Math.round(estRemainingSeconds)} giây để render xong.`,
    })
  }

  // 5. Đề xuất chuẩn phần cứng và Export Settings
  if (stats.avgTime > 90) {
    suggestions.push({
      id: 'hardware-tip',
      level: 'tip',
      title: 'Đề xuất tối ưu cài đặt Renderer (Hardware Acceleration)',
      content:
        'Thời gian render trung bình đang khá cao (> 90 giây/file). Hãy bật Hardware Encoding (NVIDIA NVENC, Intel QuickSync hoặc Apple Metal), chọn định dạng xuất MP4 H.264/H.265 profile CBR/VBR 1-pass thay vì 2-pass nếu không bắt buộc.',
    })
  }

  return suggestions
}
