export const NARRATION_GUIDES = Object.freeze({
  aes: Object.freeze([
    'AES-256-GCM is recommended for password-based messages. It uses your access key to derive an encryption key and authenticates the encrypted message, so a wrong key or altered token is rejected.',
    'To encrypt: enter a long, unique access key and your message, then select Encrypt message. Share the resulting CT2 token and the access key separately.',
    'To decrypt: paste the complete CT2 token into the message field, enter the same access key, and select Decrypt message. CT1 tokens from older versions are also supported. For files, use the file controls; file encryption uses AES-GCM regardless of the selected text method.'
  ]),
  cbc: Object.freeze([
    'AES-256-CBC with HMAC is a compatibility method. It encrypts the message and adds a separate authentication check; the app verifies that check before decrypting. Prefer AES-GCM for new messages.',
    'To encrypt: enter a long, unique access key and your message, then select Encrypt message. Share the CBC1 token and the access key separately.',
    'To decrypt: paste the complete CBC1 token, enter the same access key, and select Decrypt message. Modified data or a wrong key is rejected. File encryption still uses AES-GCM.'
  ]),
  rsa: Object.freeze([
    'RSA mode is hybrid encryption, not direct RSA encryption of the whole message. A random AES-256-GCM key encrypts the message, and RSA-OAEP with SHA-256 protects that temporary key. It uses the RSA1 format.',
    'To encrypt: generate a key pair for yourself or paste the recipient public key in SPKI PEM format. Verify its SHA-256 fingerprint with the recipient through a trusted separate channel, enter your message, then select Encrypt message.',
    'Share the RSA1 token with the recipient. Do not share a private key. To decrypt, the recipient pastes the token, provides the matching private key in the private-key field, and selects Decrypt message. The access-key field is not used for RSA text messages.'
  ]),
  hybrid: Object.freeze([
    'Hybrid AES-256-GCM plus RSA-OAEP is the recommended public-key method. It uses a fresh random AES-256-GCM key for the message and RSA-OAEP with SHA-256 to wrap that key. It uses the same RSA1 format as the other RSA selector.',
    'To encrypt: generate a key pair for yourself or paste the recipient public key in SPKI PEM format. Verify its SHA-256 fingerprint through a trusted separate channel, enter your message, then select Encrypt message.',
    'Share the RSA1 token with the recipient, never the private key. To decrypt, the recipient pastes the token, supplies the matching private key, and selects Decrypt message. The access-key field is not used for RSA text messages.'
  ]),
  'rsa-direct': Object.freeze([
    'Direct RSA-OAEP with SHA-256 encrypts the message itself, without AES. With the default 2048-bit key, the maximum is 190 UTF-8 bytes. Use hybrid RSA for longer messages. Direct RSA tokens use the RSA2 format.',
    'To encrypt a short message, paste or generate the recipient public key, verify its SHA-256 fingerprint through a trusted separate channel, enter no more than 190 UTF-8 bytes, and select Encrypt message. Share the RSA2 token; never share the private key.',
    'To decrypt an RSA2 token, the recipient enters the matching private key and selects Decrypt message. The access-key field is not used. For longer messages, use hybrid RSA.'
  ]),
  legacy: Object.freeze([
    'Grumpy v2 encryption and decryption are available for legacy compatibility, but the cipher is cryptographically insecure. It does not provide reliable confidentiality or tamper detection. Never use it to protect sensitive information; prefer AES-256-GCM.',
    'For legacy compatibility or testing: select this method, enter a non-empty key, enter the message and select Encrypt message, or paste existing ciphertext and select Decrypt message. This uses the old format and is not safe for new sensitive messages.',
    'For new messages, use AES-256-GCM or a verified RSA hybrid method. After decrypting old Grumpy v2 text, use Prepare AES-256-GCM migration to re-encrypt it securely. File encryption always uses AES-GCM.'
  ])
});

export const NARRATION_LANGUAGES = Object.freeze({
  en: Object.freeze({ label: 'English', speechTag: 'en-GB' }),
  yo: Object.freeze({ label: 'Yoruba', speechTag: 'yo-NG' }),
  ig: Object.freeze({ label: 'Igbo', speechTag: 'ig-NG' }),
  ha: Object.freeze({ label: 'Hausa', speechTag: 'ha-NG' }),
  pcm: Object.freeze({ label: 'Nigerian Pidgin', speechTag: 'en-NG' }),
  es: Object.freeze({ label: 'Español', speechTag: 'es-ES' }),
  fr: Object.freeze({ label: 'Français', speechTag: 'fr-FR' })
});

