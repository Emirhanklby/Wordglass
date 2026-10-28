# wordglass

ingilizce kelime veya cümle seç, panelde türkçesini gör, deftere ekle, tekrar et. web sayfaları ve metin katmanı olan pdf'ler desteklenir.

## kurulum

1. `chrome://extensions` aç, geliştirici modu aç (chrome 125+)
2. `paketlenmemiş öğe yükle` → proje klasörü (`wordglass`)
3. kurulunca tanıtım sekmesi açılır
4. ingilizce bir sayfada kelime veya cümle seç
5. uzantı ikonuna tıkla: defter popup olarak açılır

## panel

- tek sütun, sadece türkçe karşılık; ingilizce kaynak ve tanım gösterilmez
- kelimede tür rozeti: isim, sıfat, fiil, zarf…
- yalnızca ingilizce metinler çevrilir; türkçe ve diğer dillerde panel açılmaz (ayarlardan kapatılabilir)
- animasyonlu giriş: kayma, odaklanma, karşılığın gecikmeli belirmesi
- çeviri hazırlanırken `çevriliyor` + `vazgeç`
- hata olursa `tekrar dene` ve `ayarlar` düğmeleri
- `kopyala` karşılığı panoya alır
- `kaydet` sonrası 9 sn `geri al` (yanlış kayıt için)
- türkçe alanında kaydırma yok: panel yükselir, çok uzun metinde kompakt moda geçer (yazı küçülür, boşluklar daralır)
- seçim 1500 karaktere kadar çevrilir
- tek tık kelime çevirmez; çevirmek için metni seçmen gerekir
- `‹` önceki aramaya döner, `×` veya `esc` kapatır
- panelin dışına sol tık veya `esc` kapatır (panel içine tıklamak kapatmaz)
- genişlik seçime uyar: kelimede 620px, cümlede cümlenin genişliği (en fazla 980px)
- başlığından sürüklenebilir; pencere küçülünce konum otomatik içeri alınır
- `alt+w` aç/kapat, `esc` kapat
- bağlantılar normal şekilde açılır; çeviri için bağlantıdaki metni seç

## pdf

- pdf'ler varsayılan olarak wordglass görüntüleyicide açılır; ayarlardan `chrome'un kendi görüntüleyicisi` seçilebilir
- sayfa gezinme, zoom, `orijinal` bağlantısı ve metin seçimi pdf görüntüleyicide çalışır; seçim aynı cam paneli açar
- yalnızca metin katmanı olan pdf'lerde seçim yapılabilir; taranmış görüntü pdf'lerinde metin yoktur
- pdf bağlantısı indirme (`content-disposition: attachment`) olarak geliyorsa görüntüleyici açılmaz, indirme korunur
- `orijinal` chrome'un pdf görüntüleyicisini `wg-native=1` ile açar; otomatik yönlendirme tekrar devreye girmez
- yerel `file://` pdf'leri için chrome uzantı ayrıntılarından `dosya url'lerine erişime izin ver` açık olmalıdır
- kendi görüntüleyici kapatıldığında pdf'ler chrome'da açılır; mevcut pdf sayfasını yenileyerek ayarı uygulayabilirsin

## dil filtresi

- varsayılan olarak yalnızca ingilizce metinler çevrilir
- tek kelimede yaygın ingilizce kelime listesi + sözlük kontrolü kullanılır; türkçe karakterler, fonksiyon kelimeleri ve yaygın türkçe kelimeler elenir
- cümlelerde dil algılama ve kelime oranı birlikte değerlendirilir
- türkçe/başka dildeki kelime ve cümlelerde panel açılmaz; ilk seferde kısa bir bilgi gösterilir
- bağlantılar dil filtresinden bağımsız olarak normal şekilde açılır
- ayarlardan `tüm diller` seçilerek filtre kapatılabilir

## defter (popup)

- ikona tıklayınca açılır, ayrı pencere açmaz
- üstte aç/kapat anahtarı; kapalıyken sayfalarda metin seçimi çeviri yapmaz
- toplam kelime ve tekrar bekleyen sayısı; ikonda bekleyen sayısı badge olarak görünür
- `kaydedilen kelimeler`: kart defteri. üstte ingilizce kelime + tür rozeti, altında büyük türkçe karşılık
- her kartta 6 noktalı tekrar seviyesi ve `yeni / şimdi / yarın / 3g sonra` etiketi
- `yeni` sıralamasında `bugün / dün / bu hafta / daha eski` bölümleri
- kart eylemleri hover veya klavye odağında: kopyala, sil
- satırlar sırayla belirir; `enter` kopyalar, `delete` siler (9 sn `geri al` ile)
- arama kelime, çeviri ve türde; türkçe karakterlere duyarsız (`esik` → `eşik`, `sifat` → `sıfat`)
- sıralama: `yeni`, `a-z`, `tekrar` (sadece zamanı gelenleri gösterir)
- `tekrar`: leitner turu (1-3-7-21-45-90 gün), `1/2/3` kısayolları, her cevap anında kaydedilir
- turda `yarına at` ve `defterden sil` var; kutu seviyesi görünür
- `llm'e aktar` / `kopyala` / `indir`: tek format
- `sekmede aç`: aynı arayüzü geniş sekmede açar

