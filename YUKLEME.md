# GitHub'a yükleme

Bu proje `wordglass` adıyla, **herkese açık (public)** bir GitHub deposuna hazırlandı.

- sürüm: `1.7.0`
- proje klasörü: `wordglass`
- yaklaşık boyut: 7 MB (PDF.js dosyaları dahil)
- lisans: proje kodu MIT, `pdfjs/` Apache-2.0 (bkz. `LICENSE` ve `pdfjs/LICENSE`)

> Bu klasörde henüz bir `.git` deposu yok. Aşağıdaki iki yoldan birini seçebilirsin.

## 1. GitHub web arayüzüyle yükleme (kurulum gerekmez)

1. GitHub'da **New repository** aç.
2. Repository name: `wordglass`
3. Visibility: **Public**
4. **README, .gitignore veya license ekleme**; depo boş kalsın.
5. Boş depo sayfasında **uploading an existing file** bağlantısına tıkla.
6. Windows Gezgini'nde `wordglass` proje klasörünü aç.
7. Klasörün **içindeki** dosya ve klasörlerin tamamını seçip tarayıcıdaki yükleme alanına sürükle.
   - `pdfjs` klasörünü de mutlaka ekle.
   - `.gitignore`, `.gitattributes` ve `LICENSE` gibi nokta ile başlayan dosyaları da ekle.
   - Bu dosyalar görünmüyorsa Gezgin'de `Görünüm → Gizli öğeler` seçeneğini aç.
8. Commit message: `wordglass 1.7.0`
9. **Commit changes** düğmesine bas.

Not: `pdfjs/` içinde 290 dosya var. Web yükleme takılırsa aşağıdaki Git yöntemi daha güvenilirdir.

### .gitignore web yüklemesinde görünmezse

Depoda **Add file → Create new file** ile `.gitignore` adında dosya oluştur ve buradaki `.gitignore` içeriğini yapıştır. Aynı şeyi `.gitattributes` için de yapabilirsin.

## 2. Git ile yükleme (önerilen)

Git kurulu değilse PowerShell'de:

```powershell
winget install --id Git.Git -e --source winget
```

Yeni bir PowerShell açıp:

```powershell
cd "C:\yol\wordglass"

git init -b main

git config user.name "Adın Soyadın"
git config user.email "github-eposta-adresin"

git add .
git commit -m "wordglass 1.7.0"
```

GitHub'da boş `wordglass` deposunu oluşturduktan sonra:

```powershell
git remote add origin https://github.com/KULLANICI_ADIN/wordglass.git
git push -u origin main
```

İlk push'ta Git Credential Manager tarayıcıda GitHub girişi isteyebilir.

Depoyu oluştururken README eklediysen önce şunu çalıştır:

```powershell
git pull --rebase origin main
git push -u origin main
```

## Repo ayarları

Önerilen açıklama:

> Chrome MV3 extension: İngilizce seçimleri Türkçeye çevirir, kelime kaydeder ve aralıklı tekrar yaptırır. PDF.js tabanlı PDF desteği içerir.

Önerilen konular (topics):

`chrome-extension`, `manifest-v3`, `pdfjs`, `translation`, `turkish`, `language-learning`, `spaced-repetition`

## Yüklemeden önce kontrol

- [ ] Repo **Public** seçildi.
- [ ] `pdfjs/` klasörü eksiksiz yüklendi.
- [ ] `pdfjs/LICENSE` yüklendi.
- [ ] `manifest.json` sürümü `1.7.0`.
- [ ] `LICENSE` ve `README.md` yüklendi.
- [ ] `.gitignore` yüklendi.
- [ ] Deepl/LibreTranslate anahtarları boş; gerçek anahtar commit edilmedi.
- [ ] Yerel Chrome test profilleri (`chrome-*`) yüklenmedi.

## Notlar

- PDF'ler varsayılan olarak wordglass görüntüleyicide açılır; ayarlardan Chrome'un kendi görüntüleyicisi seçilebilir.
- Taranmış PDF'lerde metin katmanı yoksa seçim yapılamaz.
- Yerel `file://` PDF'leri için Chrome'da **Dosya URL'lerine erişime izin ver** açık olmalıdır.
- Bu depo bir Chrome Web Store paketi değil, kaynak koddur; yükleme için `manifest.json` ve tüm klasör yapısı korunmalıdır.