const DIRECT_RSA_LOCALIZED_GUIDES = Object.freeze({
  yo: Object.freeze([
    'Ọ̀nà RSA tààrà ń lo RSA-OAEP pẹ̀lú SHA-256 láti fi ọ̀rọ̀ pamọ́; kò lo AES. Pẹ̀lú kọ́kọ́rọ́ 2048-bit, ọ̀rọ̀ kò gbọdọ̀ ju báítì 190 lọ. Ààmì rẹ̀ ni RSA2.',
    'Lo kọ́kọ́rọ́ gbogbogbò ẹni tó máa gba ọ̀rọ̀ náà, kí o sì ṣàyẹ̀wò ààmì SHA-256 rẹ̀ ní ọ̀nà mìíràn tí o gbẹ́kẹ̀ lé. Tẹ ọ̀rọ̀ kúkúrú tí kò ju báítì 190 lọ, kí o sì yan bọ́tìnì fífi ọ̀rọ̀ pamọ́. Rán ààmì RSA2 tó jáde; má ṣe rán kọ́kọ́rọ́ àṣírí.',
    'Láti tú ààmì RSA2, ẹni tó ní kọ́kọ́rọ́ àṣírí tó bá kọ́kọ́rọ́ gbogbogbò mu ni yóò fi ààmì àti kọ́kọ́rọ́ náà sínú àwọn ààyè wọn, kí ó sì yan bọ́tìnì ṣíṣí ọ̀rọ̀. Fún ọ̀rọ̀ tó ju báítì 190 lọ, lo ọ̀nà RSA àpapọ̀.'
  ]),
  ig: Object.freeze([
    'Usoro RSA kpọmkwem na-eji RSA-OAEP na SHA-256 ezoro ozi n’onwe ya; ọ naghị eji AES. Maka igodo 2048-bit, ozi agaghị agafe byte 190. Akara ya bụ RSA2.',
    'Jiri igodo ọha onye ga-enweta ozi ahụ, ma nyochaa akara mkpisiaka SHA-256 ya site n’ụzọ ọzọ ị tụkwasịrị obi. Tinye ozi dị mkpụmkpụ nke na-erughị byte 190, wee họrọ bọtịnụ izochi ozi. Zipu akara RSA2 e mepụtara; ezipụla igodo nzuzo.',
    'Imeghe akara RSA2 bụ naanị onye nwere igodo nzuzo kwekọrọ na igodo ọha nwere ike ime. Tinye akara na igodo nzuzo n’ebe ha kwesịrị, wee họrọ bọtịnụ imeghe ozi. Maka ozi karịrị byte 190, jiri usoro RSA ngwakọta.'
  ]),
  ha: Object.freeze([
    'Hanyar RSA kai tsaye tana amfani da RSA-OAEP tare da SHA-256 don ɓoye saƙon kansa, ba tare da AES ba. Da maɓallin 2048-bit, saƙo bai kamata ya wuce byte 190 ba. Alamar sa ita ce RSA2.',
    'Yi amfani da maɓallin jama’a na wanda zai karɓi saƙon, kuma ka tabbatar da tambarin SHA-256 ta wata amintacciyar hanya. Shigar da saƙo gajere wanda bai wuce byte 190 ba, sannan zaɓi maɓallin ɓoye saƙo. A aika da alamar RSA2; kada a aika da maɓallin sirri.',
    'Mai maɓallin sirri da ya dace da maɓallin jama’a ne kawai zai iya buɗe alamar RSA2. Manna alamar, shigar da maɓallin sirri, sannan zaɓi maɓallin buɗe saƙo. Don saƙon da ya fi byte 190, yi amfani da haɗaɗɗiyar hanyar RSA.'
  ]),
  pcm: Object.freeze([
    'Dis direct RSA method dey use RSA-OAEP with SHA-256 to hide di message itself; e no use AES. With 2048-bit key, di message no fit pass 190 bytes. Di token na RSA2.',
    'Use di recipient public key and confirm di SHA-256 fingerprint through another trusted way. Type short message wey no pass 190 bytes, then press di button wey go hide am. Send di RSA2 token; no send di private key.',
    'Na only person wey get di matching private key fit open di RSA2 token. Paste di token, enter di private key, then press di button wey go open di message. For longer message, use hybrid RSA.'
  ]),
  es: Object.freeze([
    'Este método cifra el mensaje directamente con RSA-OAEP y SHA-256; no usa AES. Con una clave de 2048 bits, el límite es de 190 bytes. El token usa el formato RSA2.',
    'Usa la clave pública del destinatario y verifica su huella SHA-256 por otro canal de confianza. Escribe un mensaje de hasta 190 bytes y selecciona el botón para cifrarlo. Comparte el token RSA2; nunca envíes la clave privada.',
    'Solo quien tenga la clave privada correspondiente puede descifrar el token RSA2. Pega el token, introduce la clave privada y selecciona el botón para descifrarlo. Para mensajes más largos, usa el método RSA híbrido.'
  ]),
  fr: Object.freeze([
    'Cette méthode chiffre directement le message avec RSA-OAEP et SHA-256, sans AES. Avec une clé de 2048 bits, la limite est de 190 octets. Le jeton utilise le format RSA2.',
    'Utilisez la clé publique du destinataire et vérifiez son empreinte SHA-256 par un autre canal de confiance. Saisissez un message de 190 octets maximum et sélectionnez le bouton de chiffrement. Partagez le jeton RSA2, jamais la clé privée.',
    'Seule la personne qui possède la clé privée correspondante peut déchiffrer le jeton RSA2. Collez le jeton, saisissez la clé privée et sélectionnez le bouton de déchiffrement. Pour les messages plus longs, utilisez RSA hybride.'
  ])
});

