# Guard Bot

Discord sunucuları için Node.js ve discord.js ile hazırlanmış güvenlik botu.

## Özellikler

- Anti-raid: kısa sürede çok sayıda katılımda yeni girişleri geçici olarak kilitler
- Anti-spam: mesaj hızını takip eder, spam yapan üyeye timeout uygular
- Link koruması: izin verilmeyen bağlantıları siler
- Mention koruması: toplu kullanıcı/rol mention'larını engeller
- Anti-nuke: kanal, rol, ban ve kick gibi kritik işlemlerde saldırı tespiti
- Whitelist desteği
- Yasaklı kelime filtresi
- Geçici lockdown ve unlock
- `/guard` slash komutları
- Windows için `kurulum.bat` ve `başlat.bat`
- Sunucu ayarlarını `data/guilds.json` içinde saklar

## Kurulum

1. Bilgisayara [Node.js 18.17+](https://nodejs.org/) kur.
2. Discord Developer Portal'da yeni bir application ve bot oluştur.
3. Bot ayarlarında **Server Members Intent** ve **Message Content Intent** seçeneklerini aç.
4. `kurulum.bat` dosyasını çalıştır.
5. Oluşan `.env` dosyasına şu alanları yaz:

```env
DISCORD_TOKEN=bot_token_buraya
CLIENT_ID=application_id_buraya
GUILD_ID=test_sunucusu_id_buraya
OWNER_IDS=senin_discord_id
```

6. Botu sunucuna şu yetkilerle davet et:
   - `bot`
   - `applications.commands`
   - Administrator (kolay kurulum için önerilir; minimum yetkilerle de çalışabilir)
7. `başlat.bat` dosyasını çalıştır.
8. Sunucuda `/guard setup` komutunu çalıştır.

> `GUILD_ID` boş bırakılırsa komutlar global yüklenir. Global slash komutların görünmesi birkaç dakika sürebilir.

## Komutlar

- `/guard setup` — `Guard Quarantine` rolünü oluşturur
- `/guard status` — aktif korumaları gösterir
- `/guard lockdown dakika` — yeni katılım kilidi başlatır
- `/guard unlock` — yeni katılım kilidini kaldırır
- `/guard toggle koruma aktif` — koruma açar/kapatır
- `/guard whitelist add/remove/list kullanici` — whitelist yönetir

## Önemli notlar

- `.env` dosyasını GitHub'a yükleme; bu dosya `.gitignore` ile korunur.
- Anti-nuke ve anti-raid işlemleri botun rol hiyerarşisine ve Discord yetkilerine bağlıdır.
- Bot rolünü koruma uygulanacak üyelerin üzerinde tut.
- Anti-nuke için botta `View Audit Log` yetkisi bulunmalıdır.
- Anti-raid ve lockdown mesaj kanallarını kilitlemez; yeni katılımları kick/timeout ile sınırlar.
- Ayarları değiştirmek için `config.json` içindeki varsayılanları düzenleyebilir veya slash komutlarını kullanabilirsin.

## Geliştirici kontrolleri

```bash
npm run check
npm test
npm audit --omit=dev
```