# değişiklikler

## 1.7.0 — 2026-10-28

- PDF.js tabanlı yerel PDF görüntüleyici eklendi (`pdf-viewer.html`, `pdf-viewer.js`, `pdfjs/`).
- PDF'ler `application/pdf` içerik türüne göre otomatik olarak wordglass görüntüleyicide açılıyor.
- PDF içinde metin seçimi, Türkçe çeviri paneli, kelime türü, kaydetme, sağ tık çevirisi, sayfa gezinme ve zoom desteği eklendi.
- `orijinal` bağlantısı Chrome'un PDF görüntüleyicisini `wg-native=1` ile açıyor; otomatik yönlendirme döngüsü engellendi.
- İndirme olarak gelen PDF'lerde (`content-disposition: attachment`) indirme davranışı korunuyor.
- Ayarlara `pdf görüntüleyici` seçeneği eklendi: `wordglass` veya `chrome'un kendi görüntüleyicisi`.
- PDF'lerden kaydedilen kelimelerde kaynak alan adı korunuyor.
- PDF.js lisansı ve kullanım notları README'ye eklendi.
- Minimum Chrome sürümü `125` olarak güncellendi.