const LOCALIZED_GUIDES = Object.freeze({
  yo: Object.freeze({
    intro: 'Ọ̀nà ìfìpamọ́ tí o yàn ni èyí:',
    facts: Object.freeze({
      aes: 'A dábàá AES-256-GCM fún fífi ọ̀rọ̀ pamọ́ pẹ̀lú kọ́kọ́rọ́ ààbò. Ó máa ń fi hàn bí ẹnìkan bá ti yí ọ̀rọ̀ tí a fi pamọ́ padà.',
      cbc: 'AES-256-CBC pẹ̀lú HMAC wà fún ìbáramu pẹ̀lú àwọn ètò àtijọ́. Ó máa ń ṣàyẹ̀wò pé a kò yí ọ̀rọ̀ padà. Lo AES-GCM fún àwọn ọ̀rọ̀ tuntun.',
      rsa: 'Ọ̀nà RSA yìí ń fi AES-256-GCM pamọ́ sí ọ̀rọ̀, ó sì ń lo RSA-OAEP pẹ̀lú SHA-256 láti dáàbò bo kọ́kọ́rọ́ AES. Ọ̀nà yìí ń ṣẹ̀dá ààmì RSA1.',
      hybrid: 'Ọ̀nà àpapọ̀ yìí ń lo AES-256-GCM àti RSA-OAEP pẹ̀lú SHA-256. Ó ń ṣẹ̀dá kọ́kọ́rọ́ AES tuntun fún ọ̀kọ̀ọ̀kan ìfiránṣẹ́. Ọ̀nà yìí ń ṣẹ̀dá ààmì RSA1.',
      legacy: 'Grumpy v2 wà fún àwọn ọ̀rọ̀ àtijọ́ nìkan. Kò ní ààbò tó pé; má ṣe lò ó fún ọ̀rọ̀ tuntun tàbí ìsọfúnni àṣírí.'
    }),
    encrypt: 'Tẹ ọ̀rọ̀ tí o fẹ́ fi pamọ́ àti kọ́kọ́rọ́ ààbò gígùn tí ó yàtọ̀ sí àwọn mìíràn. Lẹ́yìn náà, yan bọ́tìnì fífi ọ̀rọ̀ pamọ́. Rán ààmì tí ó jáde àti kọ́kọ́rọ́ ààbò lọ́tọ̀ọ̀tọ̀.',
    decrypt: 'Láti tú ìfìpamọ́, lẹ ààmì ọ̀rọ̀ náà pátápátá sínú ààyè ìfiránṣẹ́, tẹ kọ́kọ́rọ́ ààbò kan náà, kí o sì yan bọ́tìnì ṣíṣí ọ̀rọ̀. A kò ní ṣí i bí kọ́kọ́rọ́ kò bá tọ́ tàbí tí ẹnìkan bá ti yí ààmì náà padà.',
    rsaEncrypt: 'Lo kọ́kọ́rọ́ gbogbogbò ẹni tí yóò gba ọ̀rọ̀ náà. Ṣàyẹ̀wò ààmì ìdánimọ̀ SHA-256 pẹ̀lú ẹni náà ní ọ̀nà mìíràn tí o gbẹ́kẹ̀ lé. Tẹ ọ̀rọ̀ náà, kí o sì yan bọ́tìnì fífi ọ̀rọ̀ pamọ́. Rán ààmì RSA1 tó jáde sí i; má ṣe rán kọ́kọ́rọ́ àṣírí.',
    rsaDecrypt: 'Ẹni tó ní kọ́kọ́rọ́ àṣírí tó bá kọ́kọ́rọ́ gbogbogbò náà mu nìkan ló lè tú ààmì RSA1. Lẹ ààmì náà, fi kọ́kọ́rọ́ àṣírí tó tọ́ sínú ààyè rẹ̀, kí o sì yan bọ́tìnì ṣíṣí ọ̀rọ̀. Má ṣe pín kọ́kọ́rọ́ àṣírí.',
    legacyEncrypt: 'Fún ìbáramu pẹ̀lú ọ̀nà àtijọ́ tàbí fún ìdánwò nìkan: tẹ kọ́kọ́rọ́ àtijọ́ àti ọ̀rọ̀ náà, kí o sì yan bọ́tìnì fífi ọ̀rọ̀ pamọ́. Ọ̀nà yìí kò ní ààbò; má ṣe lò ó fún ìsọfúnni àṣírí.',
    legacyDecrypt: 'Láti tú ọ̀rọ̀ Grumpy v2 àtijọ́, lẹ ààmì rẹ̀, tẹ kọ́kọ́rọ́ àtijọ́, kí o sì yan bọ́tìnì ṣíṣí ọ̀rọ̀. Lẹ́yìn náà, tún fi AES-GCM pamọ́ sí ọ̀rọ̀ náà fún ààbò tó dára jù.'
  }),
  ig: Object.freeze({
    intro: 'Usoro izochi ozi ị họọrọ bụ:',
    facts: Object.freeze({
      aes: 'A na-atụ aro AES-256-GCM maka izochi ozi site na iji igodo nzuzo. Ọ na-achọpụta ma mmadụ agbanweela ozi e zoro ezo.',
      cbc: 'AES-256-CBC na HMAC bụ maka ime ka ozi kwekọọ na sistemụ ochie. Ọ na-achọpụta ma agbanweela ozi. Jiri AES-GCM maka ozi ọhụrụ.',
      rsa: 'Usoro RSA a na-eji AES-256-GCM ezochi ozi, ma na-eji RSA-OAEP na SHA-256 echekwa igodo AES. Ọ na-emepụta akara RSA1.',
      hybrid: 'Usoro ngwakọta a na-eji AES-256-GCM na RSA-OAEP na SHA-256. Ọ na-emepụta igodo AES ọhụrụ maka ozi nke ọ bụla, ma na-eji akara RSA1.',
      legacy: 'Grumpy v2 bụ naanị maka ozi ochie. Ọ naghị echekwa ozi nke ọma; ejila ya maka ozi ọhụrụ ma ọ bụ ihe nzuzo.'
    }),
    encrypt: 'Tinye ozi ịchọrọ izochi na ogologo igodo nzuzo pụrụ iche, wee họrọ bọtịnụ izochi ozi. Ziga akara ozi e mepụtara na igodo nzuzo ahụ iche iche.',
    decrypt: 'Imeghe ozi: mado akara ozi ahụ dum n’ebe ozi dị, tinye otu igodo nzuzo ahụ, wee họrọ bọtịnụ imeghe ozi. A gaghị emeghe ya ma igodo ezighị ezi ma ọ bụ mmadụ agbanweela akara ahụ.',
    rsaEncrypt: 'Jiri igodo ọha onye ga-enweta ozi ahụ. Nyochaa akara mkpisiaka SHA-256 ya na onye ahụ site n’ụzọ ọzọ ị tụkwasịrị obi. Tinye ozi ahụ, họrọ bọtịnụ izochi ozi, ma ziga akara RSA1 e mepụtara. Ezipụla igodo nzuzo.',
    rsaDecrypt: 'Ọ bụ naanị onye nwere igodo nzuzo kwekọrọ na igodo ọha nwere ike imeghe akara RSA1. Mado akara ahụ, tinye igodo nzuzo ziri ezi, wee họrọ bọtịnụ imeghe ozi. Ekekọrịtala igodo nzuzo.',
    legacyEncrypt: 'Maka ndakọrịta na usoro ochie ma ọ bụ nnwale naanị: tinye igodo ochie na ozi, wee họrọ bọtịnụ izochi ozi. Usoro a enweghị nchekwa; ejila ya maka ozi nzuzo.',
    legacyDecrypt: 'Imeghe ozi Grumpy v2 ochie: mado akara ya, tinye igodo ochie, wee họrọ bọtịnụ imeghe ozi. Jiri AES-GCM zoo ozi ahụ ọzọ ka o nwee nchebe ka mma.'
  }),
  ha: Object.freeze({
    intro: 'Hanyar ɓoye saƙon da ka zaɓa ita ce:',
    facts: Object.freeze({
      aes: 'Ana ba da shawarar AES-256-GCM don ɓoye saƙonni da maɓallin sirri. Yana gano idan wani ya canza saƙon da aka ɓoye.',
      cbc: 'AES-256-CBC tare da HMAC yana taimaka wa tsofaffin tsare-tsare su dace. Yana tabbatar da cewa ba a canza saƙo ba. Yi amfani da AES-GCM don sababbin saƙonni.',
      rsa: 'Wannan hanyar RSA tana amfani da AES-256-GCM don ɓoye saƙon, sannan RSA-OAEP tare da SHA-256 don kare maɓallin AES. Tana samar da alamar RSA1.',
      hybrid: 'Wannan haɗaɗɗiyar hanya tana amfani da AES-256-GCM da RSA-OAEP tare da SHA-256. Tana ƙirƙirar sabon maɓallin AES ga kowane saƙo kuma tana amfani da alamar RSA1.',
      legacy: 'Grumpy v2 na tsoffin saƙonni ne kawai. Ba ya ba da kariya mai inganci; kada ka yi amfani da shi don sababbin saƙonni ko bayanan sirri.'
    }),
    encrypt: 'Don ɓoyewa, shigar da saƙonka da dogon maɓallin sirri na musamman, sannan zaɓi maɓallin ɓoye saƙo. A aika da alamar saƙon da maɓallin sirrin daban-daban.',
    decrypt: 'Don buɗewa, manna cikakkiyar alamar saƙon a wurin saƙo, shigar da maɓalli iri ɗaya, sannan zaɓi maɓallin buɗe saƙo. Ba za a buɗe saƙon ba idan maɓallin bai dace ba ko an canza alamar.',
    rsaEncrypt: 'Yi amfani da maɓallin jama’a na wanda zai karɓi saƙon. Tabbatar da tambarin SHA-256 da shi ta wata amintacciyar hanya. Shigar da saƙon, zaɓi maɓallin ɓoye saƙo, sannan a aika da alamar RSA1. Kada a aika da maɓallin sirri.',
    rsaDecrypt: 'Mai maɓallin sirri da ya dace da maɓallin jama’a ne kawai zai iya buɗe alamar RSA1. Manna alamar, shigar da maɓallin sirri da ya dace, sannan zaɓi maɓallin buɗe saƙo. Kada ka raba maɓallin sirri.',
    legacyEncrypt: 'Don dacewa da tsohon tsari ko gwaji kawai: shigar da tsohon maɓalli da saƙo, sannan zaɓi maɓallin ɓoye saƙo. Wannan hanyar ba ta da kariya; kada ka yi amfani da ita don bayanan sirri.',
    legacyDecrypt: 'Don buɗe tsohon saƙon Grumpy v2, manna alamarsa, shigar da tsohon maɓalli, sannan zaɓi maɓallin buɗe saƙo. Yi amfani da AES-GCM don sake ɓoye saƙon cikin aminci.'
  }),
  pcm: Object.freeze({
    intro: 'Na method wey you choose na this:',
    facts: Object.freeze({
      aes: 'AES-256-GCM na di method wey we recommend to protect message with secret key. E fit show if anybody change di encrypted message.',
      cbc: 'AES-256-CBC plus HMAC dey help make am work with old systems. E dey check say nobody change di message. Use AES-GCM for new messages.',
      rsa: 'Dis RSA method dey use AES-256-GCM to hide di message, then RSA-OAEP with SHA-256 to protect di AES key. E dey make RSA1 token.',
      hybrid: 'Dis hybrid method dey combine AES-256-GCM and RSA-OAEP with SHA-256. E dey make fresh AES key for every message and use RSA1 token.',
      legacy: 'Grumpy v2 na only for old messages. E no get strong protection, so no use am for new messages or private information.'
    }),
    encrypt: 'To hide your message, type am and choose one long, unique secret key. Press di button wey go hide di message. Send di token and di secret key separately.',
    decrypt: 'To open di message, paste di complete token inside di message box, enter di same secret key, then press di button wey go open am. Wrong key or changed token no go work.',
    rsaEncrypt: 'Use di recipient public key, and confirm di SHA-256 fingerprint with dem through another trusted way. Type di message, press di button wey go hide am, then send di RSA1 token to di recipient. No send your private key.',
    rsaDecrypt: 'Na only person wey get di matching private key fit open di RSA1 token. Paste di token, enter di correct private key, then press di button wey go open am. No share your private key.',
    legacyEncrypt: 'Na only to work with old format or test am: enter di old key and message, then press di button wey go hide di message. Dis method no safe; no use am for private information.',
    legacyDecrypt: 'To open old Grumpy v2 message, paste di token, enter di old key, then press di button wey go open am. Use AES-GCM to protect di message again.'
  }),
  es: Object.freeze({
    intro: 'El método de cifrado que has elegido es:',
    facts: Object.freeze({
      aes: 'Recomendamos AES-256-GCM para cifrar mensajes con una clave secreta. Detecta si alguien modifica el mensaje cifrado.',
      cbc: 'AES-256-CBC con HMAC ofrece compatibilidad con sistemas antiguos. Comprueba que el mensaje no se haya modificado. Para mensajes nuevos, usa AES-GCM.',
      rsa: 'Este método RSA cifra el mensaje con AES-256-GCM y protege la clave AES con RSA-OAEP y SHA-256. El resultado usa el formato RSA1.',
      hybrid: 'Este método híbrido combina AES-256-GCM y RSA-OAEP con SHA-256. Crea una clave AES nueva para cada mensaje y usa el formato RSA1.',
      legacy: 'Grumpy v2 solo sirve para mensajes antiguos. No ofrece una protección segura; no lo uses para mensajes nuevos ni datos confidenciales.'
    }),
    encrypt: 'Para cifrar, escribe el mensaje y una clave secreta larga y exclusiva. Después, selecciona el botón para cifrar el mensaje. Comparte el token y la clave por separado.',
    decrypt: 'Para descifrar, pega el token completo en el campo del mensaje, introduce la misma clave y selecciona el botón para descifrarlo. Si la clave no coincide o el token se ha modificado, no se podrá recuperar el mensaje.',
    rsaEncrypt: 'Usa la clave pública del destinatario y confirma su huella SHA-256 con esa persona por otro canal de confianza. Escribe el mensaje y selecciona el botón para cifrarlo. Comparte el token RSA1; nunca envíes la clave privada.',
    rsaDecrypt: 'Solo quien tenga la clave privada correspondiente puede descifrar el token RSA1. Pega el token, introduce la clave privada correcta y selecciona el botón para descifrarlo. No compartas la clave privada.',
    legacyEncrypt: 'Solo para usar formatos antiguos o hacer pruebas: introduce la clave antigua y el mensaje, y selecciona el botón para cifrarlo. Este método no es seguro; no lo uses para datos confidenciales.',
    legacyDecrypt: 'Para descifrar un mensaje antiguo de Grumpy v2, pega el token, introduce la clave antigua y selecciona el botón para descifrarlo. Después, cifra de nuevo el mensaje con AES-GCM.'
  }),
  fr: Object.freeze({
    intro: 'La méthode de chiffrement que vous avez choisie est :',
    facts: Object.freeze({
      aes: 'Nous recommandons AES-256-GCM pour chiffrer les messages avec une clé secrète. Cette méthode détecte toute modification du message chiffré.',
      cbc: 'AES-256-CBC avec HMAC assure la compatibilité avec les anciens systèmes et vérifie que le message n’a pas été modifié. Pour les nouveaux messages, utilisez AES-GCM.',
      rsa: 'Cette méthode RSA chiffre le message avec AES-256-GCM et protège la clé AES avec RSA-OAEP et SHA-256. Le résultat utilise le format RSA1.',
      hybrid: 'Cette méthode hybride combine AES-256-GCM et RSA-OAEP avec SHA-256. Elle crée une nouvelle clé AES pour chaque message et utilise le format RSA1.',
      legacy: 'Grumpy v2 est réservé aux anciens messages. Cette méthode n’offre pas de protection fiable ; ne l’utilisez pas pour de nouveaux messages ni pour des données confidentielles.'
    }),
    encrypt: 'Pour chiffrer, saisissez votre message et une clé secrète longue et unique, puis sélectionnez le bouton de chiffrement. Partagez le jeton et la clé séparément.',
    decrypt: 'Pour déchiffrer, collez le jeton complet dans le champ du message, saisissez la même clé, puis sélectionnez le bouton de déchiffrement. Le message ne pourra pas être récupéré si la clé est incorrecte ou si le jeton a été modifié.',
    rsaEncrypt: 'Utilisez la clé publique du destinataire et vérifiez son empreinte SHA-256 avec lui par un autre canal de confiance. Saisissez le message, puis sélectionnez le bouton de chiffrement. Envoyez le jeton RSA1, jamais la clé privée.',
    rsaDecrypt: 'Seule la personne qui possède la clé privée correspondante peut déchiffrer le jeton RSA1. Collez le jeton, saisissez la bonne clé privée, puis sélectionnez le bouton de déchiffrement. Ne partagez pas cette clé.',
    legacyEncrypt: 'Uniquement pour utiliser d’anciens formats ou pour les tests : saisissez l’ancienne clé et le message, puis sélectionnez le bouton de chiffrement. Cette méthode n’est pas sûre ; ne l’utilisez pas pour des données confidentielles.',
    legacyDecrypt: 'Pour déchiffrer un ancien message Grumpy v2, collez le jeton, saisissez l’ancienne clé, puis sélectionnez le bouton de déchiffrement. Chiffrez ensuite le message avec AES-GCM.'
  })
});

