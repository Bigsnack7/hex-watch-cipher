export const NARRATION_GUIDES = Object.freeze({
  aes: Object.freeze([
    'AES-256-GCM passphrase-based encryption is recommended for new password-protected messages. It uses your access key to derive an AES key and authenticates the encrypted message, so a wrong key or altered token is rejected.',
    'To encrypt: enter a long, unique access key and your message, then select Encrypt message. Share the resulting CT2 token and the access key separately.',
    'To decrypt: paste the complete CT2 token into the message field, enter the same access key, and select Decrypt message. CT1 tokens from older versions are also supported. For files, use the file controls; file encryption uses AES-GCM regardless of the selected text method.'
  ]),
  cbc: Object.freeze([
    'AES-CBC with HMAC is the compatibility method for CBC workflows. It encrypts the message and adds a separate authentication check; the app verifies that check before decrypting. Prefer AES-GCM for new messages.',
    'To encrypt: enter a long, unique access key and your message, then select Encrypt message. Share the CBC1 token and the access key separately.',
    'To decrypt: paste the complete CBC1 token, enter the same access key, and select Decrypt message. Modified data or a wrong key is rejected. File encryption still uses AES-GCM.'
  ]),
  hybrid: Object.freeze([
    'AES-GCM + RSA-OAEP is the recommended public-key method. AES-256-GCM encrypts the message with a fresh random key, and RSA-OAEP with SHA-256 protects that key. It uses the RSA1 format.',
    'To encrypt: generate a key pair for yourself or paste the recipient public key in SPKI PEM format. Verify its SHA-256 fingerprint through a trusted separate channel, enter your message, then select Encrypt message.',
    'Share the RSA1 token with the recipient, never the private key. To decrypt, the recipient pastes the token, supplies the matching private key, and selects Decrypt message. The access-key field is not used for RSA text messages.'
  ]),
  'rsa-direct': Object.freeze([
    'RSA-OAEP direct encryption uses the RSA2 format and encrypts the message itself without AES. With the default 2048-bit key, the maximum is 190 UTF-8 bytes. Use RSA Hybrid for longer messages.',
    'To encrypt a short message, paste or generate the recipient public key, verify its SHA-256 fingerprint through a trusted separate channel, enter no more than 190 UTF-8 bytes, and select Encrypt message. Share the RSA2 token; never share the private key.',
    'To decrypt an RSA2 token, the recipient enters the matching private key and selects Decrypt message. The access-key field is not used. For longer messages, use hybrid RSA.'
  ]),
  'rsa-aes': Object.freeze([
    'RSA-OAEP + AES-GCM is a dual-key, short-message format. RSA-OAEP encrypts the message first; PBKDF2 derives an AES-256-GCM key from your access-key passphrase, which then encrypts the RSA ciphertext. It uses the RSA3 format.',
    'To encrypt: paste or generate the recipient public key, verify its SHA-256 fingerprint through a trusted separate channel, enter the shared access-key passphrase, and enter a message within the RSA key-size limit. Share the RSA3 token and passphrase separately.',
    'To decrypt an RSA3 token, provide both the matching RSA private key and the same access-key passphrase. Both are required. The message limit depends on RSA key size; use AES-GCM + RSA-OAEP Hybrid for longer messages.'
  ]),
  legacy: Object.freeze([
    'Grumpy v2 is a legacy-only method and is cryptographically insecure. It does not provide reliable confidentiality or tamper detection. Use it only to process old-format messages, never to protect sensitive information; prefer AES-256-GCM.',
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

const STATUS_NARRATION = Object.freeze({
  en: Object.freeze({
    messageEncrypted: 'Message encrypted. The encrypted token is displayed in the result area.',
    messageDecrypted: 'Message decrypted. The plaintext is displayed in the result area; treat it as sensitive.',
    legacyMigrationPrepared: 'Legacy plaintext is ready in the message field. Enter a new strong access key, then encrypt it with AES-256-GCM.',
    operationFailed: 'The operation failed. Check the selected method, key, and input, then try again.',
    fileEncrypted: 'File encrypted. The encrypted file has been saved.',
    fileDecrypted: 'File decrypted. The plaintext file has been saved; treat it as sensitive.',
    fileFailed: 'File operation failed. Check the selected file and access key, then try again.',
    fileCancelled: 'File save cancelled. No complete output file was saved.',
    rsaKeyGenerated: 'RSA key pair generated. Keep the private key secure.',
    rsaKeyFailed: 'RSA key generation failed. Check browser support and try again.',
    workspaceCleared: 'The message, result, and selected file were cleared. Access keys and RSA keys were not cleared.',
    outputCopied: 'Result copied. Check whether it contains encrypted text or sensitive plaintext before sharing.',
    keyCopied: 'Key copied to the clipboard. Keep private keys secret and verify public-key fingerprints.',
    copyFailed: 'Copy failed. The text is selected for manual copying; check it carefully before sharing.',
    tokenDownloaded: 'Encrypted text token downloaded. The passphrase and private key are not included.'
  }),
  yo: Object.freeze({
    messageEncrypted: 'A ti fi ìfiránṣẹ́ pamọ́. Ààmì ìfiránṣẹ́ tí a fi pamọ́ wà ní ibi àbájáde.',
    messageDecrypted: 'A ti tú ìfìpamọ́ ìfiránṣẹ́. Ọ̀rọ̀ tó hàn jẹ́ àṣírí; pa á mọ́.',
    legacyMigrationPrepared: 'Ọ̀rọ̀ ìtàn àtijọ́ ti ṣetán nínú ààyè ìfiránṣẹ́. Tẹ kọ́kọ́rọ́ ààbò tuntun tó lágbára, kí o sì fi AES-256-GCM pamọ́.',
    operationFailed: 'Iṣẹ́ náà kò ṣàṣeyọrí. Ṣàyẹ̀wò ọ̀nà, kọ́kọ́rọ́ àti ohun tí o tẹ̀ sí, kí o sì tún gbìyànjú.',
    fileEncrypted: 'A ti fi fáìlì pamọ́, a sì ti fi fáìlì ìpamọ́ náà pamọ́ sí ibi tí o yàn.',
    fileDecrypted: 'A ti tú ìfìpamọ́ fáìlì. Ọ̀rọ̀ inú fáìlì náà jẹ́ àṣírí; pa á mọ́.',
    fileFailed: 'Iṣẹ́ fáìlì náà kò ṣàṣeyọrí. Ṣàyẹ̀wò fáìlì àti kọ́kọ́rọ́ ààbò, kí o sì tún gbìyànjú.',
    fileCancelled: 'O ti fagile fífi fáìlì pamọ́. A kò fi gbogbo àbájáde pamọ́.',
    rsaKeyGenerated: 'A ti ṣẹ̀dá àwọn kọ́kọ́rọ́ RSA. Pa kọ́kọ́rọ́ àṣírí mọ́ ní ààbò.',
    rsaKeyFailed: 'Ṣíṣẹ̀dá kọ́kọ́rọ́ RSA kò ṣàṣeyọrí. Ṣàyẹ̀wò àtìlẹ́yìn ẹ̀rọ aṣàwákiri, kí o sì tún gbìyànjú.',
    workspaceCleared: 'A ti pa ìfiránṣẹ́, àbájáde àti fáìlì tí a yàn rẹ́. A kò pa kọ́kọ́rọ́ ààbò àti kọ́kọ́rọ́ RSA rẹ́.',
    outputCopied: 'A ti da àbájáde kọ. Ṣàyẹ̀wò bóyá ó ní ọ̀rọ̀ ìpamọ́ tàbí ọ̀rọ̀ àṣírí kí o tó pín in.',
    keyCopied: 'A ti da kọ́kọ́rọ́ kọ. Pa kọ́kọ́rọ́ àṣírí mọ́, kí o sì ṣàyẹ̀wò àmì kọ́kọ́rọ́ gbogbogbò.',
    copyFailed: 'Dídàkọ kò ṣàṣeyọrí. A ti yan ọ̀rọ̀ náà fún dídàkọ lọ́wọ́; ṣàyẹ̀wò rẹ̀ kí o tó pín in.',
    tokenDownloaded: 'A ti gba ààmì ọ̀rọ̀ ìpamọ́ sílẹ̀. Kọ́kọ́rọ́ ààbò àti kọ́kọ́rọ́ àṣírí kò sí nínú rẹ̀.'
  }),
  ig: Object.freeze({
    messageEncrypted: 'Ezochiela ozi. Akara ozi e zoro ezo dị na mpaghara nsonaazụ.',
    messageDecrypted: 'Megheela ozi. E gosiri ozi mbụ; chekwaa ya nke ọma.',
    legacyMigrationPrepared: 'Ozi ochie dị n\'oghere ozi ugbu a. Tinye paswọọdụ ọhụrụ siri ike, wee jiri AES-256-GCM zoo ya.',
    operationFailed: 'Ọrụ ahụ emeghị nke ọma. Lelee usoro, igodo na ozi i tinyere, wee nwaa ọzọ.',
    fileEncrypted: 'Ezochiela faịlụ ma chekwaa faịlụ e zoro ezo.',
    fileDecrypted: 'Megheela faịlụ. Faịlụ ahụ nwere ozi mbụ; chekwaa ya nke ọma.',
    fileFailed: 'Ọrụ faịlụ ahụ emeghị nke ọma. Lelee faịlụ na igodo nzuzo, wee nwaa ọzọ.',
    fileCancelled: 'Akagbuola nchekwa faịlụ. Echekwaghị nsonaazụ zuru ezu.',
    rsaKeyGenerated: 'Emepụtala igodo RSA. Chekwaa igodo nzuzo nke ọma.',
    rsaKeyFailed: 'Emeghị nke ọma n’imepụta igodo RSA. Lelee nkwado ihe nchọgharị wee nwaa ọzọ.',
    workspaceCleared: 'Ehichapula ozi, nsonaazụ na faịlụ ahọpụtara. Ehichapụghị igodo nzuzo na igodo RSA.',
    outputCopied: 'Edepụtala nsonaazụ. Lelee ma ọ bụ ozi ezoro ezo ka ọ bụ ozi nzuzo tupu izipu ya.',
    keyCopied: 'Edepụtala igodo. Debe igodo nzuzo na nchekwa ma nyochaa akara mkpịsị aka igodo ọha.',
    copyFailed: 'Edepụtaghị ya. Ahọpụtala ederede ka i wee nwee ike idetuo ya n’aka; lelee ya nke ọma tupu izipu.',
    tokenDownloaded: 'Ebudatala akara ozi ezoro ezo. Paswọọdụ na igodo nzuzo adịghị n’ime ya.'
  }),
  ha: Object.freeze({
    messageEncrypted: 'An ɓoye saƙon. Alamar saƙon da aka ɓoye tana cikin wurin sakamako.',
    messageDecrypted: 'An buɗe saƙon. An nuna ainihin saƙon; kiyaye shi a sirrance.',
    legacyMigrationPrepared: 'Tsohon saƙon yana shirye a wurin saƙo. Shigar da sabon kalmar sirri mai ƙarfi, sannan a ɓoye shi da AES-256-GCM.',
    operationFailed: 'Aikin bai yi nasara ba. Duba hanya, maɓalli da bayanan da ka shigar, sannan a sake gwadawa.',
    fileEncrypted: 'An ɓoye fayil ɗin kuma an ajiye fayil ɗin da aka ɓoye.',
    fileDecrypted: 'An buɗe fayil ɗin. Fayil ɗin yanzu yana ɗauke da ainihin bayanai; kiyaye shi a sirrance.',
    fileFailed: 'Aikin fayil bai yi nasara ba. Duba fayil ɗin da maɓallin sirri, sannan a sake gwadawa.',
    fileCancelled: 'An soke ajiye fayil ɗin. Ba a ajiye cikakken sakamako ba.',
    rsaKeyGenerated: 'An ƙirƙiri maɓallan RSA. Ajiye maɓallin sirri cikin aminci.',
    rsaKeyFailed: 'Ƙirƙirar maɓallin RSA ta gaza. Duba tallafin burauza sannan a sake gwadawa.',
    workspaceCleared: 'An share saƙo, sakamako da fayil ɗin da aka zaɓa. Ba a share maɓallan sirri ko na RSA ba.',
    outputCopied: 'An kwafi sakamako. Duba ko rufaffen rubutu ne ko bayanan sirri kafin rabawa.',
    keyCopied: 'An kwafi maɓalli. Tsare maɓallin sirri kuma tabbatar da tambarin maɓallin jama’a.',
    copyFailed: 'Kwafi bai yi nasara ba. An zaɓi rubutun don kwafinsa da hannu; duba shi kafin rabawa.',
    tokenDownloaded: 'An sauke alamar rubutun da aka ɓoye. Kalmar sirri da maɓallin sirri ba sa cikinta.'
  }),
  pcm: Object.freeze({
    messageEncrypted: 'Message don encrypt. Di encrypted token dey for di result area.',
    messageDecrypted: 'Message don decrypt. Di original message show; keep am private.',
    legacyMigrationPrepared: 'Di old message don ready for di message box. Put new strong access key, then encrypt am with AES-256-GCM.',
    operationFailed: 'Di operation no work. Check di method, key and input, then try again.',
    fileEncrypted: 'File don encrypt and di encrypted file don save.',
    fileDecrypted: 'File don decrypt. Di original file don save; keep am private.',
    fileFailed: 'File operation no work. Check di file and access key, then try again.',
    fileCancelled: 'File save don cancel. No complete output file save.',
    rsaKeyGenerated: 'RSA key pair don generate. Keep di private key safe.',
    rsaKeyFailed: 'RSA key generation no work. Check browser support, then try again.',
    workspaceCleared: 'Message, result and selected file don clear. Access keys and RSA keys remain.',
    outputCopied: 'Result don copy. Check if na encrypted text or private plaintext before you share am.',
    keyCopied: 'Key don copy. Keep private keys secret and confirm public-key fingerprints.',
    copyFailed: 'Copy no work. Di text don select for manual copying; check am before you share.',
    tokenDownloaded: 'Encrypted text token don download. Di passphrase and private key no dey inside.'
  }),
  es: Object.freeze({
    messageEncrypted: 'Mensaje cifrado. El token cifrado aparece en el área de resultados.',
    messageDecrypted: 'Mensaje descifrado. El texto original aparece en el área de resultados; protégelo.',
    legacyMigrationPrepared: 'El texto heredado está listo en el campo del mensaje. Introduce una clave de acceso nueva y segura y cifralo con AES-256-GCM.',
    operationFailed: 'La operación ha fallado. Comprueba el método, la clave y los datos, e inténtalo de nuevo.',
    fileEncrypted: 'Archivo cifrado. Se ha guardado el archivo cifrado.',
    fileDecrypted: 'Archivo descifrado. Se ha guardado el archivo original; protégelo.',
    fileFailed: 'La operación con el archivo ha fallado. Comprueba el archivo y la clave, e inténtalo de nuevo.',
    fileCancelled: 'Se canceló el guardado del archivo. No se guardó un resultado completo.',
    rsaKeyGenerated: 'Par de claves RSA generado. Guarda la clave privada de forma segura.',
    rsaKeyFailed: 'No se pudo generar el par RSA. Comprueba la compatibilidad del navegador e inténtalo de nuevo.',
    workspaceCleared: 'Se han borrado el mensaje, el resultado y el archivo seleccionado. Las claves de acceso y RSA se conservan.',
    outputCopied: 'Resultado copiado. Comprueba si contiene texto cifrado o texto confidencial antes de compartirlo.',
    keyCopied: 'Clave copiada. Protege las claves privadas y verifica las huellas de las claves públicas.',
    copyFailed: 'No se pudo copiar. El texto está seleccionado para copiarlo manualmente; revísalo antes de compartirlo.',
    tokenDownloaded: 'Token de texto cifrado descargado. No incluye la frase secreta ni la clave privada.'
  }),
  fr: Object.freeze({
    messageEncrypted: 'Message chiffré. Le jeton chiffré apparaît dans la zone de résultat.',
    messageDecrypted: 'Message déchiffré. Le texte original apparaît dans la zone de résultat ; protégez-le.',
    legacyMigrationPrepared: 'Le texte hérité est prêt dans le champ du message. Saisissez une nouvelle clé d’accès robuste, puis chiffrez-le avec AES-256-GCM.',
    operationFailed: 'Échec de l’opération. Vérifiez la méthode, la clé et les données, puis réessayez.',
    fileEncrypted: 'Fichier chiffré. Le fichier chiffré a été enregistré.',
    fileDecrypted: 'Fichier déchiffré. Le fichier original a été enregistré ; protégez-le.',
    fileFailed: 'Échec de l’opération sur le fichier. Vérifiez le fichier et la clé, puis réessayez.',
    fileCancelled: 'Enregistrement du fichier annulé. Aucun résultat complet n’a été enregistré.',
    rsaKeyGenerated: 'Paire de clés RSA générée. Conservez la clé privée en lieu sûr.',
    rsaKeyFailed: 'Échec de la génération RSA. Vérifiez la prise en charge du navigateur, puis réessayez.',
    workspaceCleared: 'Le message, le résultat et le fichier sélectionné ont été effacés. Les clés d’accès et RSA sont conservées.',
    outputCopied: 'Résultat copié. Vérifiez s’il contient du texte chiffré ou des données sensibles avant de le partager.',
    keyCopied: 'Clé copiée. Protégez les clés privées et vérifiez les empreintes des clés publiques.',
    copyFailed: 'Échec de la copie. Le texte est sélectionné pour une copie manuelle ; vérifiez-le avant de le partager.',
    tokenDownloaded: 'Jeton de texte chiffré téléchargé. La phrase secrète et la clé privée ne sont pas incluses.'
  })
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

const RSA_AES_LOCALIZED_GUIDES = Object.freeze({
  yo: Object.freeze([
    'Ọ̀nà RSA-OAEP àti AES-GCM yìí nílò kọ́kọ́rọ́ méjì, ó sì wà fún ọ̀rọ̀ kúkúrú. RSA-OAEP ló kọ́kọ́ fi ọ̀rọ̀ náà pamọ́; lẹ́yìn náà AES-256-GCM tó lo kọ́kọ́rọ́ ààbò rẹ ló bo àbájáde RSA. Ààmì rẹ̀ ni RSA3.',
    'Láti fi pamọ́, lo kọ́kọ́rọ́ gbogbogbò ẹni tó máa gba ọ̀rọ̀ náà, ṣàyẹ̀wò àmì SHA-256 rẹ̀ ní ọ̀nà mìíràn tó ṣeé gbẹ́kẹ̀ lé, tẹ kọ́kọ́rọ́ ààbò tí ẹ pín, kí o sì tẹ ọ̀rọ̀ kúkúrú tó bá ìwọ̀n kọ́kọ́rọ́ RSA mu. Pín ààmì RSA3 àti kọ́kọ́rọ́ ààbò lọ́tọ̀.',
    'Láti tú ààmì RSA3, lo kọ́kọ́rọ́ àṣírí RSA tó bá a mu àti kọ́kọ́rọ́ ààbò kan náà. A nílò méjèèjì. Ààlà ọ̀rọ̀ sinmi lórí ìwọ̀n kọ́kọ́rọ́ RSA; lo AES-GCM àti RSA-OAEP fún ọ̀rọ̀ tó gùn.'
  ]),
  ig: Object.freeze([
    'Usoro RSA-OAEP na AES-GCM a chọrọ igodo abụọ, ọ dịkwa mma naanị maka ozi dị mkpirikpi. RSA-OAEP na-ezochi ozi mbụ; AES-256-GCM nke paswọọdụ gị na-emesịa ezochi nsonaazụ RSA. Akara ya bụ RSA3.',
    'Iji zoo ozi, jiri igodo ọha onye ga-enweta ya ma nyochaa akara SHA-256 n’ụzọ ọzọ a pụrụ ịtụkwasị obi. Tinye paswọọdụ unu kwekọrịtara na obere ozi dabara na nha igodo RSA. Ziga akara RSA3 na paswọọdụ iche iche.',
    'Iji mepee akara RSA3, tinye igodo nzuzo RSA ziri ezi na otu paswọọdụ ahụ. A chọrọ ha abụọ. Oke ozi dabere na nha igodo RSA; jiri AES-GCM na RSA-OAEP maka ozi toro ogologo.'
  ]),
  ha: Object.freeze([
    'Wannan hanyar RSA-OAEP da AES-GCM tana buƙatar maɓallai biyu kuma ta dace da gajerun saƙonni kawai. RSA-OAEP na ɓoye saƙon farko; AES-256-GCM da kalmar sirrinka ta samar daga baya yana ɓoye sakamakon RSA. Alamar ita ce RSA3.',
    'Don ɓoyewa, yi amfani da maɓallin jama’a na mai karɓa kuma ka tabbatar da tambarin SHA-256 ta wata amintacciyar hanya. Shigar da kalmar sirrin da kuka amince da ita da gajeren saƙo da ya dace da girman RSA. A aika da alamar RSA3 da kalmar sirri dabam.',
    'Don buɗe RSA3, shigar da maɓallin RSA na sirri da ya dace da kalmar sirrin da aka yi amfani da ita. Ana buƙatar su duka. Iyakar saƙo ta danganta da girman maɓallin RSA; yi amfani da AES-GCM da RSA-OAEP don saƙonni masu tsawo.'
  ]),
  pcm: Object.freeze([
    'Dis RSA-OAEP plus AES-GCM method need two keys, and e good for short messages only. RSA-OAEP hide di message first; AES-256-GCM wey your passphrase derive go hide di RSA result after. Di token na RSA3.',
    'To encrypt, use di recipient public key and confirm di SHA-256 fingerprint through another trusted way. Put di shared access-key passphrase and short message wey fit di RSA key size. Send di RSA3 token and passphrase separately.',
    'To decrypt RSA3, you need both di matching RSA private key and di same access-key passphrase. Di message limit depend on di RSA key size; use AES-GCM plus RSA-OAEP Hybrid for longer messages.'
  ]),
  es: Object.freeze([
    'Este método RSA-OAEP + AES-GCM requiere dos claves y solo sirve para mensajes cortos. RSA-OAEP cifra primero el mensaje; después, AES-256-GCM, derivado de tu frase de acceso, cifra el resultado RSA. El formato es RSA3.',
    'Para cifrar, usa la clave pública del destinatario y verifica su huella SHA-256 por un canal de confianza independiente. Introduce la frase de acceso compartida y un mensaje dentro del límite de la clave RSA. Comparte el token RSA3 y la frase por separado.',
    'Para descifrar RSA3 necesitas tanto la clave privada RSA correspondiente como la misma frase de acceso. El límite del mensaje depende del tamaño de la clave RSA; usa AES-GCM + RSA-OAEP Hybrid para mensajes más largos.'
  ]),
  fr: Object.freeze([
    'Cette méthode RSA-OAEP + AES-GCM nécessite deux clés et convient uniquement aux messages courts. RSA-OAEP chiffre d’abord le message ; AES-256-GCM, dérivé de votre phrase d’accès, chiffre ensuite le résultat RSA. Le format est RSA3.',
    'Pour chiffrer, utilisez la clé publique du destinataire et vérifiez son empreinte SHA-256 par un canal indépendant fiable. Saisissez la phrase d’accès partagée et un message respectant la limite de la clé RSA. Partagez le jeton RSA3 et la phrase séparément.',
    'Pour déchiffrer RSA3, il faut la clé privée RSA correspondante et la même phrase d’accès. La limite dépend de la taille de la clé RSA ; utilisez AES-GCM + RSA-OAEP Hybrid pour les messages plus longs.'
  ])
});

function getLocalizedGuide(mode, language) {
  const translations = LOCALIZED_GUIDES[language];
  const selectedMode = NARRATION_GUIDES[mode] ? mode : 'aes';
  const key = selectedMode === 'hybrid';
  const action = key ? 'rsa' : selectedMode === 'legacy' ? 'legacy' : 'password';
  return Object.freeze([
    `${translations.intro} ${translations.facts[selectedMode]}`,
    translations[`${action}Encrypt`] || translations.encrypt,
    translations[`${action}Decrypt`] || translations.decrypt
  ]);
}

export function getNarrationGuide(mode, language = 'en', keyBits = 256, rsaKeyBits = 2048) {
  let guide;
  if (mode === 'rsa-aes') {
    guide = RSA_AES_LOCALIZED_GUIDES[language] || NARRATION_GUIDES['rsa-aes'];
  } else if (mode === 'rsa-direct') {
    guide = DIRECT_RSA_LOCALIZED_GUIDES[language] || NARRATION_GUIDES['rsa-direct'];
  } else if (LOCALIZED_GUIDES[language]) {
    guide = getLocalizedGuide(mode, language);
  } else {
    guide = NARRATION_GUIDES[mode] || NARRATION_GUIDES.aes;
  }
  if (mode === 'aes') return guide.map(line => line.replaceAll('AES-256-GCM', `AES-${keyBits}-GCM`));
  if (mode === 'hybrid' || mode === 'rsa-direct' || mode === 'rsa-aes') {
    const withRsaSize = [...guide];
    withRsaSize[0] = `${withRsaSize[0]} ${getRsaKeySizeNarration(language, rsaKeyBits)}`;
    if (mode === 'rsa-aes') {
      const maxBytes = rsaKeyBits / 8 - 66;
      const limits = {
        en: `A generated RSA-${rsaKeyBits} key allows up to ${maxBytes} UTF-8 bytes; pasted keys have their own limit.`,
        yo: `Pẹ̀lú kọ́kọ́rọ́ RSA-${rsaKeyBits} tí a ṣẹ̀dá, ààlà jẹ́ báítì ${maxBytes}; kọ́kọ́rọ́ tí a lẹ̀ mọ́ ní ààlà tirẹ̀.`,
        ig: `Igodo RSA-${rsaKeyBits} e mepụtara nwere oke byte ${maxBytes}; igodo ọha e tinyere nwere oke nke ya.`,
        ha: `Maɓallin RSA-${rsaKeyBits} da aka ƙirƙira yana da iyakar byte ${maxBytes}; maɓallan da aka manna suna da nasu iyaka.`,
        pcm: `Generated RSA-${rsaKeyBits} key fit carry up to ${maxBytes} UTF-8 bytes; pasted keys get their own limit.`,
        es: `Una clave RSA-${rsaKeyBits} generada admite hasta ${maxBytes} bytes UTF-8; las claves pegadas tienen su propio límite.`,
        fr: `Une clé RSA-${rsaKeyBits} générée accepte jusqu’à ${maxBytes} octets UTF-8 ; les clés collées ont leur propre limite.`
      };
      withRsaSize[2] = `${withRsaSize[2]} ${limits[language] || limits.en}`;
    }
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

function getControlNarration(id, language) {
  const controls = {
    en: {
      narration: 'Narration control. Turn it on to hear guidance for the selected method and focused controls.',
      narrationLanguage: 'Narration language selector. Choose the language for spoken guidance.',
      soundEffects: 'Sound effects control. Turn optional interface sounds on or off; sounds do not contain message information.',
      accessKeyVisibility: 'Access-key visibility control. It reveals or masks the key currently entered on screen.'
    },
    yo: {
      narration: 'Bọ́tìnì ìtàn ohùn. Tẹ̀ ẹ́ láti gbọ́ ìtọ́sọ́nà nípa ọ̀nà tí a yàn àti àwọn ohun èlò tí o dojú kọ.',
      narrationLanguage: 'Aṣàyàn èdè ìtàn ohùn. Yan èdè tí ìtọ́sọ́nà yóò lò.',
      soundEffects: 'Bọ́tìnì ìró. Tan tàbí pa àwọn ìró ìṣàkóso àṣàyàn; wọn kò ní ìsọfúnni ìfiránṣẹ́.',
      accessKeyVisibility: 'Bọ́tìnì hàn tàbí fi kọ́kọ́rọ́ ààbò pamọ́. Ó ń fi kọ́kọ́rọ́ tí o tẹ̀ sí ojú ìwé hàn tàbí bo ó.'
    },
    ig: {
      narration: 'Bọtịnụ olu. Gbanye ya ka ị nụ ntuziaka gbasara usoro ahọpụtara na njikwa ị lekwasịrị anya.',
      narrationLanguage: 'Nhọrọ asụsụ olu. Họrọ asụsụ ntuziaka ga-eji.',
      soundEffects: 'Njikwa ụda. Gbanye ma ọ bụ mechie ụda nhọrọ; ụda anaghị ebu ozi ozi gị.',
      accessKeyVisibility: 'Njikwa igosi ma ọ bụ zoo igodo nzuzo. Ọ na-egosi ma ọ bụ zoo igodo i tinyere na ihuenyo.'
    },
    ha: {
      narration: 'Maɓallin jagorar murya. Kunna shi don jin bayani kan hanyar da aka zaɓa da abubuwan da ka mayar da hankali a kansu.',
      narrationLanguage: 'Zaɓin yaren jagorar murya. Zaɓi yaren da jagorar za ta yi amfani da shi.',
      soundEffects: 'Maɓallin sauti. Kunna ko kashe sautukan mu’amala na zaɓi; ba sa ƙunsar bayanin saƙonka.',
      accessKeyVisibility: 'Maɓallin nuna ko ɓoye maɓallin sirri. Yana nuna ko ɓoye abin da ka shigar a allon.'
    },
    pcm: {
      narration: 'Narration control. On am to hear guide for di method wey you choose and di control wey you focus.',
      narrationLanguage: 'Narration language selector. Choose di language wey narration go use.',
      soundEffects: 'Sound effects control. Turn optional interface sounds on or off; dem no carry your message information.',
      accessKeyVisibility: 'Access key visibility control. E fit show or hide di key wey you type for di screen.'
    },
    es: {
      narration: 'Control de narración. Actívalo para escuchar indicaciones sobre el método seleccionado y los controles enfocados.',
      narrationLanguage: 'Selector del idioma de narración. Elige el idioma de las indicaciones habladas.',
      soundEffects: 'Control de efectos de sonido. Activa o desactiva los sonidos opcionales de la interfaz; no contienen información del mensaje.',
      accessKeyVisibility: 'Control para mostrar u ocultar la clave de acceso introducida en pantalla.'
    },
    fr: {
      narration: 'Commande de narration. Activez-la pour entendre les conseils sur la méthode sélectionnée et les commandes ciblées.',
      narrationLanguage: 'Sélecteur de langue de narration. Choisissez la langue des conseils vocaux.',
      soundEffects: 'Commande des effets sonores. Activez ou désactivez les sons facultatifs de l’interface ; ils ne contiennent aucune information du message.',
      accessKeyVisibility: 'Commande permettant d’afficher ou de masquer la clé d’accès saisie à l’écran.'
    }
  };
  const keyById = {
    voxB: 'narration',
    narrLanguage: 'narrationLanguage',
    sfxB: 'soundEffects',
    eye: 'accessKeyVisibility'
  }[id];
  return keyById ? controls[language]?.[keyById] || controls.en[keyById] : null;
}

function getRsaKeySizeNarration(language, keyBits) {
  const maxBytes = keyBits / 8 - 66;
  const phrases = {
    en: `RSA key-size selector. New key pairs generated here will use ${keyBits}-bit RSA. Direct RSA and RSA3 dual-key messages allow up to ${maxBytes} UTF-8 bytes with this size. Pasted or imported keys keep their own size and limit. Keys below 2048 bits are not supported.`,
    yo: `Aṣàyàn ìwọ̀n kọ́kọ́rọ́ RSA. Àwọn kọ́kọ́rọ́ tuntun tí a ṣẹ̀dá níbí yóò jẹ́ RSA bítì ${keyBits}. RSA tààrà àti ìfiránṣẹ́ RSA3 nílò báítì UTF-8 tó pọ̀ jù ${maxBytes} fún ìwọ̀n yìí. Kọ́kọ́rọ́ tí a lẹ̀ mọ́ tàbí kó wọlé ní ìwọ̀n àti ààlà tirẹ̀. A kò gba kọ́kọ́rọ́ tó kéré sí bítì 2048.`,
    ig: `Nhọrọ nha igodo RSA. Igodo ọhụrụ e mepụtara ebe a ga-eji RSA bit ${keyBits}. Ozi direct RSA na RSA3 nwere oke byte UTF-8 ${maxBytes} na nha a. Igodo e tinyere ma ọ bụ bubata nwere nha na oke nke ha. A naghị akwado igodo na-erughị bit 2048.`,
    ha: `Zaɓin girman maɓallin RSA. Sabbin maɓallan da aka ƙirƙira a nan za su yi amfani da RSA mai bit ${keyBits}. Saƙonnin direct RSA da RSA3 suna da iyakar byte UTF-8 ${maxBytes} a wannan girman. Maɓallan da aka manna ko shigo da su suna da nasu girma da iyaka. Ba a tallafa wa ƙasa da bit 2048 ba.`,
    pcm: `RSA key size option. New key pairs wey you generate here go use ${keyBits}-bit RSA. Direct RSA and RSA3 dual-key message fit get up to ${maxBytes} UTF-8 bytes for dis size. Pasted or imported keys get their own size and limit. We no support keys below 2048 bits.`,
    es: `Selector del tamaño de clave RSA. Los pares nuevos generados aquí usarán RSA de ${keyBits} bits. Los mensajes RSA directos y RSA3 admiten hasta ${maxBytes} bytes UTF-8 con este tamaño. Las claves pegadas o importadas tienen su propio tamaño y límite. No se admiten claves inferiores a 2048 bits.`,
    fr: `Sélecteur de taille de clé RSA. Les nouvelles paires générées ici utiliseront RSA ${keyBits} bits. Les messages RSA direct et RSA3 acceptent jusqu’à ${maxBytes} octets UTF-8 avec cette taille. Les clés collées ou importées ont leur propre taille et leur propre limite. Les clés de moins de 2048 bits ne sont pas prises en charge.`
  };
  return phrases[language] || phrases.en;
}

function getRsaGeneratedNarration(language, keyBits, mode) {
  const maxBytes = keyBits / 8 - 66;
  const message = STATUS_NARRATION[language]?.rsaKeyGenerated || STATUS_NARRATION.en.rsaKeyGenerated;
  if (mode !== 'rsa-direct' && mode !== 'rsa-aes') return message;
  const limit = {
    en: `This ${keyBits}-bit key allows up to ${maxBytes} UTF-8 bytes for this short-message method.`,
    yo: `Kọ́kọ́rọ́ bítì ${keyBits} yìí gba báítì UTF-8 tó pọ̀ jù ${maxBytes} fún ọ̀nà ìfiránṣẹ́ kúkúrú yìí.`,
    ig: `Igodo bit ${keyBits} a nwere oke byte UTF-8 ${maxBytes} maka usoro ozi dị mkpirikpi a.`,
    ha: `Wannan maɓallin bit ${keyBits} yana da iyakar byte UTF-8 ${maxBytes} ga wannan hanyar saƙo gajere.`,
    pcm: `Dis ${keyBits}-bit key fit carry up to ${maxBytes} UTF-8 bytes for dis short-message method.`,
    es: `Esta clave de ${keyBits} bits admite hasta ${maxBytes} bytes UTF-8 para este método de mensajes cortos.`,
    fr: `Cette clé de ${keyBits} bits accepte jusqu’à ${maxBytes} octets UTF-8 pour cette méthode de messages courts.`
  }[language] || `This ${keyBits}-bit key allows up to ${maxBytes} UTF-8 bytes for this short-message method.`;
  return `${message} ${limit}`;
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

  function failNarration(generation) {
    if (generation !== narrationGeneration) return;
    narrationEnabled = false;
    stopNarration();
    resetNarrationToggle();
    audioStatus.textContent = 'Narration could not play. Check your browser speech settings.';
    audioStatus.classList.add('error');
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
        failNarration(generation);
      };
      window.speechSynthesis.speak(utterance);
    } catch {
      failNarration(generation);
    }
  }

  function startNarration() {
    if (!speech) throw new Error('speech-unavailable');
    if (narrationRunning) return true;
    audioStatus.textContent = '';
    audioStatus.classList.remove('error');
    narrationEnabled = true;
    narrationRunning = true;
    say(++narrationGeneration);
    return narrationRunning;
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
    if (!target || typeof target.closest !== 'function') return null;
    const element = target.closest('input,textarea,select,button,label,.field-hint,.otext,.audio-status');
    if (!element) return null;
    const id = element.tagName === 'LABEL' ? element.htmlFor : element.id;
    const controlNarration = getControlNarration(id, narrationLanguage);
    if (controlNarration) return controlNarration;
    if (narrationLanguage !== 'en') {
      if (id === 'mode' || id === 'modeHint') return narrationGuide[0];
      if (id === 'aesKeySize' || id === 'aesKeySizeHint') return getKeySizeNarration(narrationLanguage, narrationKeyBits);
      if (id === 'rsaKeySize' || id === 'rsaKeySizeHint') {
        return getRsaKeySizeNarration(narrationLanguage, narrationRsaKeyBits);
      }
      if (id === 'key' || id === 'keyHint') {
        if (narrationMode === 'rsa-aes') return narrationGuide[1];
        return narrationMode === 'hybrid' || narrationMode === 'rsa-direct'
          ? narrationGuide[2]
          : narrationGuide[1];
      }
      if (id === 'decB' || id === 'rsaPrivate' || id === 'copyPrivate') return narrationGuide[2];
      if (id === 'encB' || id === 'inp' || id === 'rsaPublic' || id === 'generateRsa' || id === 'copyPublic') {
        return narrationGuide[1];
      }
      if (id === 'fileInput' || id === 'fileHint' || id === 'fileStatus' ||
          id === 'fileEncrypt' || id === 'fileDecrypt') {
        return getNarrationGuide('aes', narrationLanguage, narrationKeyBits)[2];
      }
      if (id === 'operationStatus') return $('operationStatus').textContent || narrationGuide[0];
      if (id === 'migrationStatus') return $('migrationStatus').textContent || narrationGuide[0];
      if (id === 'audioStatus') return $('audioStatus').textContent || getControlNarration('voxB', narrationLanguage);
      return narrationGuide[0];
    }
    const method = NARRATION_GUIDES[narrationMode];
    const why = {
      aes: 'AES-GCM is the recommended password-based choice because encryption and tamper detection are built into one widely supported mode.',
      cbc: 'CBC with HMAC is provided for compatibility with CBC-based workflows; AES-GCM is generally simpler for new messages.',
      'rsa-direct': 'RSA-OAEP direct encryption encrypts the message itself and is limited to short messages: at most 190 UTF-8 bytes with a 2048-bit key. Choose AES-GCM + RSA-OAEP Hybrid for longer messages.',
      'rsa-aes': 'RSA-OAEP encrypts the short message first, then AES-GCM encrypts that RSA ciphertext using a key derived from a shared passphrase. Decryption requires both the recipient private key and that passphrase; this RSA3 format is limited by the RSA message-size limit.',
      hybrid: 'AES-GCM + RSA-OAEP is the recommended public-key method, using RSA public-key delivery for a fresh AES-GCM key. The sender and recipient do not need to share a message passphrase.',
      legacy: 'Grumpy v2 is not better for security. It is available for old-format compatibility and testing, but use AES-GCM or verified RSA hybrid encryption for new messages.'
    }[narrationMode];
    const accessKey = narrationMode === 'rsa-aes'
      ? 'This dual-key mode requires a shared passphrase for its AES-GCM layer as well as the recipient RSA private key.'
      : narrationMode === 'hybrid' || narrationMode === 'rsa-direct'
      ? 'The access key is not used for RSA text messages. It is used for file encryption and password-based modes.'
      : narrationMode === 'legacy'
        ? 'For Grumpy v2 compatibility or testing, enter the legacy key. This cipher is insecure, does not reliably protect confidentiality or detect tampering, and is not suitable for new or sensitive messages.'
        : 'The access key is the passphrase from which this mode derives its encryption key. Use a long, unique passphrase and share it separately from the encrypted token.';
    const guides = {
      mode: `Encryption method selector. ${method[0]} ${why}`,
      modeHint: `${method[0]} ${why}`,
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
      rsaPrivate: 'Private-key PEM field. Paste a matching PKCS#8 private key here to decrypt RSA messages, including direct and hybrid RSA tokens. Never share this key. Exportable private keys are visible in this page and need a secure backup.',
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
    if (id === 'narrLanguage') return getControlNarration(id, narrationLanguage);
    if (id === 'voxB') return getControlNarration(id, narrationLanguage);
    if (id === 'sfxB') return getControlNarration(id, narrationLanguage);
    if (id === 'eye') return getControlNarration(id, narrationLanguage);
    if (id === 'aesKeySizeHint') return guides.aesKeySize;
    if (id === 'aesKeySize' || id === 'rsaKeySize') return guides[id];
    if (id === 'key') return `${guides.key} ${why}`;
    if (id === 'rsaPublic') return `${guides.rsaPublic} ${why}`;
    if (id === 'keyHint') return `Access key guidance. ${accessKey} ${why}`;
    if (id === 'rsaKeyModeHint' || id === 'rsaKeySummary' || id === 'rsaBackupReminder') return guides.rsaKeyMode;
    if (id === 'fingerprintStatus') return guides.rsaFingerprint;
    if (id === 'fileHint') return guides.fileInput;
    if (id === 'fileStatus') return $('fileStatus').textContent || guides.fileInput;
    if (id === 'operationStatus') return $('operationStatus').textContent || guides.mode;
    if (id === 'migrationStatus') return $('migrationStatus').textContent || guides.migrateLegacy;
    if (id === 'audioStatus') return $('audioStatus').textContent || getControlNarration('voxB', 'en');
    if (id === 'fileInput' || id === 'fileEncrypt' || id === 'fileDecrypt') return guides[id];
    if (id === 'encB' || id === 'decB' || id === 'inp' || id === 'key' || id === 'mode' || id === 'modeHint') {
      return guides[id];
    }
    if (id === 'rsaPublic' || id === 'rsaPrivate' || id === 'rsaKeyMode' ||
        id === 'rsaKeySize' || id === 'rsaKeySizeHint' || id === 'generateRsa' ||
        id === 'copyPublic' || id === 'copyPrivate' || id === 'rsaFingerprint') {
      return guides[id];
    }
    if (id === 'clrB' || id === 'copy' || id === 'downloadToken' || id === 'out' || id === 'migrateLegacy') return guides[id];
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
        failNarration(generation);
      };
      window.speechSynthesis.speak(utterance);
    } catch {
      failNarration(generation);
    }
  }

  function announceContext(event) {
    if (event.type === 'click' &&
        event.target.closest?.('input,textarea,select,button')) return;
    announceMessage(getContextualGuide(event.target));
  }

  function announceStatus(status) {
    const message = status === 'rsaKeyGenerated'
      ? getRsaGeneratedNarration(narrationLanguage, narrationRsaKeyBits, narrationMode)
      : STATUS_NARRATION[narrationLanguage]?.[status];
    if (!message) return false;
    announceMessage(message);
    return true;
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
        if (button.id === 'voxB') {
          narrationEnabled = false;
          stopNarration();
        }
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
      return startNarration();
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
    announceStatus,
    reset() {
      soundEffects = narrationEnabled = false;
      stopNarration();
      toggles.forEach(reset => reset());
      if (context && context.state !== 'closed') context.suspend().catch(reportError);
    }
  }
}
