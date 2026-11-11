import ExcelJS from 'exceljs'

// Format timestamp dd/mm/yyyy hh:mm:ss
export function formatDateTime(date) {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  const day = pad(d.getDate())
  const month = pad(d.getMonth() + 1)
  const year = d.getFullYear()
  const hours = pad(d.getHours())
  const minutes = pad(d.getMinutes())
  const seconds = pad(d.getSeconds())
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
}

export async function exportToExcel(records, stats, suggestions) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'HK RENDER TIME LOGGER'
  workbook.created = new Date()

  // ================= SHEET 1: Render Log =================
  const sheet1 = workbook.addWorksheet('Render Log', {
    views: [{ showGridLines: true }],
  })

  // Định nghĩa các cột
  sheet1.columns = [
    { key: 'colA', width: 10 },  // STT
    { key: 'colB', width: 16 },  // Enter BẮT ĐẦU
    { key: 'colC', width: 24 },  // Thời điểm bắt đầu
    { key: 'colD', width: 16 },  // Enter KẾT THÚC
    { key: 'colE', width: 24 },  // Thời điểm kết thúc
    { key: 'colF', width: 18 },  // Render (giây)
    { key: 'colG', width: 35 },  // Ghi chú
  ]

  // Header Titles (theo đúng file mẫu HK RENDER TIME LOGGER)
  sheet1.addRow(['HK RENDER TIME LOGGER', '', '', '', '', '', ''])
  sheet1.addRow([
    'Mỗi file có 2 thao tác riêng: nhập ký tự ở cột B rồi Enter để ghi BẮT ĐẦU; nhập ký tự ở cột D rồi Enter để ghi KẾT THÚC.',
    '', '', '', '', '', '',
  ])
  sheet1.addRow([
    'Timestamp được ghi cố định bằng VBA. Cột F tự tính tổng thời gian từ lúc bắt đầu đến lúc kết thúc.',
    '', '', '', '', '', '',
  ])
  sheet1.addRow([]) // Dòng trống

  // Style Title Row 1
  const row1 = sheet1.getRow(1)
  row1.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF1E3A8A' } }
  row1.height = 24

  // Style Row 2 & 3
  ;[2, 3].forEach((r) => {
    sheet1.getRow(r).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF4B5563' } }
  })

  // Table Headers (Row 5)
  const headers = [
    'STT',
    'Enter BẮT ĐẦU',
    'Thời điểm bắt đầu',
    'Enter KẾT THÚC',
    'Thời điểm kết thúc',
    'Render (giây)',
    'Ghi chú',
  ]
  const headerRow = sheet1.addRow(headers)
  headerRow.height = 26
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F2937' },
    }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF9CA3AF' } },
      left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
      bottom: { style: 'medium', color: { argb: 'FF111827' } },
      right: { style: 'thin', color: { argb: 'FF9CA3AF' } },
    }
  })

  // Dữ liệu dòng từ 1 đến N (đảm bảo ít nhất 15 dòng như template mẫu)
  const totalRows = Math.max(records.length, 15)
  for (let i = 0; i < totalRows; i++) {
    const item = records[i]
    const rowNum = i + 1
    const startStr = item?.startTime ? formatDateTime(item.startTime) : ''
    const endStr = item?.endTime ? formatDateTime(item.endTime) : ''
    const duration = item?.duration !== null && item?.duration !== undefined ? item.duration : ''
    const note = item?.note || (item?.fileName ? `File: ${item.fileName}` : '')

    const dataRow = sheet1.addRow([
      rowNum,
      item?.startTime ? 'x' : '',
      startStr,
      item?.endTime ? 'x' : '',
      endStr,
      duration,
      note,
    ])

    dataRow.height = 20
    dataRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Segoe UI', size: 10 }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      }
      if (colNumber === 1 || colNumber === 2 || colNumber === 4) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      } else if (colNumber === 3 || colNumber === 5) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      } else if (colNumber === 6) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' }
        if (typeof cell.value === 'number') {
          cell.numFmt = '#,##0.0'
        }
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' }
      }
    })
  }

  // Khối Thống kê Tổng hợp
  sheet1.addRow([]) // Dòng trống

  const statItems = [
    ['', '', '', '', 'Số file đã hoàn tất', stats.completedCount, ''],
    ['', '', '', '', 'Render trung bình (giây)', stats.avgTime ? Number(stats.avgTime.toFixed(1)) : 0, ''],
    ['', '', '', '', 'Nhanh nhất (giây)', stats.minTime ?? 0, ''],
    ['', '', '', '', 'Chậm nhất (giây)', stats.maxTime ?? 0, ''],
    ['', '', '', '', 'Tổng thời gian (giây)', stats.totalTime ? Number(stats.totalTime.toFixed(1)) : 0, ''],
  ]

  statItems.forEach((rowArr) => {
    const sRow = sheet1.addRow(rowArr)
    sRow.height = 22
    // Cột E (Label)
    const labelCell = sRow.getCell(5)
    labelCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1F2937' } }
    labelCell.alignment = { vertical: 'middle', horizontal: 'right' }
    labelCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' },
    }
    labelCell.border = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    }

    // Cột F (Value)
    const valCell = sRow.getCell(6)
    valCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF2563EB' } }
    valCell.alignment = { vertical: 'middle', horizontal: 'right' }
    valCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEFF6FF' },
    }
    valCell.border = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    }
    if (typeof valCell.value === 'number') {
      valCell.numFmt = '#,##0.0'
    }
  })

  // Khối Hướng dẫn sử dụng & VBA
  sheet1.addRow([])
  const guideHeader = sheet1.addRow(['HƯỚNG DẪN SỬ DỤNG'])
  guideHeader.getCell(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF111827' } }

  const guides = [
    ['1. Chuẩn bị', 'Lưu bản sao dạng Excel Macro-Enabled Workbook (*.xlsm) nếu muốn dùng macro trong Excel.'],
    ['2. Ghi BẮT ĐẦU', 'Nhập ký tự bất kỳ vào cột B rồi Enter. Excel ghi thời gian hiện tại vào cột C.'],
    ['3. Ghi KẾT THÚC', 'Khi render xong, nhập ký tự bất kỳ vào cột D rồi Enter. Excel ghi thời gian vào cột E.'],
    ['4. Kết quả', 'Cột F tự tính thời gian render (giây) = Kết thúc - Bắt đầu.'],
    ['5. Web App Sync', 'File này được xuất tự động từ ứng dụng HK Render Time Logger Web với đầy đủ dữ liệu tính toán.'],
  ]

  guides.forEach(([step, desc]) => {
    const gRow = sheet1.addRow([step, desc])
    gRow.getCell(1).font = { name: 'Segoe UI', size: 9, bold: true }
    gRow.getCell(2).font = { name: 'Segoe UI', size: 9, italic: true }
  })

  // ================= SHEET 2: Phân Tích & Đề Xuất =================
  const sheet2 = workbook.addWorksheet('Phân Tích & Đề Xuất', {
    views: [{ showGridLines: true }],
  })

  sheet2.columns = [
    { key: 'cat', width: 26 },
    { key: 'indicator', width: 32 },
    { key: 'val', width: 22 },
    { key: 'status', width: 20 },
    { key: 'desc', width: 50 },
  ]

  const pTitle = sheet2.addRow(['BÁO CÁO PHÂN TÍCH HIỆU SUẤT & ĐỀ XUẤT TỐI ƯU RENDER'])
  pTitle.height = 28
  pTitle.getCell(1).font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF1E3A8A' } }
  sheet2.addRow([`Thời điểm xuất báo cáo: ${formatDateTime(new Date())}`])
  sheet2.addRow([])

  const pHeaders = sheet2.addRow(['Hạng Mục', 'Chỉ Số Đo Lường', 'Giá Trị', 'Đánh Giá', 'Đề Xuất & Nhận Xét'])
  pHeaders.height = 24
  pHeaders.eachCell((c) => {
    c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    }
    c.alignment = { vertical: 'middle', horizontal: 'center' }
  })

  // Phân tích chỉ số
  const analysisData = [
    ['Tổng quan', 'Số file hoàn thành', `${stats.completedCount} / ${records.length}`, stats.completedCount === records.length ? '100% Hoàn tất' : 'Đang tiến hành', 'Theo dõi tiến độ theo batch.'],
    ['Thời gian', 'Thời gian TB mỗi file', `${stats.avgTime?.toFixed(1) || 0} giây`, stats.avgTime < 60 ? 'Tốc độ tốt' : 'Thời gian cao', stats.avgTime > 90 ? 'Cần cân nhắc render proxy hoặc giảm resolution preview.' : 'Tốc độ render nằm trong ngưỡng tối ưu.'],
    ['Thời gian', 'File nhanh nhất', `${stats.minTime ?? 0} giây`, 'Benchmark', 'Cấu hình hoặc footage nhẹ nhất trong đợt render.'],
    ['Thời gian', 'File chậm nhất', `${stats.maxTime ?? 0} giây`, stats.maxTime > (stats.avgTime * 1.5) ? 'Bottleneck' : 'Bình thường', stats.maxTime > (stats.avgTime * 1.5) ? 'Kiểm tra file này có plugin nặng, hiệu ứng 3D, Motion Blur hoặc 4K bitrate.' : 'Mức chênh lệch ổn định.'],
    ['Độ ổn định', 'Tỉ lệ biến thiên (Max/Min)', stats.minTime > 0 ? `${(stats.maxTime / stats.minTime).toFixed(2)}x` : 'N/A', (stats.maxTime / stats.minTime) > 2 ? 'Biến động lớn' : 'Rất ổn định', (stats.maxTime / stats.minTime) > 2 ? 'Có sự phân hóa lớn giữa các file, cần chia nhóm nhẹ/nặng để render hợp lý.' : 'Quy trình đồng đều.'],
    ['Tổng tải', 'Tổng thời gian tích lũy', `${stats.totalTime?.toFixed(1) || 0} giây (~${(stats.totalTime / 60).toFixed(1)} phút)`, 'Khối lượng công việc', 'Căn cứ tính toán chi phí render farm hoặc thời gian bàn giao sản phẩm.'],
  ]

  analysisData.forEach((row) => {
    const r = sheet2.addRow(row)
    r.height = 20
    r.eachCell((c) => {
      c.font = { name: 'Segoe UI', size: 9 }
      c.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      }
    })
  })

  // Đề xuất cụ thể từ suggestions
  sheet2.addRow([])
  const sugHead = sheet2.addRow(['DANH SÁCH ĐỀ XUẤT CỤ THỂ DỰA TRÊN DỮ LIỆU THỰC TẾ'])
  sugHead.height = 22
  sugHead.getCell(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF047857' } }

  if (suggestions && suggestions.length > 0) {
    suggestions.forEach((sug, idx) => {
      const sRow = sheet2.addRow([`${idx + 1}. ${sug.title}`, '', '', sug.level.toUpperCase(), sug.content])
      sRow.height = 22
      sRow.getCell(1).font = { name: 'Segoe UI', size: 10, bold: true }
      sRow.getCell(4).font = {
        name: 'Segoe UI',
        size: 9,
        bold: true,
        color: {
          argb: sug.level === 'warning' ? 'FFDC2626' : sug.level === 'tip' ? 'FF2563EB' : 'FF059669',
        },
      }
      sRow.getCell(5).font = { name: 'Segoe UI', size: 9 }
    })
  }

  // Tải file về máy người dùng
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  const dateStr = new Date().toISOString().slice(0, 10)
  anchor.download = `HK_RENDER_TIME_LOGGER_${dateStr}.xlsx`
  anchor.click()
  window.URL.revokeObjectURL(url)
}