function getLocalizedGuide(mode, language) {
  const translations = LOCALIZED_GUIDES[language];
  const selectedMode = NARRATION_GUIDES[mode] ? mode : 'aes';
  const key = selectedMode === 'rsa' || selectedMode === 'hybrid';
  const action = key ? 'rsa' : selectedMode === 'legacy' ? 'legacy' : 'password';
  return Object.freeze([
    `${translations.intro} ${translations.facts[selectedMode]}`,
    translations[`${action}Encrypt`] || translations.encrypt,
    translations[`${action}Decrypt`] || translations.decrypt
  ]);
}

export function getNarrationGuide(mode, language = 'en', keyBits = 256, rsaKeyBits = 2048) {
  let guide;
  if (mode === 'rsa-direct') {
    guide = DIRECT_RSA_LOCALIZED_GUIDES[language] || NARRATION_GUIDES['rsa-direct'];
  } else if (LOCALIZED_GUIDES[language]) {
    guide = getLocalizedGuide(mode, language);
  } else {
    guide = NARRATION_GUIDES[mode] || NARRATION_GUIDES.aes;
  }
  if (mode === 'aes') return guide.map(line => line.replaceAll('AES-256-GCM', `AES-${keyBits}-GCM`));
  if (mode === 'rsa' || mode === 'hybrid' || mode === 'rsa-direct') {
    const withRsaSize = [...guide];
    withRsaSize[0] = `${withRsaSize[0]} ${getRsaKeySizeNarration(language, rsaKeyBits)}`;
    return withRsaSize;
  }
  return guide;
}

