// URL Web App - Ganti dengan URL Anda
const WEB_APP_URL = 'https://sheetdb.io/api/v1/x9zivzvkymzuy';

// Variabel untuk menyimpan data asli
let allAttendanceData = [];
let html5QrcodeScanner = null;
let deferredPrompt = null;

// ==================== FUNGSI UTAMA ====================

function openTab(tabName) {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => tab.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));

  document.querySelector(`.tab[onclick="openTab('${tabName}')"]`).classList.add('active');
  document.getElementById(tabName).classList.add('active');

  if (tabName === 'report') {
    loadReport();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function catatAksi(aksi) {
  const karyawan = document.getElementById("karyawan").value.trim();
  const now = new Date();
  const tanggal = formatDate(now);
  const waktu = formatTime(now);

  const statusDiv = document.getElementById("status");

  statusDiv.className = '';
  statusDiv.innerHTML = '';

  if (!karyawan) {
    showError(statusDiv, '⚠️ Nama karyawan tidak boleh kosong!');
    return;
  }

  showLoading(statusDiv, '⏳ Mengirim data...');

  try {
    const payload = {
      karyawan: karyawan,
      aksi: aksi,
      tanggal: tanggal,
      waktu: waktu
    };

    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: [payload] })
    });

    const result = await response.json();

    showSuccess(statusDiv, `✅ Data berhasil dikirim!`);
    document.getElementById("karyawan").value = '';

    if (document.getElementById('report').classList.contains('active')) {
      setTimeout(loadReport, 1000);
    }
  } catch (error) {
    console.error('Error:', error);
    showError(statusDiv, `❌ Gagal mengirim data: ${error.message}`);
  }
}

async function loadReport() {
  const loadingDiv = document.getElementById('loadingReport');
  const reportData = document.getElementById('reportData');
  const noDataMessage = document.getElementById('noDataMessage');

  loadingDiv.style.display = 'block';
  reportData.innerHTML = '';
  noDataMessage.style.display = 'none';

  try {
    const response = await fetch(WEB_APP_URL);

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(text || 'Response bukan format JSON');
    }

    if (!response.ok) {
      throw new Error(`Gagal memuat data (Status: ${response.status})`);
    }

    const data = await response.json();
    loadingDiv.style.display = 'none';
    allAttendanceData = data || [];

    if (allAttendanceData.length > 0) {
      renderReportData(allAttendanceData);
    } else {
      showNoData();
    }
  } catch (error) {
    console.error('Error:', error);
    loadingDiv.style.display = 'none';
    showNoData(`Gagal memuat data: ${error.message}`);
  }
}

function startQRScanner() {
  const qrReader = document.getElementById('qr-reader');
  const startButton = document.getElementById('startScanner');
  const statusDiv = document.getElementById('status');

  if (!(window.html5Qrcode && Html5QrcodeScanner)) {
    showError(statusDiv, 'Browser tidak mendukung QR Scanner. Gunakan Chrome atau Safari terbaru.');
    return;
  }

  startButton.style.display = 'none';
  qrReader.style.display = 'block';

  const config = {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0,
    disableFlip: false,
    supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
  };

  html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", config, false);

  Html5Qrcode.getCameras().then(cameras => {
    if (!cameras || cameras.length === 0) {
      throw new Error('Tidak ditemukan kamera');
    }

    let cameraId = cameras[0].id;

    if (cameras.length > 1) {
      const backCamera = cameras.find(cam =>
        cam.label.toLowerCase().includes('back') ||
        cam.label.includes('2')
      );
      if (backCamera) cameraId = backCamera.id;
    }

    return html5QrcodeScanner.start(
      cameraId,
      config,
      qrCodeSuccessCallback,
      qrCodeErrorCallback
    );
  }).catch(err => {
    console.error("Camera Error:", err);
    showError(statusDiv, 'Gagal mengakses kamera. Pastikan Anda memberikan izin kamera.');
    resetQRScanner();
  });
}

function qrCodeSuccessCallback(decodedText) {
  const parts = decodedText.split('|');
  const namaKaryawan = parts[0] || decodedText;
  document.getElementById('karyawan').value = namaKaryawan;
  resetQRScanner();
  const statusDiv = document.getElementById("status");
  showSuccess(statusDiv, `✅ Berhasil memindai QR Code: ${namaKaryawan}`);
  document.querySelector('.btn-primary').focus();
}

function qrCodeErrorCallback(error) {
  console.error('QR Scan error:', error);
}

function resetQRScanner() {
  if (html5QrcodeScanner) {
    html5QrcodeScanner.clear().catch(error => {
      console.error("Failed to clear qr scanner", error);
    });
    html5QrcodeScanner = null;
  }
  document.getElementById('qr-reader').style.display = 'none';
  document.getElementById('startScanner').style.display = 'inline-block';
}