## llm formatı

tek biçim: markdown tablo + kısa yönerge. başka bir modele doğrudan yapıştırılabilir.

```
# wordglass kelime listesi

Aşağıdaki İngilizce-Türkçe kelime listesini kullanarak çalışma yap.
Her kelime için kısa bir tanım ve bir örnek cümle ver; zor olanları işaretle.
Tür bilgisini (isim, sıfat, fiil…) cümle kurarken kullan.

| ingilizce | türkçe | tür |
```

## sağ tık

metin seç → sağ tık → `seçili metni çevir`. panel aynı şekilde açılır.

## ayarlar

`chrome://extensions` → wordglass → ayrıntılar → uzantı seçenekleri

- canlı panel önizlemesi (saydamlık anında yansır)
- saydamlık yüzdesi görünür
- dil filtresi: `sadece ingilizce` (varsayılan) veya `tüm diller`
- pdf görüntüleyici: `wordglass` (varsayılan) veya `chrome'un kendi görüntüleyicisi`
- çeviri kaynağı: otomatik / google / mymemory / deepl / libretranslate
- bağlantı testi: sağlayıcı, süre ve sonucu gösterir
- deepl `:fx` ve libre `https://` doğrulaması satır içinde uyarır
- panel tarafı, otomatik kapanma
- ayarları sıfırla, ipucu ve panel konumunu sıfırla, kelimeleri sil

## çeviri kaynağı

- `otomatik`: google → mymemory → deepl anahtarı varsa deepl
- anahtarsız uçlar IP bazlı kota uygular, 429'da panelde "kota doldu" yazar
- kalıcı çözüm: deepl ücretsiz anahtarı (`:fx` ile biter, 500k karakter/ay)

## yapı

```
.gitignore       GitHub dışlama kuralları
.gitattributes   satır sonu ve binary ayarları
manifest.json    mv3, ikonlar, izinler, popup, fontlar
background.js    çeviri + sözlük, dil filtresi, badge, sağ tık, tanıtım
en-words.js      ingilizce kelime listesi + türkçe kelimeler (arka plan)
content.js       metin seçimi, panel, animasyon, sürükleme, vurgulama
app.html/js      popup: defter, arama, sıralama, tek format dışa aktarma
review.html/js   leitner tekrar turu
options.html/js  ayarlar, önizleme, doğrulama, test
welcome.html/js  kurulum sonrası tanıtım
pdf-viewer.html  pdf.js tabanlı görüntüleyici kabuğu
pdf-viewer.js    pdf sayfaları, metin katmanı, sayfa/zoom, seçim paneli köprüsü
pdfjs/           pdf.js 6.4.299 legacy build + cmaps, fontlar, wasm, lisans
theme.css        ortak tema, nunito, odak halkası
fonts/           nunito latin + latin-ext (woff2)
icons/           16/32/48/128 png
YUKLEME.md       GitHub'a yükleme ve repo ayarları
CHANGELOG.md     sürüm notları
LICENSE          proje kodu için MIT lisansı
```

## veri

- ayarlar: `chrome.storage.sync`
- kelimeler, panel konumu, ipucu durumu, aç/kapat: `chrome.storage.local`
- kayıtta yalnızca alan adı tutulur, tam url tutulmaz
- kelime türü türkçe saklanır; eski ingilizce tür kayıtları görüntülenirken çevrilir

## sınırlar

- canvas, cross-origin iframe ve kapalı shadow DOM içinde yakalama yok
- pdf'ler yalnızca sekmede açıldığında otomatik wordglass görüntüleyiciye alınır; sayfaya gömülü pdf'ler (iframe/embed) için görüntüleyici açılmaz
- taranmış/görüntü tabanlı pdf'lerde metin katmanı olmadığı için seçim yapılamaz
- pdf.js görüntüleyici pdf formlarını/etkileşimli alanları chrome'un yerleşik görüntüleyicisi kadar kapsamaz
- parola korumalı veya doğrudan indirmeye zorlayan sitelerde görüntüleyici hata verebilir; `orijinal` chrome'un görüntüleyicisine geçer
- google/mymemory resmî olmayan uçlar, yoğun kullanımda kota döner
- vurgulama büyük sayfalarda ilk 4000 metin düğümüyle sınırlı
- tam ekran (fullscreen api) sırasında panel görünmez
- sesli telaffuz yok

## lisans

- wordglass kaynak kodu MIT lisansı altındadır; metin `LICENSE` içindedir.
- pdf.js, mozilla tarafından apache-2.0 lisansıyla dağıtılır; lisans metni `pdfjs/LICENSE` içindedir.

## github

yükleme adımları ve repo ayarları için `YUKLEME.md` dosyasına bak.