function getKeySizeNarration(language, keyBits) {
  const phrases = {
    en: `AES-GCM key-size selector. The selected derived key is ${keyBits} bits. This is the encryption key length, not the number of characters in your passphrase.`,
    yo: `Aṣàyàn ìwọ̀n kọ́kọ́rọ́ AES-GCM. Ìwọ̀n kọ́kọ́rọ́ tí a yọ jáde tí a yàn jẹ́ bítì ${keyBits}. Èyí ni ìwọ̀n kọ́kọ́rọ́ ìpamọ́, kì í ṣe iye lẹ́tà inú ọ̀rọ̀ aṣínà rẹ.`,
    ig: `Nhọrọ nha igodo AES-GCM. Igodo e wepụtara ahọrọ bụ bit ${keyBits}. Nke a bụ ogologo igodo nzuzo, ọ bụghị ọnụọgụ mkpụrụedemede dị na paswọọdụ gị.`,
    ha: `Zaɓin girman maɓallin AES-GCM. Girman maɓallin da aka zaɓa shi ne bit ${keyBits}. Wannan tsawon maɓallin ɓoyewa ne, ba adadin haruffan kalmar sirrinka ba.`,
    pcm: `AES-GCM key size option. Di selected derived key na ${keyBits} bits. Na encryption key length be dis, e no be di number of characters for your passphrase.`,
    es: `Selector del tamaño de clave AES-GCM. La clave derivada seleccionada es de ${keyBits} bits. Es la longitud de la clave de cifrado, no el número de caracteres de tu contraseña.`,
    fr: `Sélecteur de taille de clé AES-GCM. La clé dérivée sélectionnée fait ${keyBits} bits. C’est la longueur de la clé de chiffrement, pas le nombre de caractères de votre phrase secrète.`
  };
  return phrases[language] || phrases.en;
}

function getRsaKeySizeNarration(language, keyBits) {
  const phrases = {
    en: `RSA key-size selector. New key pairs generated here will use ${keyBits}-bit RSA. Pasted or imported keys keep their existing size. Keys below 2048 bits are not supported.`,
    yo: `Aṣàyàn ìwọ̀n kọ́kọ́rọ́ RSA. Àwọn kọ́kọ́rọ́ tuntun tí a ṣẹ̀dá níbí yóò jẹ́ RSA bítì ${keyBits}. Àwọn kọ́kọ́rọ́ tí a lẹ̀ mọ́ tàbí kó wọlé yóò pa ìwọ̀n tiwọn mọ́. A kò gba kọ́kọ́rọ́ tó kéré sí bítì 2048.`,
    ig: `Nhọrọ nha igodo RSA. Igodo ọhụrụ e mepụtara ebe a ga-eji RSA bit ${keyBits}. Igodo e tinyere ma ọ bụ bubata na-edobe nha nke ha. A naghị akwado igodo na-erughị bit 2048.`,
    ha: `Zaɓin girman maɓallin RSA. Sabbin maɓallan da aka ƙirƙira a nan za su yi amfani da RSA mai bit ${keyBits}. Maɓallan da aka manna ko shigo da su za su riƙe girman nasu. Ba a tallafa wa ƙasa da bit 2048 ba.`,
    pcm: `RSA key size option. New key pairs wey you generate here go use ${keyBits}-bit RSA. Keys wey you paste or import go keep their own size. We no support keys wey pass below 2048 bits.`,
    es: `Selector del tamaño de clave RSA. Los pares nuevos generados aquí usarán RSA de ${keyBits} bits. Las claves pegadas o importadas conservan su tamaño. No se admiten claves inferiores a 2048 bits.`,
    fr: `Sélecteur de taille de clé RSA. Les nouvelles paires générées ici utiliseront RSA ${keyBits} bits. Les clés collées ou importées conservent leur taille. Les clés de moins de 2048 bits ne sont pas prises en charge.`
  };
  return phrases[language] || phrases.en;
}