function renderReportData(data) {
  const reportData = document.getElementById('reportData');
  const noDataMessage = document.getElementById('noDataMessage');

  reportData.innerHTML = '';

  if (data.length === 0) {
    showNoData();
    return;
  }

  noDataMessage.style.display = 'none';

  data.forEach((item, index) => {
    const row = document.createElement('tr');
    const datetime = item.waktu ? item.waktu.split(' ') : ['', ''];
    const tanggal = datetime[0] || '-';
    const waktu = datetime[1] || '-';

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.karyawan || '-'}</td>
      <td>${item.aksi || '-'}</td>
      <td>${tanggal}</td>
      <td>${waktu}</td>
    `;
    reportData.appendChild(row);
  });
}

function filterLaporan() {
  const filterNama = document.getElementById('filterNama').value.toLowerCase();
  const filterAksi = document.getElementById('filterAksi').value;
  const filterTanggal = document.getElementById('filterTanggal').value;

  const filteredData = allAttendanceData.filter(item => {
    const namaMatch = item.karyawan?.toLowerCase().includes(filterNama) || false;
    const aksiMatch = !filterAksi || item.aksi === filterAksi;

    let tanggalMatch = true;
    if (filterTanggal) {
      try {
        const itemDate = item.waktu ? item.waktu.split(' ')[0] : '';
        const formattedItemDate = formatDateForComparison(itemDate);
        tanggalMatch = formattedItemDate === filterTanggal;
      } catch (e) {
        tanggalMatch = false;
      }
    }

    return namaMatch && aksiMatch && tanggalMatch;
  });

  renderReportData(filteredData);
}

function formatDateForComparison(dateString) {
  if (!dateString) return '';
  const parts = dateString.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return '';
}

function resetFilters() {
  document.getElementById('filterNama').value = '';
  document.getElementById('filterAksi').selectedIndex = 0;
  document.getElementById('filterTanggal').value = '';
  renderReportData(allAttendanceData);
}

function exportToExcel() {
  if (allAttendanceData.length === 0) {
    showError(document.getElementById('status'), 'Tidak ada data untuk diexport');
    return;
  }

  let csvContent = "No,Nama Karyawan,Aksi,Tanggal,Waktu\n";
  allAttendanceData.forEach((item, index) => {
    const datetime = item.waktu ? item.waktu.split(' ') : ['', ''];
    csvContent += `${index + 1},${item.karyawan || ''},${item.aksi || ''},${datetime[0] || ''},${datetime[1] || ''}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `absensi_karyawan_${formatDate(new Date())}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function formatDate(date) {
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatTime(date) {
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function showLoading(element, message) {
  element.className = '';
  element.classList.add('loading');
  element.innerHTML = message;
}

function showSuccess(element, message) {
  element.className = '';
  element.classList.add('success');
  element.innerHTML = message;
}

function showError(element, message) {
  element.className = '';
  element.classList.add('error');
  element.innerHTML = message;
}

function showNoData(message) {
  const noDataMessage = document.getElementById('noDataMessage');
  const reportData = document.getElementById('reportData');
  reportData.innerHTML = '<tr><td colspan="5" class="no-data">' + (message || 'Tidak ada data absensi') + '</td></tr>';
  noDataMessage.style.display = 'block';
  noDataMessage.textContent = message || 'Tidak ada data yang sesuai dengan filter';
}

function handleMobileFeatures() {
  const inputs = document.querySelectorAll('input[type="text"], input[type="date"]');
  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      setTimeout(() => {
        const target = document.activeElement;
        if (target && typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
      }, 300);
    });
  });

  let viewportHeight = window.innerHeight;
  window.addEventListener('resize', () => {
    if (Math.abs(viewportHeight - window.innerHeight) > 100) {
      viewportHeight = window.innerHeight;
      const activeElement = document.activeElement;
      if (activeElement && activeElement.tagName === 'INPUT') {
        activeElement.scrollIntoView({ block: 'center' });
      }
    }
  });
}

function setupPWAInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!document.getElementById('installBtn')) {
      const installBtn = document.createElement('button');
      installBtn.id = 'installBtn';
      installBtn.className = 'btn-primary';
      installBtn.style.margin = '10px auto';
      installBtn.style.display = 'block';
      installBtn.textContent = 'Install Aplikasi';
      installBtn.onclick = () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
              console.log('User accepted install');
            }
            deferredPrompt = null;
          });
        }
      };
      document.querySelector('.card').prepend(installBtn);
    }
  });

  window.addEventListener('appinstalled', () => {
    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
      installBtn.style.display = 'none';
    }
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(() => {
        console.log('ServiceWorker registration successful');
      }).catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', function () {
  if (window.location.hash === '#report') {
    openTab('report');
  }
  document.getElementById('karyawan').focus();
  handleMobileFeatures();
  setupPWAInstallPrompt();
  registerServiceWorker();
  document.getElementById('startScanner').addEventListener('click', startQRScanner);
});