export function createAudioController({ isLocked }) {
  const $ = id => document.getElementById(id);
  const light = $('light');
  const narration = $('narr');
  const narrationText = $('ntext');
  const audioStatus = $('audioStatus');
  const narrationLanguageSelect = $('narrLanguage');
  const toggles = [];
  let context = null;
  let soundEffects = false;
  let narrationEnabled = false;
  let resetNarrationToggle = () => {};
  let narrationRunning = false;
  let narrationGeneration = 0;
  let narrationIndex = 0;
  let narrationMode = 'aes';
  let narrationLanguage = 'en';
  let narrationKeyBits = 256;
  let narrationRsaKeyBits = Number($('rsaKeySize').value);
  let narrationGuide = getNarrationGuide(
    narrationMode, narrationLanguage, narrationKeyBits, narrationRsaKeyBits
  );
  let narrationTimer = 0;
  let voice = null;

  const effects = {
    encrypt: [[440, 0, .08], [660, .1, .08], [880, .2, .14, .18]],
    decrypt: [[880, 0, .08], [660, .1, .16, .18]],
    blip: [[1200, 0, .05, .1, 'sine']],
    click: [[300, 0, .04, .06]]
  };
  const speech = typeof window.speechSynthesis !== 'undefined' &&
    typeof window.speechSynthesis.speak === 'function' &&
    typeof window.speechSynthesis.cancel === 'function' &&
    typeof window.SpeechSynthesisUtterance === 'function';

  function reportError(error) {
    audioStatus.textContent = error.message === 'speech-unavailable'
      ? 'Narration is not supported by this browser.'
      : error.message === 'audio-unavailable'
        ? 'Audio is not supported by this browser.'
        : error.name === 'NotAllowedError'
          ? 'Audio was blocked by the browser. Click the audio control again to allow playback.'
          : error.message === 'audio-suspended'
            ? 'Audio is paused by the browser. Reload this page, then enable audio again.'
            : `Could not start audio${error.message ? `: ${error.message}` : ''}. Check browser audio settings and try again.`;
    audioStatus.classList.add('error');
  }

  async function getContext() {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) throw new Error('audio-unavailable');
    if (!context || context.state === 'closed' || context.state === 'interrupted') {
      context = new AudioContextCtor();
    }
    if (context.state !== 'running') await context.resume();
    if (context.state !== 'running') throw new Error('audio-suspended');
    return context;
  }

  function playTone(name) {
    if (!soundEffects) return;
    getContext().then(audioContext => {
      const start = audioContext.currentTime;
      effects[name].forEach(([frequency, offset, duration, volume = .15, type = 'square']) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const at = start + offset;
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(volume, at + .01);
        gain.gain.setValueAtTime(volume, at + duration - .02);
        gain.gain.linearRampToValueAtTime(0, at + duration);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(at);
        oscillator.stop(at + duration);
      });
    }).catch(reportError);
  }

  function pickVoice(language) {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const speechTag = NARRATION_LANGUAGES[language].speechTag;
    const languagePrefix = speechTag.slice(0, 2);
    if (language !== 'en') {
      const matchingVoice = voices.find(item => item.lang.toLowerCase() === speechTag.toLowerCase()) ||
        voices.find(item => {
          const voiceLanguage = item.lang.toLowerCase();
          return voiceLanguage === languagePrefix ||
            voiceLanguage.startsWith(`${languagePrefix}-`) ||
            voiceLanguage.startsWith(`${languagePrefix}_`);
        });
      if (matchingVoice || language !== 'pcm') return matchingVoice || null;
    }
    return voices.find(item => /daniel|uk english male|george|ryan|arthur|oliver/i.test(item.name)) ||
      voices.find(item => /^en[-_]gb/i.test(item.lang)) ||
      voices.find(item => /^en/i.test(item.lang)) ||
      voices[0];
  }

  function stopNarration() {
    narrationRunning = false;
    narrationGeneration++;
    clearTimeout(narrationTimer);
    if (speech) window.speechSynthesis.cancel();
    narration.classList.remove('active');
    light.classList.remove('active');
    narrationText.textContent = 'Off';
  }

  function say(generation) {
    if (generation !== narrationGeneration || !narrationRunning) return;
    if (narrationIndex >= narrationGuide.length) {
      narrationIndex = 0;
      narrationTimer = setTimeout(() => say(generation), 10_000);
      return;
    }
    if (document.hidden) {
      narrationTimer = setTimeout(() => say(generation), 2000);
      return;
    }
    try {
      voice = voice || pickVoice(narrationLanguage);
      const line = narrationGuide[narrationIndex++];
      const utterance = new window.SpeechSynthesisUtterance(line);
      if (voice) utterance.voice = voice;
      utterance.lang = NARRATION_LANGUAGES[narrationLanguage].speechTag;
      utterance.rate = .82;
      utterance.pitch = .75;
      utterance.volume = .85;
      narrationText.textContent = `"${line}"`;
      narration.classList.add('active');
      light.classList.add('active');
      utterance.onend = () => {
        if (generation !== narrationGeneration) return;
        narration.classList.remove('active');
        light.classList.remove('active');
        narrationTimer = setTimeout(() => say(generation), 3000);
      };
      utterance.onerror = () => {
        if (generation !== narrationGeneration) return;
        stopNarration();
        narrationEnabled = false;
        resetNarrationToggle();
        audioStatus.textContent = 'Narration could not play. Check your browser speech settings.';
        audioStatus.classList.add('error');
      };
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      if (generation !== narrationGeneration) return;
      narrationRunning = false;
      narration.classList.remove('active');
      light.classList.remove('active');
      narrationText.textContent = 'Off';
      $('voxB').textContent = 'Narration: Off';
      $('voxB').setAttribute('aria-pressed', 'false');
      throw error;
    }
  }

  function startNarration() {
    if (!speech) throw new Error('speech-unavailable');
    if (narrationRunning) return;
    audioStatus.textContent = '';
    audioStatus.classList.remove('error');
    narrationRunning = true;
    say(++narrationGeneration);
  }

  function setNarrationMode(mode) {
    if ((!NARRATION_GUIDES[mode] && mode !== 'rsa-direct') || mode === narrationMode) return;
    narrationMode = mode;
    narrationGuide = getNarrationGuide(mode, narrationLanguage, narrationKeyBits, narrationRsaKeyBits);
    narrationIndex = 0;
    if (narrationRunning) {
      stopNarration();
      narrationRunning = true;
      say(++narrationGeneration);
    }
  }

  function setNarrationKeySize(keyBits) {
    if (![128, 192, 256].includes(keyBits) || keyBits === narrationKeyBits) return;
    narrationKeyBits = keyBits;
    narrationGuide = getNarrationGuide(narrationMode, narrationLanguage, narrationKeyBits, narrationRsaKeyBits);
    narrationIndex = 0;
    if (narrationRunning) {
      stopNarration();
      narrationRunning = true;
      say(++narrationGeneration);
    }
  }

  function setNarrationLanguage(language) {
    if (!NARRATION_LANGUAGES[language] || language === narrationLanguage) return;
    narrationLanguage = language;
    voice = null;
    narrationGuide = getNarrationGuide(narrationMode, language, narrationKeyBits, narrationRsaKeyBits);
    narrationIndex = 0;
    if (narrationRunning) {
      stopNarration();
      narrationRunning = true;
      say(++narrationGeneration);
    }
  }

  function setNarrationRsaKeySize(keyBits, announce = false) {
    if (![2048, 3072, 4096].includes(keyBits) || keyBits === narrationRsaKeyBits) return;
    narrationRsaKeyBits = keyBits;
    narrationGuide = getNarrationGuide(
      narrationMode, narrationLanguage, narrationKeyBits, narrationRsaKeyBits
    );
    narrationIndex = 0;
    if (announce && narrationRunning) {
      announceMessage(getRsaKeySizeNarration(narrationLanguage, narrationRsaKeyBits));
    }
  }

  function getContextualGuide(target) {
    const element = target.closest('input,textarea,select,button,label,.field-hint,.otext');
    if (!element) return null;
    const id = element.tagName === 'LABEL' ? element.htmlFor : element.id;
    if (narrationLanguage !== 'en') {
      if (id === 'mode' || id === 'narrLanguage') return narrationGuide[0];
      if (id === 'aesKeySize' || id === 'aesKeySizeField') return getKeySizeNarration(narrationLanguage, narrationKeyBits);
      if (id === 'rsaKeySize' || id === 'rsaKeySizeHint') {
        return getRsaKeySizeNarration(narrationLanguage, narrationRsaKeyBits);
      }
      if (id === 'key' || id === 'keyHint') {
        return narrationMode === 'rsa' || narrationMode === 'hybrid'
          ? narrationGuide[2]
          : narrationGuide[1];
      }
      if (id === 'decB' || id === 'rsaPrivate') return narrationGuide[2];
      if (id === 'encB' || id === 'inp' || id === 'rsaPublic') return narrationGuide[1];
      return narrationGuide[0];
    }
    const method = NARRATION_GUIDES[narrationMode];
    const why = {
      aes: 'AES-GCM is the recommended password-based choice because encryption and tamper detection are built into one widely supported mode.',
      cbc: 'CBC with HMAC is provided for compatibility with CBC-based workflows; AES-GCM is generally simpler for new messages.',
      'rsa-direct': 'Direct RSA encrypts the message itself and is limited to short messages: at most 190 UTF-8 bytes with a 2048-bit key. Choose hybrid RSA for longer messages.',
      rsa: 'RSA hybrid mode is useful when the sender should encrypt to a recipient public key instead of sharing an access key first.',
      hybrid: 'This hybrid method combines fast AES-GCM message encryption with RSA public-key delivery of the AES key, so sender and recipient do not need to share a message password.',
      legacy: 'Grumpy v2 is not better for security. It is available for old-format compatibility and testing, but use AES-GCM or verified RSA hybrid encryption for new messages.'
    }[narrationMode];
    const accessKey = narrationMode === 'rsa' || narrationMode === 'hybrid' || narrationMode === 'rsa-direct'
      ? 'The access key is not used for RSA text messages. It is used for file encryption and password-based modes.'
      : narrationMode === 'legacy'
        ? 'For Grumpy v2 compatibility or testing, enter the legacy key. This cipher is insecure, does not reliably protect confidentiality or detect tampering, and is not suitable for new or sensitive messages.'
        : 'The access key is the passphrase from which this mode derives its encryption key. Use a long, unique passphrase and share it separately from the encrypted token.';
    const guides = {
      mode: `Encryption method selector. ${method[0]} ${why}`,
      aesKeySize: getKeySizeNarration(narrationLanguage, narrationKeyBits),
      rsaKeySize: getRsaKeySizeNarration(narrationLanguage, narrationRsaKeyBits),
      key: `Access key field. ${accessKey}`,
      inp: `Message or encrypted token field. Type the original message here before encryption, or paste the complete encrypted token here before decryption. ${why}`,
      encB: `Encrypt message button. It encrypts the text in the message field using the selected method and displays an encrypted result. ${why}`,
      decB: `Decrypt message button. Paste the complete token, provide the matching access key or RSA private key as required, then select this button. Authenticated modes reject a wrong key or modified token. ${why}`,
      clrB: 'Clear button. It clears the current message, result, and selected file from this workspace. It does not delete files you already downloaded.',
      out: 'Result area. It displays either the encrypted token or the decrypted message. Treat decrypted text as sensitive; use Download .txt only to save an encrypted token.',
      copy: 'Copy output button. It copies the current result to the clipboard. Check whether the result is encrypted or plaintext before sharing it.',
      downloadToken: 'Download text button. It saves only the encrypted token as a text file, not the access key or private key.',
      rsaPublic: 'RSA public key field. Paste the recipient public key in SPKI PEM format to encrypt for them. Public keys may be shared, but verify the SHA-256 fingerprint with the recipient through a separate trusted channel.',
      rsaPrivate: 'Private-key PEM field. Paste a matching PKCS#8 private key here to decrypt RSA hybrid messages. Never share this key. Exportable private keys are visible in this page and need a secure backup.',
      rsaKeyMode: 'Private-key handling selector. Non-extractable keys stay in browser memory and cannot be backed up here; exportable PEM keys can be backed up but are visible and must be protected.',
      rsaKeySizeHint: getRsaKeySizeNarration(narrationLanguage, narrationRsaKeyBits),
      generateRsa: `Generate key pair button. It creates a ${narrationRsaKeyBits}-bit RSA public and private key pair. The default private key is non-extractable and is lost on reload or privacy lock. Confirm key fingerprints before exchanging public keys.`,
      copyPublic: 'Copy public key button. The public key is safe to share, but verify its fingerprint with the intended recipient first.',
      copyPrivate: 'Copy private key button. This copies the exportable private key, which can decrypt messages addressed to it. Store it securely and never share it.',
      migrateLegacy: 'Prepare AES-GCM migration button. It transfers successfully decrypted legacy plaintext into the message field, selects the recommended AES-256-GCM method, and clears the old passphrase. Enter a new strong access key and encrypt to create a modern authenticated token. Grumpy v2 remains insecure.',
      rsaFingerprint: 'Public-key fingerprint. Compare the full SHA-256 fingerprint through a separate trusted channel before using this public key. A matching fingerprint confirms the key bytes match, not the owner identity.',
      fileInput: 'File selection. Choose a file to encrypt or an encrypted file to decrypt. File operations always use chunked AES-256-GCM and the access key, regardless of the selected text method.',
      fileEncrypt: 'Encrypt and download file button. It encrypts the selected file using chunked AES-256-GCM and the access key, then saves an encrypted file.',
      fileDecrypt: 'Decrypt and download file button. It verifies each AES-GCM chunk before writing the corresponding plaintext file. Use the same access key used for encryption.'
    };
    if (guides[id]) return `${guides[id]} ${why}`;
    if (element.id === 'rsaKeyModeHint') return `${guides.rsaKeyMode} ${why}`;
    if (element.id === 'keyHint') return `Access key guidance. ${accessKey} ${why}`;
    if (element.id === 'modeHint') return `${method[0]} ${why}`;
    if (element.id === 'rsaKeySummary' || element.id === 'rsaBackupReminder') return `${guides.rsaKeyMode} ${why}`;
    if (element.id === 'fingerprintStatus') return `${guides.rsaFingerprint} ${why}`;
    if (element.id === 'fileHint' || element.id === 'fileStatus') return `${guides.fileInput} ${why}`;
    return null;
  }

  let lastAnnouncement = '';
  let lastAnnouncementTime = 0;
  function announceMessage(message) {
    if (!narrationRunning || isLocked() || document.hidden) return;
    if (!message) return;
    const now = Date.now();
    if (message === lastAnnouncement && now - lastAnnouncementTime < 1200) return;
    lastAnnouncement = message;
    lastAnnouncementTime = now;
    clearTimeout(narrationTimer);
    narrationGeneration++;
    const generation = narrationGeneration;
    window.speechSynthesis.cancel();
    try {
      voice = voice || pickVoice(narrationLanguage);
      const utterance = new window.SpeechSynthesisUtterance(message);
      if (voice) utterance.voice = voice;
      utterance.lang = NARRATION_LANGUAGES[narrationLanguage].speechTag;
      utterance.rate = .82;
      utterance.pitch = .75;
      utterance.volume = .85;
      narrationText.textContent = `"${message}"`;
      narration.classList.add('active');
      light.classList.add('active');
      utterance.onend = () => {
        if (generation !== narrationGeneration) return;
        narration.classList.remove('active');
        light.classList.remove('active');
        narrationTimer = setTimeout(() => say(generation), 1500);
      };
      utterance.onerror = () => {
        if (generation !== narrationGeneration) return;
        narration.classList.remove('active');
        light.classList.remove('active');
        reportError(new Error('speech-failed'));
      };
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      narration.classList.remove('active');
      light.classList.remove('active');
      reportError(error);
    }
  }

  function announceContext(event) {
    announceMessage(getContextualGuide(event.target));
  }

  function handleRsaKeySizeChange() {
    setNarrationRsaKeySize(Number($('rsaKeySize').value), true);
  }

  function toggle(button, onLabel, offLabel, action) {
    let enabled = false;
    let pending = false;
    const render = () => {
      button.textContent = enabled ? onLabel : offLabel;
      button.setAttribute('aria-pressed', String(enabled));
    };
    render();
    const reset = () => {
      enabled = false;
      render();
    };
    button.addEventListener('click', async () => {
      if (pending || isLocked()) return;
      pending = true;
      button.disabled = true;
      const next = !enabled;
      enabled = next;
      render();
      try {
        const applied = await action(next);
        if (isLocked()) {
          await action(false);
          enabled = false;
          render();
          return;
        }
        if (applied === false) {
          enabled = !next;
          render();
          return;
        }
        audioStatus.textContent = '';
        audioStatus.classList.remove('error');
      } catch (error) {
        enabled = isLocked() ? false : !next;
        render();
        if (!isLocked()) reportError(error);
      } finally {
        pending = false;
        if (!isLocked()) button.disabled = false;
      }
    });
    toggles.push(reset);
    return reset;
  }

  toggle($('sfxB'), 'Sounds: On', 'Sounds: Off', async enabled => {
    if (enabled) await getContext();
    soundEffects = enabled;
    if (enabled) playTone('click');
  });
  resetNarrationToggle = toggle($('voxB'), 'Narration: On', 'Narration: Off', async enabled => {
    if (enabled) {
      startNarration();
      narrationEnabled = true;
    } else {
      narrationEnabled = false;
      stopNarration();
    }
  });

  narrationLanguageSelect.addEventListener('change', () => {
    setNarrationLanguage(narrationLanguageSelect.value);
  });
  $('rsaKeySize').addEventListener('change', handleRsaKeySizeChange);
  if (speech) window.speechSynthesis.onvoiceschanged = () => { voice = pickVoice(narrationLanguage); };
  document.addEventListener('focusin', announceContext);
  document.addEventListener('click', announceContext);
  document.addEventListener('visibilitychange', () => {
    if (context) {
      if (document.hidden) context.suspend().catch(reportError);
      else if (soundEffects) context.resume().catch(reportError);
    }
    if (document.hidden && speech) window.speechSynthesis.pause();
    else if (narrationEnabled && speech) window.speechSynthesis.resume();
  });

  return {
    play: playTone,
    setNarrationMode,
    setNarrationKeySize,
    setNarrationRsaKeySize,
    setNarrationLanguage,
    reset() {
      soundEffects = narrationEnabled = false;
      stopNarration();
      toggles.forEach(reset => reset());
      if (context && context.state !== 'closed') context.suspend().catch(reportError);
    }
  }
}
