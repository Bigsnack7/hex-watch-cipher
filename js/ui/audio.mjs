import { countPassphraseCharacters, estimatePassphraseStrength } from '../passphrase.mjs';

export const NARRATION_GUIDES = Object.freeze({
  aes: Object.freeze([
    'AES-256-GCM is the recommended choice for a new message protected by an access key. It scrambles the message and checks for changes. If the key is wrong or someone changes the encrypted message, the app will not open it.',
    'To protect a message, enter a long access key that you do not use anywhere else, type your message, and choose Encrypt message. Send the encrypted result and the access key separately. Anyone who gets both can read the message.',
    'To read a protected message, paste the complete encrypted result into the message box, enter the same access key, and choose Decrypt message. Older CT4, CT3, CT2, and CT1 messages are also supported. File encryption has its own controls and always uses AES-GCM.'
  ]),
  cbc: Object.freeze([
    'This compatibility encryption option uses AES-CBC and a separate check to detect changes. New tokens use CBC5 with Argon2id (128 MiB memory, 3 passes); older CBC4, CBC3, CBC2, and CBC1 tokens can still be opened. For new messages, AES-GCM is the simpler recommended choice.',
    'To protect a message, enter a long access key that you do not use anywhere else, type your message, and choose Encrypt message. Send the encrypted result and the access key separately. Anyone who gets both can read the message.',
    'To read a protected message, paste the complete CBC5, CBC4, CBC3, CBC2, or CBC1 result into the message box, enter the same access key, and choose Decrypt message. A wrong key or changed result will be rejected. File encryption always uses AES-GCM.'
  ]),
  hybrid: Object.freeze([
    'This is the recommended way to send a message to someone without sharing an access key. The app scrambles the message with a new one-time key, then protects that key using the recipient’s public key.',
    'To send a message, use the recipient’s public key. Before trusting it, compare its full fingerprint with the recipient using a separate trusted way, such as a phone call. Type your message and choose Encrypt message.',
    'Send the encrypted RSA1 result to the recipient. Never send your private key. To read the message, the recipient needs the matching private key. The access-key box is not used for this message method.'
  ]),
  'rsa-direct': Object.freeze([
    'This method locks the message directly with the recipient’s public key. It is only for short messages: with a 2048-bit key, the limit is 190 bytes. Letters and symbols can use more than one byte, so a message may reach the limit sooner than expected. Use the hybrid method for longer messages.',
    'To send a short message, use the recipient’s public key and confirm its full fingerprint through a separate trusted way. Keep the message within the displayed limit, then choose Encrypt message. Send the RSA2 result, never the private key.',
    'To read an RSA2 message, the recipient needs the matching private key and chooses Decrypt message. The access-key box is not used. For a longer message, choose the hybrid method.'
  ]),
  'rsa-aes': Object.freeze([
    'This special dual-key format is for short messages. It uses the recipient’s public key and a shared access key together. Both are needed to read the message, and the message still has a size limit. For most new messages, choose the hybrid method instead.',
    'To protect a message, use the recipient’s public key, confirm its full fingerprint through a separate trusted way, enter the shared access key, and keep the message within the displayed limit. Send the encrypted RSA6 result and access key separately.',
    'To read an RSA6, RSA5, RSA4, or RSA3 message, the recipient needs both the matching private key and the same access key. The message limit depends on the public key. For longer messages, choose the hybrid method.'
  ]),
  legacy: Object.freeze([
    'This old method is not safe. It may fail to keep a message secret and cannot reliably show whether someone changed it. Use it only to open old messages or for testing. Never use it for private or important information.',
    'To work with an old message, choose this method, enter its old key, and choose Decrypt message. This method is unsafe for new messages, even if you choose a strong key.',
    'For a new message, choose AES-GCM or the hybrid method. After opening an old message, choose Prepare AES-GCM migration, enter a new long access key, and encrypt it again. File encryption always uses AES-GCM.'
  ])
});

const NARRATION_METHOD_NAMES = Object.freeze({
  aes: 'AES-GCM, passphrase-based',
  cbc: 'AES-CBC with HMAC, compatibility mode',
  hybrid: 'AES-GCM with RSA-OAEP, hybrid',
  'rsa-direct': 'RSA-OAEP, direct encryption',
  'rsa-aes': 'RSA-OAEP with AES-GCM, dual-key',
  legacy: 'Grumpy v2, legacy cipher'
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

const HASH_CONTROL_NARRATION = Object.freeze({
  en: Object.freeze({
    hashDropzone: 'File check area. Choose or drop files to calculate their digests on this device.',
    hashInput: 'Choose files to check. The selected digest methods will run in your browser.',
    hashSelected: 'Selected files ready for a local digest check.',
    hashOutput: 'File check results. Compare the complete digest with one from a source you trust.'
  }),
  yo: Object.freeze({
    hashDropzone: 'Ààyè àyẹ̀wò fáìlì. Yan fáìlì tàbí fà á síbí láti ṣe ààmì rẹ̀ lórí ẹ̀rọ yìí.',
    hashInput: 'Yan àwọn fáìlì láti ṣàyẹ̀wò. A ó ṣe ààmì wọn lórí ẹ̀rọ aṣàwákiri rẹ.',
    hashSelected: 'Àwọn fáìlì tí a yàn ti ṣetán fún àyẹ̀wò ààmì lórí ẹ̀rọ yìí.',
    hashOutput: 'Àbájáde àyẹ̀wò fáìlì. Fi gbogbo ààmì wé èyí láti orísun tí o gbẹ́kẹ̀lé.'
  }),
  ig: Object.freeze({
    hashDropzone: 'Ebe nyocha faịlụ. Họrọ faịlụ ma ọ bụ dọkpụrụ ya ebe a ka ị gbakọọ akara ya na ngwaọrụ a.',
    hashInput: 'Họrọ faịlụ ị ga-enyocha. A ga-agbakọ akara ndị ahọpụtara na ihe nchọgharị gị.',
    hashSelected: 'Faịlụ ndị ahọpụtara adịla njikere maka nyocha akara na ngwaọrụ a.',
    hashOutput: 'Nsonaazụ nyocha faịlụ. Tụnyere akara ahụ dum na nke sitere n’ebe ị tụkwasịrị obi.'
  }),
  ha: Object.freeze({
    hashDropzone: 'Wurin duba fayil. Zaɓi fayil ko ja shi nan don lissafa lambarsa a wannan na’ura.',
    hashInput: 'Zaɓi fayilolin da za a duba. Za a lissafa lambobin da ka zaɓa a burauzarka.',
    hashSelected: 'Fayilolin da aka zaɓa sun shirya don duba lambobinsu a wannan na’ura.',
    hashOutput: 'Sakamakon duba fayil. Kwatanta cikakkiyar lambar da wadda ta fito daga amintaccen tushe.'
  }),
  pcm: Object.freeze({
    hashDropzone: 'File check area. Choose files or drop dem here to calculate di codes for this device.',
    hashInput: 'Choose files to check. Your browser go calculate di digest methods wey you select.',
    hashSelected: 'Di files wey you choose don ready for local file check.',
    hashOutput: 'File check result. Compare di full digest with one from trusted source.'
  }),
  es: Object.freeze({
    hashDropzone: 'Zona de comprobación. Selecciona archivos o arrástralos aquí para calcular sus resúmenes en este dispositivo.',
    hashInput: 'Selecciona los archivos que quieres comprobar. El navegador calculará los resúmenes elegidos.',
    hashSelected: 'Los archivos seleccionados están listos para una comprobación local.',
    hashOutput: 'Resultados de la comprobación. Compara el resumen completo con uno de una fuente de confianza.'
  }),
  fr: Object.freeze({
    hashDropzone: 'Zone de vérification. Choisissez des fichiers ou déposez-les ici pour calculer leurs empreintes sur cet appareil.',
    hashInput: 'Choisissez les fichiers à vérifier. Le navigateur calculera les empreintes sélectionnées.',
    hashSelected: 'Les fichiers sélectionnés sont prêts pour une vérification locale.',
    hashOutput: 'Résultats de la vérification. Comparez l’empreinte complète à celle d’une source fiable.'
  })
});

const PASSPHRASE_STRENGTH_NARRATION = Object.freeze({
  en: {
    generated: 'Secure passphrase generated.',
    estimate: 'Access-key estimate',
    weak: 'weak',
    fair: 'fair',
    good: 'good',
    strong: 'strong',
    characters: 'characters',
    add: 'Add',
    remove: 'Remove',
    meetLength: 'to meet the selected length.',
    optionalLength: 'This is the passphrase generator target, not a requirement.',
    lengthMet: 'The selected length is met.',
    unique: 'The selected length is met. Use a unique passphrase; this estimate cannot detect reuse or personal information.',
    disclaimer: 'This is a rough estimate, not a password audit.'
  },
  yo: {
    generated: 'A ti dá ọ̀rọ̀ aṣínà ààbò tuntun.',
    estimate: 'Ìṣírò agbára kọ́kọ́rọ́',
    weak: 'kò lágbára',
    fair: 'dédé',
    good: 'dára',
    strong: 'lágbára',
    characters: 'ẹ̀yà ọ̀rọ̀',
    add: 'Fi',
    remove: 'Yọ',
    meetLength: 'kún láti bá gígùn tí a yàn mu.',
    optionalLength: 'Èyí ni gígùn tí ohun èlò dídá ọ̀rọ̀ aṣínà fẹ́ lò; kì í ṣe ohun tí a nílò.',
    lengthMet: 'Gígùn tí a yàn bá mu.',
    unique: 'Gígùn tí a yàn bá mu. Lo ọ̀rọ̀ aṣínà aláìlẹ́gbẹ́; ìṣírò yìí kò lè mọ̀ bóyá a tún lò ó tàbí bóyá ó ní ìsọfúnni ara ẹni.',
    disclaimer: 'Ìṣírò yìí jẹ́ ìfojúsùn lasán, kì í ṣe àyẹ̀wò ọ̀rọ̀ aṣínà.'
  },
  ig: {
    generated: 'Emeela paswọọdụ nchekwa ọhụrụ.',
    estimate: 'Ntụle ike igodo',
    weak: 'adịghị ike',
    fair: 'nkezi',
    good: 'dị mma',
    strong: 'siri ike',
    characters: 'akara',
    add: 'Tinye',
    remove: 'Wepụ',
    meetLength: 'ka i kwekọọ n’ogologo a họọrọ.',
    optionalLength: 'Nke a bụ ogologo ngwa imepụta paswọọdụ chọrọ, ọ bụghị ihe achọrọ.',
    lengthMet: 'Ogologo a họọrọ zuru oke.',
    unique: 'Ogologo a họọrọ zuru oke. Jiri paswọọdụ pụrụ iche; ntụle a agaghị amata ma ejirila ya ọzọ ma ọ bụ ma o nwere ozi nkeonwe.',
    disclaimer: 'Nke a bụ naanị atụmatụ, ọ bụghị nyocha paswọọdụ.'
  },
  ha: {
    generated: 'An ƙirƙiri sabon kalmar sirri mai tsaro.',
    estimate: 'Ƙiyasin ƙarfin maɓalli',
    weak: 'rauni',
    fair: 'matsakaici',
    good: 'mai kyau',
    strong: 'mai ƙarfi',
    characters: 'haruffa',
    add: 'Ƙara',
    remove: 'Cire',
    meetLength: 'don cika tsawon da aka zaɓa.',
    optionalLength: 'Wannan tsawon da aka zaɓa na jagorar ƙirƙirar kalmar sirri ne, ba tilas ba ne.',
    lengthMet: 'An cika tsawon da aka zaɓa.',
    unique: 'An cika tsawon da aka zaɓa. Yi amfani da kalmar sirri ta musamman; wannan ƙiyasin ba zai iya gano sake amfani ko bayanan mutum ba.',
    disclaimer: 'Wannan ƙiyasin ne kawai, ba cikakken binciken kalmar sirri ba.'
  },
  pcm: {
    generated: 'Secure passphrase don generate.',
    estimate: 'Access-key estimate',
    weak: 'weak',
    fair: 'fair',
    good: 'good',
    strong: 'strong',
    characters: 'characters',
    add: 'Add',
    remove: 'Remove',
    meetLength: 'to meet di selected length.',
    optionalLength: 'Na di length wey passphrase generator go use; e no be requirement.',
    lengthMet: 'Di selected length don correct.',
    unique: 'Di selected length don correct. Use unique passphrase; dis estimate no fit know if you don use am before or if e get personal information.',
    disclaimer: 'Na rough estimate, no be password audit.'
  },
  es: {
    generated: 'Se generó una frase de acceso segura.',
    estimate: 'Estimación de la clave',
    weak: 'débil',
    fair: 'regular',
    good: 'buena',
    strong: 'fuerte',
    characters: 'caracteres',
    add: 'Añade',
    remove: 'Quita',
    meetLength: 'para alcanzar la longitud seleccionada.',
    optionalLength: 'Esta es la longitud objetivo del generador, no un requisito.',
    lengthMet: 'La longitud seleccionada está completa.',
    unique: 'La longitud seleccionada está completa. Usa una frase única; esta estimación no detecta reutilización ni datos personales.',
    disclaimer: 'Es una estimación aproximada, no una auditoría de contraseñas.'
  },
  fr: {
    generated: 'Une phrase secrète sécurisée a été générée.',
    estimate: 'Estimation de la clé',
    weak: 'faible',
    fair: 'moyenne',
    good: 'bonne',
    strong: 'forte',
    characters: 'caractères',
    add: 'Ajoutez',
    remove: 'Retirez',
    meetLength: 'pour atteindre la longueur choisie.',
    optionalLength: 'Il s’agit de la longueur cible du générateur, pas d’une exigence.',
    lengthMet: 'La longueur choisie est atteinte.',
    unique: 'La longueur choisie est atteinte. Utilisez une phrase unique ; cette estimation ne détecte pas la réutilisation ni les informations personnelles.',
    disclaimer: 'Il s’agit d’une estimation, pas d’un audit de mot de passe.'
  }
});

const SIGNATURE_EVENT_NARRATION = Object.freeze({
  en: Object.freeze({
    signingEnabled: 'Signing is enabled. The message must use a supported encryption method and a matching ECDSA private and public key pair.',
    signingDisabled: 'Signing is disabled. New messages will not include a sender signature.',
    keyGenerated: 'ECDSA P-256 signing keys are ready. The private key is held in memory and will be lost when the page locks, closes, or reloads. Share only the public key, and compare its full fingerprint through a trusted channel.',
    keyGeneratedExportable: 'ECDSA P-256 signing keys are ready. The private-key backup is visible. Store it securely and never share it. Share only the public key, and compare its fingerprint through a trusted channel.',
    keyGenerationFailed: 'The ECDSA signing key could not be generated. Check browser support and try again.',
    exportModeSelected: 'Exportable PEM is selected for the next generated signing key. Its private-key backup will be visible and must be stored securely.',
    memoryModeSelected: 'Non-extractable memory-only storage is selected for the next generated signing key. The private key cannot be backed up and will be lost when the page closes or locks.',
    signed: 'The encrypted message was signed. Share the signed token and public signing key separately. Recipients should compare the complete key fingerprint through a trusted channel.',
    verified: 'The signature is valid. The token is still encrypted. Confirm the signer by comparing the complete public-key fingerprint through a trusted channel.',
    decrypted: 'The signature was valid and the message has been decrypted. The signer identity is confirmed only if you trust the complete public-key fingerprint.',
    decryptionFailed: 'The signature is valid, but the encrypted message could not be decrypted. Check the decryption key; the token remains encrypted.',
    unsigned: 'The message is unsigned. Its sender identity has not been verified.',
    failed: 'Signature verification failed. Do not treat this message as authenticated. Check the signature and the public signing key.',
    keyMismatch: 'Signing stopped because the private signing key does not match the displayed public key. Restore the matching public key or import the corresponding private key.',
    unsupported: 'Digital signatures are not available for Grumpy v2. Choose a supported modern encryption method.',
    publicCopied: 'The public signing key was copied. Share only this key, and compare its fingerprint through a separate trusted channel.',
    privateCopied: 'The private signing key backup was copied. Keep it secret; anyone with it can create signatures for this key.',
    copyFailed: 'The signing key could not be copied. It is selected for manual copying; check carefully whether it is public or private before sharing.',
    publicKeyReady: 'The ECDSA public-key fingerprint is ready. Compare the complete fingerprint with the claimed signer through a separate trusted channel.',
    publicKeyInvalid: 'The ECDSA public key is not valid P-256 public-key PEM. Check the key before verifying a signature.',
    summary: 'Digital signatures optionally sign encrypted message tokens with ECDSA P-256. Verification checks the token before decryption. A valid signature identifies a key, not its owner; verify the full fingerprint through a separate trusted channel.'
  }),
  yo: Object.freeze({
    signingEnabled: 'Ìfọwọ́sí ti ṣiṣẹ́. Ọ̀nà ìpamọ́ tó bá a mu àti àwọn kọ́kọ́rọ́ ECDSA àdáni àti gbogbogbò tí wọ́n bá ara wọn mu ni a nílò.',
    signingDisabled: 'Ìfọwọ́sí ti pa. Àwọn ìfiránṣẹ́ tuntun kò ní ní ìfọwọ́sí olùránṣẹ́.',
    keyGenerated: 'Àwọn kọ́kọ́rọ́ ìfọwọ́sí ECDSA P-256 ti ṣetán. Kọ́kọ́rọ́ àdáni wà nínú ìrántí fún ìgbà díẹ̀, yóò sì sọnù nígbà tí ojú ìwé bá tiipa tàbí tún bẹ̀rẹ̀. Pín kọ́kọ́rọ́ gbogbogbò nìkan, kí o sì fi gbogbo àfọwọ́kọ ìkawe rẹ̀ wé ti olùránṣẹ́ ní ọ̀nà tí o gbẹ́kẹ̀lé.',
    keyGeneratedExportable: 'Àwọn kọ́kọ́rọ́ ìfọwọ́sí ECDSA P-256 ti ṣetán. Ẹ̀dà ààbò kọ́kọ́rọ́ àdáni hàn; tọ́jú rẹ̀ dáadáa, má sì pín in. Pín kọ́kọ́rọ́ gbogbogbò nìkan.',
    keyGenerationFailed: 'A kò lè dá kọ́kọ́rọ́ ìfọwọ́sí ECDSA. Ṣàyẹ̀wò ẹ̀rọ aṣàwákiri kí o sì tún gbìyànjú.',
    exportModeSelected: 'A ti yan PEM tó ṣeé gbé jáde fún kọ́kọ́rọ́ ìfọwọ́sí tuntun. Ẹ̀dà ààbò àdáni yóò hàn; tọ́jú rẹ̀ dáadáa.',
    memoryModeSelected: 'A ti yan ìtọ́jú inú ìrántí fún kọ́kọ́rọ́ ìfọwọ́sí tuntun. A kò lè ṣe ẹ̀dà ààbò, yóò sì sọnù tí ojú ìwé bá tiipa.',
    signed: 'A ti fọwọ́sí ìfiránṣẹ́ ìpamọ́. Pín token àti kọ́kọ́rọ́ gbogbogbò lọ́tọ̀. Olùgbà gbọ́dọ̀ fi gbogbo àfọwọ́kọ ìkawe wé ti olùránṣẹ́ ní ọ̀nà tí ó gbẹ́kẹ̀lé.',
    verified: 'Ìfọwọ́sí náà tọ́. Token náà ṣì wà ní ìpamọ́. Fi gbogbo àfọwọ́kọ ìkawe kọ́kọ́rọ́ gbogbogbò wé ti olùránṣẹ́ ní ọ̀nà tí ó gbẹ́kẹ̀lé.',
    decrypted: 'Ìfọwọ́sí náà tọ́, a sì ti ṣí ìfiránṣẹ́ náà. Ìdánimọ̀ olùránṣẹ́ dá lórí bóyá o gbẹ́kẹ̀lé àfọwọ́kọ ìkawe rẹ̀.',
    decryptionFailed: 'Ìfọwọ́sí náà tọ́, ṣùgbọ́n a kò lè ṣí ìfiránṣẹ́ náà. Ṣàyẹ̀wò kọ́kọ́rọ́ ṣíṣí; token náà ṣì wà ní ìpamọ́.',
    unsigned: 'A kò fọwọ́sí ìfiránṣẹ́ náà. A kò tíì jẹ́rìí ìdánimọ̀ olùránṣẹ́.',
    failed: 'Ìfọwọ́sí kò tọ́. Má ṣe gbà pé ìfiránṣẹ́ yìí jẹ́ òótọ́. Ṣàyẹ̀wò kọ́kọ́rọ́ gbogbogbò àti ìfọwọ́sí.',
    keyMismatch: 'A dá ìfọwọ́sí dúró nítorí kọ́kọ́rọ́ àdáni kò bá kọ́kọ́rọ́ gbogbogbò tó wà lójú ìwé mu. Padà sí kọ́kọ́rọ́ tó tọ́.',
    unsupported: 'A kò lè fọwọ́sí Grumpy v2. Yan ọ̀nà ìpamọ́ tuntun tó bá a mu.',
    publicCopied: 'A ti da kọ́kọ́rọ́ gbogbogbò sí clipboard. Pín èyí nìkan, kí o sì fi àfọwọ́kọ ìkawe rẹ̀ wé ti olùránṣẹ́.',
    privateCopied: 'A ti da ẹ̀dà ààbò kọ́kọ́rọ́ àdáni sí clipboard. Pa á mọ́; ẹni tó bá ní i lè dá ìfọwọ́sí sílẹ̀.',
    copyFailed: 'A kò lè da kọ́kọ́rọ́ ìfọwọ́sí sí clipboard. Ṣàyẹ̀wò bóyá kọ́kọ́rọ́ náà jẹ́ àdáni tàbí gbogbogbò kí o tó pín in.',
    publicKeyReady: 'Àfọwọ́kọ ìkawe kọ́kọ́rọ́ gbogbogbò ti ṣetán. Fi gbogbo rẹ̀ wé ti olùránṣẹ́ ní ọ̀nà tí o gbẹ́kẹ̀lé.',
    publicKeyInvalid: 'Kọ́kọ́rọ́ gbogbogbò ECDSA P-256 kò tọ́. Ṣàyẹ̀wò rẹ̀ kí o tó fọwọ́sí ìfiránṣẹ́.',
    summary: 'Ìfọwọ́sí àṣàyàn máa ń fọwọ́sí token ìfiránṣẹ́ ìpamọ́ pẹ̀lú ECDSA P-256. Ìfọwọ́sí dá kọ́kọ́rọ́ mọ̀, kì í ṣe ẹni tó ní i; fi gbogbo àfọwọ́kọ ìkawe wé ní ọ̀nà tí o gbẹ́kẹ̀lé.'
  }),
  ig: Object.freeze({
    signingEnabled: 'Agbanyere mbinye aka. A ga-achọ usoro nzuzo akwadoro na igodo nzuzo na nke ọha ECDSA dabara adaba.',
    signingDisabled: 'Agbanyụghị mbinye aka. Ozi ọhụrụ agaghị enwe mbinye aka onye zitere ya.',
    keyGenerated: 'Igodo mbinye aka ECDSA P-256 adịla njikere. Igodo nzuzo dị naanị na ebe nchekwa ma ọ ga-apụ mgbe ibe mechiri ma ọ bụ malitegharịa. Kesaa naanị igodo ọha, ma jiri ụzọ ntụkwasị obi tụnyere akara mkpịsị aka ya niile.',
    keyGeneratedExportable: 'Igodo mbinye aka ECDSA P-256 adịla njikere. Ndabere igodo nzuzo na-egosi; chekwaa ya nke ọma ma ekesakwala ya. Kesaa naanị igodo ọha.',
    keyGenerationFailed: 'Enweghị ike imepụta igodo mbinye aka ECDSA. Lelee ihe nchọgharị ma nwaa ọzọ.',
    exportModeSelected: 'A họrọla PEM a ga-ebupụ maka igodo mbinye aka ọhụrụ. Ndabere igodo nzuzo ga-egosi; chekwaa ya nke ọma.',
    memoryModeSelected: 'A họrọla nchekwa ebe nchekwa naanị maka igodo mbinye aka ọhụrụ. Enweghị ike ịchekwa igodo nzuzo ma ọ ga-apụ mgbe ibe mechiri.',
    signed: 'E tinyela mbinye aka na ozi ezoro ezo. Kesaa token na igodo mbinye aka ọha iche. Onye nata kwesịrị iji ụzọ ntụkwasị obi tụnyere akara mkpịsị aka igodo ahụ niile.',
    verified: 'Mbinye aka ahụ ziri ezi. Token ahụ ka ezoro ezo. Jiri ụzọ ntụkwasị obi tụnyere akara mkpịsị aka igodo ọha ahụ niile.',
    decrypted: 'Mbinye aka ahụ ziri ezi ma emeghela ozi ahụ. Ịmata onye zitere ya dabere n’inwe ntụkwasị obi n’akara mkpịsị aka igodo ahụ.',
    decryptionFailed: 'Mbinye aka ahụ ziri ezi, mana enweghị ike imeghe ozi ahụ. Lelee igodo nzuzo; token ahụ ka zoro ezo.',
    unsigned: 'Ozi ahụ enweghị mbinye aka. Ekwenyebeghị onye zitere ya.',
    failed: 'Nyocha mbinye aka adaala. Ewerela ozi a dịka nke akwadoro. Lelee igodo ọha na mbinye aka.',
    keyMismatch: 'Akwụsịla mbinye aka n’ihi na igodo nzuzo adabaghị na igodo ọha e gosiri. Weghachite igodo ha abụọ dabara.',
    unsupported: 'A naghị akwado mbinye aka maka Grumpy v2. Họrọ usoro nzuzo ọhụrụ akwadoro.',
    publicCopied: 'E depụtala igodo mbinye aka ọha. Kesaa naanị igodo a, ma jiri ụzọ ọzọ tụnyere akara mkpịsị aka ya.',
    privateCopied: 'E depụtala ndabere igodo mbinye aka nzuzo. Debe ya na nzuzo; onye nwere ya nwere ike ịmepụta mbinye aka.',
    copyFailed: 'Enweghị ike idetuo igodo mbinye aka. Lelee ma ọ bụ igodo ọha ma ọ bụ nke nzuzo tupu ikesa ya.',
    publicKeyReady: 'Akara mkpịsị aka igodo ECDSA ọha adịla njikere. Jiri ụzọ ntụkwasị obi tụnyere ya.',
    publicKeyInvalid: 'Igodo ọha ECDSA P-256 ezighi ezi. Lelee igodo tupu nyochaa mbinye aka.',
    summary: 'Mbinye aka nhọrọ na-eji ECDSA P-256 bịanye aka na token ozi ezoro ezo. Mbinye aka ziri ezi na-egosi igodo, ọ bụghị onye nwe ya; jiri ụzọ ntụkwasị obi tụnyere akara mkpịsị aka ya niile.'
  }),
  ha: Object.freeze({
    signingEnabled: 'An kunna sa hannu. Ana buƙatar hanyar ɓoyewa da aka yarda da ita da maɓallan ECDSA na sirri da na jama’a masu dacewa.',
    signingDisabled: 'An kashe sa hannu. Sabbin saƙonni ba za su ƙunshi sa hannun mai aikawa ba.',
    keyGenerated: 'Maɓallan sa hannun ECDSA P-256 sun shirya. Maɓallin sirri yana cikin ƙwaƙwalwar shafi ne kawai kuma zai ɓace idan shafin ya kulle ko ya rufe. Raba maɓallin jama’a kawai, kuma kwatanta cikakken sawun maɓallin ta hanyar amintacciya.',
    keyGeneratedExportable: 'Maɓallan sa hannun ECDSA P-256 sun shirya. Ana nuna madadin maɓallin sirri; adana shi lafiya kuma kada a raba shi. Raba maɓallin jama’a kawai.',
    keyGenerationFailed: 'Ba a iya ƙirƙirar maɓallin sa hannun ECDSA ba. Duba burauza sannan a sake gwadawa.',
    exportModeSelected: 'An zaɓi PEM mai fitarwa don sabon maɓallin sa hannu. Madadin maɓallin sirri zai bayyana; ajiye shi lafiya.',
    memoryModeSelected: 'An zaɓi ajiya a ƙwaƙwalwa kawai don sabon maɓallin sa hannu. Ba za a iya yin madadi ba kuma zai ɓace idan an rufe shafin.',
    signed: 'An sanya wa saƙon ɓoye hannu. Raba token da maɓallin jama’a daban. Mai karɓa ya kwatanta cikakken sawun maɓallin ta hanya amintacciya.',
    verified: 'Sa hannun ya inganta. Token ɗin yana nan a ɓoye. Kwatanta cikakken sawun maɓallin jama’a ta hanya amintacciya.',
    decrypted: 'Sa hannun ya inganta kuma an buɗe saƙon. Tabbatar da mai aikawa ya danganta da amincewa da cikakken sawun maɓallin.',
    decryptionFailed: 'Sa hannun ya inganta, amma ba a iya buɗe saƙon ba. Duba maɓallin buɗewa; token ɗin yana nan a ɓoye.',
    unsigned: 'Saƙon ba shi da sa hannu. Ba a tabbatar da mai aikawa ba.',
    failed: 'Tabbatar da sa hannu ya gaza. Kada a ɗauki saƙon a matsayin tabbatacce. Duba maɓallin jama’a da sa hannun.',
    keyMismatch: 'An dakatar da sa hannu saboda maɓallin sirri bai dace da maɓallin jama’a da aka nuna ba. Mayar da maɓallan da suka dace.',
    unsupported: 'Ba a iya sa wa Grumpy v2 hannu ba. Zaɓi hanyar ɓoyewa ta zamani da aka yarda da ita.',
    publicCopied: 'An kwafi maɓallin sa hannu na jama’a. Raba wannan kawai, kuma kwatanta sawun sa ta wata hanya amintacciya.',
    privateCopied: 'An kwafi madadin maɓallin sa hannu na sirri. Ajiye shi a ɓoye; mai samunsa zai iya ƙirƙirar sa hannu.',
    copyFailed: 'Ba a iya kwafin maɓallin sa hannu ba. Tabbatar ko na sirri ne ko na jama’a kafin rabawa.',
    publicKeyReady: 'Sawun maɓallin jama’a na ECDSA ya shirya. Kwatanta shi ta hanya amintacciya.',
    publicKeyInvalid: 'Maɓallin jama’a na ECDSA P-256 ba daidai ba ne. Duba shi kafin tabbatar da sa hannu.',
    summary: 'Sa hannun zaɓi yana amfani da ECDSA P-256 don sa wa token saƙon ɓoye hannu. Ingantaccen sa hannu yana tabbatar da maɓalli, ba mai shi ba; kwatanta cikakken sawun ta hanya amintacciya.'
  }),
  pcm: Object.freeze({
    signingEnabled: 'Signing don on. E need supported encryption method and ECDSA private and public keys wey match.',
    signingDisabled: 'Signing don off. New messages no go carry sender signature.',
    keyGenerated: 'ECDSA P-256 signing keys don ready. Private key dey memory only and e go lost when page lock, close, or reload. Share public key only, and compare the full fingerprint through trusted channel.',
    keyGeneratedExportable: 'ECDSA P-256 signing keys don ready. Private-key backup dey visible. Store am well and no share am. Share public key only.',
    keyGenerationFailed: 'We no fit generate ECDSA signing key. Check browser support and try again.',
    exportModeSelected: 'Exportable PEM don selected for next signing key. Private backup go show, so store am well.',
    memoryModeSelected: 'Memory-only don selected for next signing key. You no fit back up di private key, and e go lost when page close or lock.',
    signed: 'Encrypted message don get signature. Share signed token and public signing key separately. Receiver suppose compare the full key fingerprint through trusted channel.',
    verified: 'Signature correct. Token still dey encrypted. Compare the full public-key fingerprint through trusted channel to confirm who send am.',
    decrypted: 'Signature correct and message don decrypt. Sender identity depend on whether you trust the full public-key fingerprint.',
    decryptionFailed: 'Signature correct, but we no fit decrypt the message. Check the decryption key; the token still dey encrypted.',
    unsigned: 'Message no get signature. We never verify who send am.',
    failed: 'Signature check fail. No trust say this message authentic. Check signature and public signing key.',
    keyMismatch: 'Signing stop because private signing key no match the public key we show. Restore the correct matching key.',
    unsupported: 'We no fit sign Grumpy v2. Choose supported modern encryption method.',
    publicCopied: 'Public signing key don copy. Share this one only and compare the fingerprint through trusted channel.',
    privateCopied: 'Private signing-key backup don copy. Keep am secret; anybody wey get am fit make signatures for this key.',
    copyFailed: 'We no fit copy the signing key. Check whether na public or private before you share am.',
    publicKeyReady: 'ECDSA public-key fingerprint don ready. Compare the full fingerprint through trusted channel.',
    publicKeyInvalid: 'ECDSA P-256 public key no correct. Check am before you verify signature.',
    summary: 'Optional digital signatures use ECDSA P-256 to sign encrypted message tokens. Correct signature show which key sign am, no be who own am. Compare the full fingerprint through trusted channel.'
  }),
  es: Object.freeze({
    signingEnabled: 'La firma está activada. Se necesita un método de cifrado compatible y un par de claves ECDSA pública y privada coincidentes.',
    signingDisabled: 'La firma está desactivada. Los mensajes nuevos no incluirán la firma del remitente.',
    keyGenerated: 'Las claves ECDSA P-256 están listas. La clave privada solo permanece en memoria y se perderá al bloquear, cerrar o recargar la página. Comparte solo la clave pública y verifica toda su huella por un canal de confianza.',
    keyGeneratedExportable: 'Las claves ECDSA P-256 están listas. La copia de la clave privada está visible. Guárdala de forma segura y no la compartas. Comparte solo la clave pública.',
    keyGenerationFailed: 'No se pudo generar la clave ECDSA. Comprueba el navegador e inténtalo de nuevo.',
    exportModeSelected: 'Se eligió PEM exportable para la próxima clave. La copia privada será visible y debe guardarse de forma segura.',
    memoryModeSelected: 'Se eligió almacenamiento solo en memoria para la próxima clave. No se podrá respaldar y se perderá al cerrar o bloquear la página.',
    signed: 'El mensaje cifrado se firmó. Comparte el token y la clave pública por separado. El destinatario debe comparar toda la huella por un canal de confianza.',
    verified: 'La firma es válida. El token sigue cifrado. Compara toda la huella de la clave pública por un canal de confianza.',
    decrypted: 'La firma era válida y el mensaje se descifró. La identidad del remitente solo se confirma si confías en toda la huella de la clave.',
    decryptionFailed: 'La firma es válida, pero no se pudo descifrar el mensaje. Comprueba la clave de descifrado; el token sigue cifrado.',
    unsigned: 'El mensaje no tiene firma. No se ha verificado la identidad del remitente.',
    failed: 'La verificación de la firma falló. No consideres auténtico este mensaje. Comprueba la firma y la clave pública.',
    keyMismatch: 'Se detuvo la firma porque la clave privada no coincide con la clave pública mostrada. Restaura el par correcto.',
    unsupported: 'No se puede firmar Grumpy v2. Elige un método de cifrado moderno compatible.',
    publicCopied: 'Se copió la clave pública de firma. Comparte solo esta clave y verifica su huella por un canal de confianza.',
    privateCopied: 'Se copió la copia privada de firma. Guárdala en secreto; quien la tenga puede crear firmas con esta clave.',
    copyFailed: 'No se pudo copiar la clave de firma. Comprueba si es pública o privada antes de compartirla.',
    publicKeyReady: 'La huella de la clave pública ECDSA está lista. Compárala completa por un canal de confianza.',
    publicKeyInvalid: 'La clave pública ECDSA P-256 no es válida. Revísala antes de verificar la firma.',
    summary: 'Las firmas digitales opcionales usan ECDSA P-256 para firmar tokens cifrados. Una firma válida identifica una clave, no a su propietario; verifica la huella completa por un canal de confianza.'
  }),
  fr: Object.freeze({
    signingEnabled: 'La signature est activée. Une méthode de chiffrement compatible et une paire de clés ECDSA publique et privée correspondantes sont nécessaires.',
    signingDisabled: 'La signature est désactivée. Les nouveaux messages ne comporteront pas de signature d’expéditeur.',
    keyGenerated: 'Les clés ECDSA P-256 sont prêtes. La clé privée reste en mémoire et sera perdue au verrouillage, à la fermeture ou au rechargement de la page. Partagez uniquement la clé publique et comparez son empreinte complète par un canal de confiance.',
    keyGeneratedExportable: 'Les clés ECDSA P-256 sont prêtes. La sauvegarde privée est visible. Conservez-la en lieu sûr et ne la partagez pas. Partagez uniquement la clé publique.',
    keyGenerationFailed: 'Impossible de générer la clé ECDSA. Vérifiez la prise en charge du navigateur et réessayez.',
    exportModeSelected: 'Le PEM exportable est choisi pour la prochaine clé. La sauvegarde privée sera visible et devra être conservée en lieu sûr.',
    memoryModeSelected: 'Le stockage en mémoire seule est choisi pour la prochaine clé. Elle ne pourra pas être sauvegardée et sera perdue à la fermeture ou au verrouillage.',
    signed: 'Le message chiffré a été signé. Partagez séparément le jeton et la clé publique. Le destinataire doit comparer toute l’empreinte par un canal de confiance.',
    verified: 'La signature est valide. Le jeton reste chiffré. Comparez toute l’empreinte de la clé publique par un canal de confiance.',
    decrypted: 'La signature était valide et le message est déchiffré. L’identité de l’expéditeur n’est confirmée que si vous faites confiance à l’empreinte complète.',
    decryptionFailed: 'La signature est valide, mais le message n’a pas pu être déchiffré. Vérifiez la clé ; le jeton reste chiffré.',
    unsigned: 'Le message n’est pas signé. L’identité de l’expéditeur n’a pas été vérifiée.',
    failed: 'La vérification de la signature a échoué. Ne considérez pas ce message comme authentifié. Vérifiez la signature et la clé publique.',
    keyMismatch: 'La signature a été interrompue, car la clé privée ne correspond pas à la clé publique affichée. Rétablissez la paire correspondante.',
    unsupported: 'Grumpy v2 ne peut pas être signé. Choisissez une méthode de chiffrement moderne compatible.',
    publicCopied: 'La clé publique de signature a été copiée. Partagez uniquement cette clé et comparez son empreinte par un canal de confiance.',
    privateCopied: 'La sauvegarde de la clé privée a été copiée. Gardez-la secrète ; toute personne qui la possède peut signer avec cette clé.',
    copyFailed: 'Impossible de copier la clé de signature. Vérifiez si elle est publique ou privée avant de la partager.',
    publicKeyReady: 'L’empreinte de la clé publique ECDSA est prête. Comparez-la entièrement par un canal de confiance.',
    publicKeyInvalid: 'La clé publique ECDSA P-256 est invalide. Vérifiez-la avant de contrôler une signature.',
    summary: 'Les signatures numériques facultatives utilisent ECDSA P-256 pour signer les jetons chiffrés. Une signature valide identifie une clé, pas son propriétaire ; comparez l’empreinte complète par un canal de confiance.'
  })
});

const LANGUAGE_CHANGE_NARRATION = Object.freeze({
  en: 'Narration language set to English. Future guidance will use this language.',
  yo: 'A ti yan èdè Yorùbá fún ìtàn ohùn. Ìtọ́sọ́nà tó kàn yóò lo èdè yìí.',
  ig: 'A họrọla Igbo maka ntuziaka olu. Ntuziaka na-esote ga-eji asụsụ a.',
  ha: 'An zaɓi Hausa don jagorar murya. Bayani na gaba zai yi amfani da wannan yare.',
  pcm: 'You don choose Nigerian Pidgin for narration. Di next guide go use dis language.',
  es: 'El idioma de narración es español. Las próximas indicaciones usarán este idioma.',
  fr: 'La langue de narration est le français. Les prochains conseils utiliseront cette langue.'
});

const STATUS_NARRATION = Object.freeze({
  en: Object.freeze({
    messageEncrypted: 'Your message is now encrypted. The result is shown on screen. Follow the selected method’s guidance for sharing any required access key or public key; never share a private key.',
    messageEncryptedLegacy: 'The legacy text operation finished, but this method is unsafe and does not reliably protect messages. Do not use this result for private information. Re-encrypt with AES-GCM.',
    messageDecrypted: 'Your message is now open and shown on screen. Other people may be able to see it, so handle it carefully.',
    legacyMigrationPrepared: 'Your old message is ready to protect again. Enter a new, long access key, then choose Encrypt message.',
    operationFailed: 'That did not work. Check the method, key, and message, then try again.',
    hashSelected: 'Your files are ready for a file check. The results will appear on screen.',
    hashCalculated: 'The file check is complete. Compare the full result with one from a source you trust.',
    hashFailed: 'The file check did not work. Check the file and selected methods, then try again.',
    fileEncrypted: 'Your file is now protected and has been saved. Keep the access key separate from the file.',
    fileDecrypted: 'Your file is now open and has been saved. Other people may be able to see it, so handle it carefully.',
    fileFailed: 'That file action did not work. Check the file and access key, then try again.',
    fileOutputFailed: 'The output file could not be written. Check available storage and file permissions, then try again.',
    fileCancelled: 'You cancelled saving the file. No complete output file was saved.',
    rsaKeyGenerated: 'Your public and private keys are ready. Keep the private key secret. You need it to open messages sent to your public key.',
    rsaKeyFailed: 'The keys could not be made. Check that your browser is up to date, then try again.',
    workspaceCleared: 'The message, result, and selected file were cleared from this page. Access keys and RSA keys are still here.',
    outputCopied: 'The result was copied. Check whether it is a private message before sharing it.',
    keyCopied: 'The key was copied. Never share a private key. Before using a public key, check its fingerprint with the owner.',
    copyFailed: 'The copy did not work. The text is selected so you can copy it yourself. Check it before sharing.',
    tokenDownloaded: 'The encrypted message was downloaded. The access key and private key are not included.'
  }),
  yo: Object.freeze({
    messageEncrypted: 'A ti fi ìfiránṣẹ́ pamọ́. Ààmì ìfiránṣẹ́ tí a fi pamọ́ wà ní ibi àbájáde.',
    messageEncryptedLegacy: 'Iṣẹ́ Grumpy v2 ti parí, ṣùgbọ́n ọ̀nà yìí kò ní ààbò, kò sì lè dáàbò bo ìfiránṣẹ́ dáadáa. Má ṣe lò ó fún ìsọfúnni àṣírí. Tún fi AES-GCM pamọ́.',
    messageDecrypted: 'A ti tú ìfìpamọ́ ìfiránṣẹ́. Ọ̀rọ̀ tó hàn jẹ́ àṣírí; pa á mọ́.',
    legacyMigrationPrepared: 'Ọ̀rọ̀ ìtàn àtijọ́ ti ṣetán nínú ààyè ìfiránṣẹ́. Tẹ kọ́kọ́rọ́ ààbò tuntun tó lágbára, kí o sì fi AES-256-GCM pamọ́.',
    operationFailed: 'Iṣẹ́ náà kò ṣàṣeyọrí. Ṣàyẹ̀wò ọ̀nà, kọ́kọ́rọ́ àti ohun tí o tẹ̀ sí, kí o sì tún gbìyànjú.',
    hashCalculated: 'A ti ṣe ìṣírò hash fáìlì. Àwọn ọ̀rọ̀ hash ti a yàn wà nínú ibi àbájáde.',
    hashFailed: 'Ìṣírò hash kò ṣàṣeyọrí. Ṣàyẹ̀wò fáìlì àti algoríìtmù, kí o sì tún gbìyànjú.',
    fileEncrypted: 'A ti fi fáìlì pamọ́, a sì ti fi fáìlì ìpamọ́ náà pamọ́ sí ibi tí o yàn.',
    fileDecrypted: 'A ti tú ìfìpamọ́ fáìlì. Ọ̀rọ̀ inú fáìlì náà jẹ́ àṣírí; pa á mọ́.',
    fileFailed: 'Iṣẹ́ fáìlì náà kò ṣàṣeyọrí. Ṣàyẹ̀wò fáìlì àti kọ́kọ́rọ́ ààbò, kí o sì tún gbìyànjú.',
    fileOutputFailed: 'A kò lè kọ àbájáde sínú fáìlì. Ṣàyẹ̀wò ààyè ìpamọ́ àti àṣẹ fáìlì, kí o sì tún gbìyànjú.',
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
    messageEncryptedLegacy: 'Ọrụ Grumpy v2 agwụla, mana usoro a enweghị nchekwa ma ọ naghị echekwa ozi nke ọma. Ejila nsonaazụ a maka ozi nzuzo. Jiri AES-GCM zoo ozi ahụ ọzọ.',
    messageDecrypted: 'Megheela ozi. E gosiri ozi mbụ; chekwaa ya nke ọma.',
    legacyMigrationPrepared: 'Ozi ochie dị n\'oghere ozi ugbu a. Tinye paswọọdụ ọhụrụ siri ike, wee jiri AES-256-GCM zoo ya.',
    operationFailed: 'Ọrụ ahụ emeghị nke ọma. Lelee usoro, igodo na ozi i tinyere, wee nwaa ọzọ.',
    hashSelected: 'A họrọla faịlụ maka ịgbakọ hash. A ga-agbakọ ha site na algọridim ndị ị họọrọ.',
    hashCalculated: 'Agbakọọla hash faịlụ. Uru ndị ị họọrọ dị na mpaghara nsonaazụ.',
    hashFailed: 'Mgbakọ hash adaghị. Lelee faịlụ na algọridim, wee nwaa ọzọ.',
    fileEncrypted: 'Ezochiela faịlụ ma chekwaa faịlụ e zoro ezo.',
    fileDecrypted: 'Megheela faịlụ. Faịlụ ahụ nwere ozi mbụ; chekwaa ya nke ọma.',
    fileFailed: 'Ọrụ faịlụ ahụ emeghị nke ọma. Lelee faịlụ na igodo nzuzo, wee nwaa ọzọ.',
    fileOutputFailed: 'Enweghị ike ide nsonaazụ n’ime faịlụ. Lelee ebe nchekwa na ikike faịlụ, wee nwaa ọzọ.',
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
    messageEncryptedLegacy: 'An kammala aikin Grumpy v2, amma wannan hanya ba ta da aminci kuma ba ta kare saƙo yadda ya kamata. Kada a yi amfani da sakamakon don bayanan sirri. Sake ɓoye saƙon da AES-GCM.',
    messageDecrypted: 'An buɗe saƙon. An nuna ainihin saƙon; kiyaye shi a sirrance.',
    legacyMigrationPrepared: 'Tsohon saƙon yana shirye a wurin saƙo. Shigar da sabon kalmar sirri mai ƙarfi, sannan a ɓoye shi da AES-256-GCM.',
    operationFailed: 'Aikin bai yi nasara ba. Duba hanya, maɓalli da bayanan da ka shigar, sannan a sake gwadawa.',
    hashSelected: 'An zaɓi fayiloli don lissafin hash. Za a lissafta su da algorithms ɗin da aka zaɓa.',
    hashCalculated: 'An lissafta hash ɗin fayil. Ana nuna sakamakon algorithms ɗin da aka zaɓa.',
    hashFailed: 'Lissafin hash bai yi nasara ba. Duba fayil ɗin da algorithm, sannan a sake gwadawa.',
    fileEncrypted: 'An ɓoye fayil ɗin kuma an ajiye fayil ɗin da aka ɓoye.',
    fileDecrypted: 'An buɗe fayil ɗin. Fayil ɗin yanzu yana ɗauke da ainihin bayanai; kiyaye shi a sirrance.',
    fileFailed: 'Aikin fayil bai yi nasara ba. Duba fayil ɗin da maɓallin sirri, sannan a sake gwadawa.',
    fileOutputFailed: 'Ba a iya rubuta sakamakon cikin fayil ba. Duba sararin ajiya da izinin fayil, sannan a sake gwadawa.',
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
    messageEncryptedLegacy: 'Di Grumpy v2 work don finish, but dis method no safe and e no fit protect message well. No use dis result for private matter. Encrypt di message again with AES-GCM.',
    messageDecrypted: 'Message don decrypt. Di original message show; keep am private.',
    legacyMigrationPrepared: 'Di old message don ready for di message box. Put new strong access key, then encrypt am with AES-256-GCM.',
    operationFailed: 'Di operation no work. Check di method, key and input, then try again.',
    hashSelected: 'You don select files to calculate hash. E go calculate dem with di algorithms wey you choose.',
    hashCalculated: 'File hash don calculate. Di result area show di hash values wey you choose.',
    hashFailed: 'Hash calculation no work. Check di file and algorithm, then try again.',
    fileEncrypted: 'File don encrypt and di encrypted file don save.',
    fileDecrypted: 'File don decrypt. Di original file don save; keep am private.',
    fileFailed: 'File operation no work. Check di file and access key, then try again.',
    fileOutputFailed: 'Di output file no fit write. Check storage space and file permission, then try again.',
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
    messageEncryptedLegacy: 'La operación Grumpy v2 ha terminado, pero este método no es seguro ni protege los mensajes de forma fiable. No uses este resultado para información privada. Vuelve a cifrarlo con AES-GCM.',
    messageDecrypted: 'Mensaje descifrado. El texto original aparece en el área de resultados; protégelo.',
    legacyMigrationPrepared: 'El texto heredado está listo en el campo del mensaje. Introduce una clave de acceso nueva y segura y cifralo con AES-256-GCM.',
    operationFailed: 'La operación ha fallado. Comprueba el método, la clave y los datos, e inténtalo de nuevo.',
    hashSelected: 'Archivos seleccionados para calcular el hash. Los resultados se actualizarán para cada algoritmo elegido.',
    hashCalculated: 'Hash del archivo calculado. Los valores seleccionados aparecen en el área de resultados.',
    hashFailed: 'No se pudo calcular el hash. Comprueba el archivo y el algoritmo, e inténtalo de nuevo.',
    fileEncrypted: 'Archivo cifrado. Se ha guardado el archivo cifrado.',
    fileDecrypted: 'Archivo descifrado. Se ha guardado el archivo original; protégelo.',
    fileFailed: 'La operación con el archivo ha fallado. Comprueba el archivo y la clave, e inténtalo de nuevo.',
    fileOutputFailed: 'No se pudo escribir el archivo de salida. Comprueba el espacio disponible y los permisos, e inténtalo de nuevo.',
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
    messageEncryptedLegacy: 'Le traitement Grumpy v2 est terminé, mais cette méthode est dangereuse et ne protège pas les messages de manière fiable. N’utilisez pas ce résultat pour des informations privées. Chiffrez-le de nouveau avec AES-GCM.',
    messageDecrypted: 'Message déchiffré. Le texte original apparaît dans la zone de résultat ; protégez-le.',
    legacyMigrationPrepared: 'Le texte hérité est prêt dans le champ du message. Saisissez une nouvelle clé d’accès robuste, puis chiffrez-le avec AES-256-GCM.',
    operationFailed: 'Échec de l’opération. Vérifiez la méthode, la clé et les données, puis réessayez.',
    hashSelected: 'Fichiers sélectionnés pour le hachage. Les résultats seront mis à jour pour chaque algorithme choisi.',
    hashCalculated: 'Hachage du fichier terminé. Les valeurs sélectionnées sont affichées dans la zone de résultats.',
    hashFailed: 'Le hachage a échoué. Vérifiez le fichier et l’algorithme, puis réessayez.',
    fileEncrypted: 'Fichier chiffré. Le fichier chiffré a été enregistré.',
    fileDecrypted: 'Fichier déchiffré. Le fichier original a été enregistré ; protégez-le.',
    fileFailed: 'Échec de l’opération sur le fichier. Vérifiez le fichier et la clé, puis réessayez.',
    fileOutputFailed: 'Impossible d’écrire le fichier de sortie. Vérifiez l’espace disponible et les autorisations, puis réessayez.',
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
    'Ọ̀nà RSA-OAEP àti AES-GCM yìí nílò kọ́kọ́rọ́ méjì, ó sì wà fún ọ̀rọ̀ kúkúrú. RSA-OAEP ló kọ́kọ́ fi ọ̀rọ̀ náà pamọ́; lẹ́yìn náà AES-256-GCM tó lo kọ́kọ́rọ́ ààbò rẹ ló bo àbájáde RSA. Ààmì tuntun rẹ̀ ni RSA6.',
    'Láti fi pamọ́, lo kọ́kọ́rọ́ gbogbogbò ẹni tó máa gba ọ̀rọ̀ náà, ṣàyẹ̀wò àmì SHA-256 rẹ̀ ní ọ̀nà mìíràn tó ṣeé gbẹ́kẹ̀ lé, tẹ kọ́kọ́rọ́ ààbò tí ẹ pín, kí o sì tẹ ọ̀rọ̀ kúkúrú tó bá ìwọ̀n kọ́kọ́rọ́ RSA mu. Pín ààmì RSA6 àti kọ́kọ́rọ́ ààbò lọ́tọ̀.',
    'Láti tú ààmì RSA6, RSA5, RSA4 tàbí RSA3 àtijọ́, lo kọ́kọ́rọ́ àṣírí RSA tó bá a mu àti kọ́kọ́rọ́ ààbò kan náà. A nílò méjèèjì. Ààlà ọ̀rọ̀ sinmi lórí ìwọ̀n kọ́kọ́rọ́ RSA; lo AES-GCM àti RSA-OAEP fún ọ̀rọ̀ tó gùn.'
  ]),
  ig: Object.freeze([
    'Usoro RSA-OAEP na AES-GCM a chọrọ igodo abụọ, ọ dịkwa mma naanị maka ozi dị mkpirikpi. RSA-OAEP na-ezochi ozi mbụ; AES-256-GCM nke paswọọdụ gị na-emesịa ezochi nsonaazụ RSA. Akara ọhụrụ ya bụ RSA6.',
    'Iji zoo ozi, jiri igodo ọha onye ga-enweta ya ma nyochaa akara SHA-256 n’ụzọ ọzọ a pụrụ ịtụkwasị obi. Tinye paswọọdụ unu kwekọrịtara na obere ozi dabara na nha igodo RSA. Ziga akara RSA6 na paswọọdụ iche iche.',
    'Iji mepee akara RSA6, RSA5, RSA4 ma ọ bụ RSA3 ochie, tinye igodo nzuzo RSA ziri ezi na otu paswọọdụ ahụ. A chọrọ ha abụọ. Oke ozi dabere na nha igodo RSA; jiri AES-GCM na RSA-OAEP maka ozi toro ogologo.'
  ]),
  ha: Object.freeze([
    'Wannan hanyar RSA-OAEP da AES-GCM tana buƙatar maɓallai biyu kuma ta dace da gajerun saƙonni kawai. RSA-OAEP na ɓoye saƙon farko; AES-256-GCM da kalmar sirrinka ta samar daga baya yana ɓoye sakamakon RSA. Sabuwar alamar ita ce RSA6.',
    'Don ɓoyewa, yi amfani da maɓallin jama’a na mai karɓa kuma ka tabbatar da tambarin SHA-256 ta wata amintacciyar hanya. Shigar da kalmar sirrin da kuka amince da ita da gajeren saƙo da ya dace da girman RSA. A aika da alamar RSA6 da kalmar sirri dabam.',
    'Don buɗe RSA6, RSA5, RSA4 ko tsohon RSA3, shigar da maɓallin RSA na sirri da ya dace da kalmar sirrin da aka yi amfani da ita. Ana buƙatar su duka. Iyakar saƙo ta danganta da girman maɓallin RSA; yi amfani da AES-GCM da RSA-OAEP don saƙonni masu tsawo.'
  ]),
  pcm: Object.freeze([
    'Dis RSA-OAEP plus AES-GCM method need two keys, and e good for short messages only. RSA-OAEP hide di message first; AES-256-GCM wey your passphrase derive go hide di RSA result after. New token na RSA6.',
    'To encrypt, use di recipient public key and confirm di SHA-256 fingerprint through another trusted way. Put di shared access-key passphrase and short message wey fit di RSA key size. Send di RSA6 token and passphrase separately.',
    'To decrypt RSA6, RSA5, RSA4, or old RSA3, you need both di matching RSA private key and di same access-key passphrase. Di message limit depend on di RSA key size; use AES-GCM plus RSA-OAEP Hybrid for longer messages.'
  ]),
  es: Object.freeze([
    'Este método RSA-OAEP + AES-GCM requiere dos claves y solo sirve para mensajes cortos. RSA-OAEP cifra primero el mensaje; después, AES-256-GCM, derivado de tu frase de acceso, cifra el resultado RSA. El formato nuevo es RSA6.',
    'Para cifrar, usa la clave pública del destinatario y verifica su huella SHA-256 por un canal de confianza independiente. Introduce la frase de acceso compartida y un mensaje dentro del límite de la clave RSA. Comparte el token RSA6 y la frase por separado.',
    'Para descifrar RSA6, RSA5, RSA4 o el formato anterior RSA3 necesitas tanto la clave privada RSA correspondiente como la misma frase de acceso. El límite del mensaje depende del tamaño de la clave RSA; usa AES-GCM + RSA-OAEP Hybrid para mensajes más largos.'
  ]),
  fr: Object.freeze([
    'Cette méthode RSA-OAEP + AES-GCM nécessite deux clés et convient uniquement aux messages courts. RSA-OAEP chiffre d’abord le message ; AES-256-GCM, dérivé de votre phrase d’accès, chiffre ensuite le résultat RSA. Le nouveau format est RSA6.',
    'Pour chiffrer, utilisez la clé publique du destinataire et vérifiez son empreinte SHA-256 par un canal indépendant fiable. Saisissez la phrase d’accès partagée et un message respectant la limite de la clé RSA. Partagez le jeton RSA6 et la phrase séparément.',
    'Pour déchiffrer RSA6, RSA5, RSA4 ou l’ancien format RSA3, il faut la clé privée RSA correspondante et la même phrase d’accès. La limite dépend de la taille de la clé RSA ; utilisez AES-GCM + RSA-OAEP Hybrid pour les messages plus longs.'
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

function getSignatureEventMessage(event, language = 'en') {
  const messages = SIGNATURE_EVENT_NARRATION[language]
    || SIGNATURE_EVENT_NARRATION.en;
  return messages[event] || null;
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
  if (mode === 'rsa-direct') {
    const maxBytes = rsaKeyBits / 8 - 66;
    const directGuide = guide.map(line =>
      line.replaceAll('2048', String(rsaKeyBits)).replaceAll('190', String(maxBytes))
    );
    directGuide[0] = `${directGuide[0]} ${getRsaKeySizeNarration(language, rsaKeyBits)}`;
    return directGuide;
  }
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
    en: `AES key size is the length of the secret key the app creates from your access key to lock and unlock messages. The number of bits measures that key; more bits mean more possible keys to guess, but do not make a weak access key stronger. ${keyBits === 128
      ? '128 bits is already strong. The app recommends 256 bits for new messages.'
      : keyBits === 192
        ? '192 bits is a supported middle option. If you have no special requirement, choose the recommended 256-bit default.'
        : '256 bits is the recommended default for new messages.'} Use a long, unique access key whatever size you choose. This setting applies only to new messages; each message saves its size so the app can open it correctly later. File encryption always uses its own fixed AES-256 key size.`,
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
    narration: 'Spoken guidance. When it is on, click a control to hear what it does. Guidance does not play by itself.',
    narrationLanguage: 'Spoken guidance language. Choose the language you want to hear.',
    accessKeyVisibility: 'Show or hide access key. Showing it lets anyone looking at your screen read it.'
    },
    yo: {
      narration: 'Bọ́tìnì ìtàn ohùn. Tẹ̀ ẹ́ láti gbọ́ ìtọ́sọ́nà nípa ọ̀nà tí a yàn àti àwọn ohun èlò tí o dojú kọ.',
      narrationLanguage: 'Aṣàyàn èdè ìtàn ohùn. Yan èdè tí ìtọ́sọ́nà yóò lò.',
      accessKeyVisibility: 'Bọ́tìnì hàn tàbí fi kọ́kọ́rọ́ ààbò pamọ́. Ó ń fi kọ́kọ́rọ́ tí o tẹ̀ sí ojú ìwé hàn tàbí bo ó.'
    },
    ig: {
      narration: 'Bọtịnụ olu. Gbanye ya ka ị nụ ntuziaka gbasara usoro ahọpụtara na njikwa ị lekwasịrị anya.',
      narrationLanguage: 'Nhọrọ asụsụ olu. Họrọ asụsụ ntuziaka ga-eji.',
      accessKeyVisibility: 'Njikwa igosi ma ọ bụ zoo igodo nzuzo. Ọ na-egosi ma ọ bụ zoo igodo i tinyere na ihuenyo.'
    },
    ha: {
      narration: 'Maɓallin jagorar murya. Kunna shi don jin bayani kan hanyar da aka zaɓa da abubuwan da ka mayar da hankali a kansu.',
      narrationLanguage: 'Zaɓin yaren jagorar murya. Zaɓi yaren da jagorar za ta yi amfani da shi.',
      accessKeyVisibility: 'Maɓallin nuna ko ɓoye maɓallin sirri. Yana nuna ko ɓoye abin da ka shigar a allon.'
    },
    pcm: {
      narration: 'Narration control. On am to hear guide for di method wey you choose and di control wey you focus.',
      narrationLanguage: 'Narration language selector. Choose di language wey narration go use.',
      accessKeyVisibility: 'Access key visibility control. E fit show or hide di key wey you type for di screen.'
    },
    es: {
      narration: 'Control de narración. Actívalo para escuchar indicaciones sobre el método seleccionado y los controles enfocados.',
      narrationLanguage: 'Selector del idioma de narración. Elige el idioma de las indicaciones habladas.',
      accessKeyVisibility: 'Control para mostrar u ocultar la clave de acceso introducida en pantalla.'
    },
    fr: {
      narration: 'Commande de narration. Activez-la pour entendre les conseils sur la méthode sélectionnée et les commandes ciblées.',
      narrationLanguage: 'Sélecteur de langue de narration. Choisissez la langue des conseils vocaux.',
      accessKeyVisibility: 'Commande permettant d’afficher ou de masquer la clé d’accès saisie à l’écran.'
    }
  };
  const keyById = {
    voxB: 'narration',
    narrLanguage: 'narrationLanguage',
    eye: 'accessKeyVisibility'
  }[id];
  return keyById ? controls[language]?.[keyById] || controls.en[keyById] : null;
}

function getRsaKeySizeNarration(language, keyBits) {
  const maxBytes = keyBits / 8 - 66;
  const phrases = {
    en: `RSA key size sets the size of a matched public and private key pair. The public key locks messages for its owner; only the matching private key unlocks them, so keep that private key safe. Larger RSA keys can take longer to create and use. ${keyBits === 3072
      ? '3072 bits is the recommended default and provides a stronger margin than 2048-bit keys.'
      : keyBits === 2048
        ? '2048 bits is the smallest supported size and may offer broader compatibility, but provides a lower security margin.'
        : '4096 bits is the largest option and may take longest. Choose it when your security requirements call for it.'} This setting affects new key pairs only, not keys you paste or import. For direct RSA and RSA4, this size limits messages to ${maxBytes} bytes; some characters use several bytes. For longer messages, choose hybrid encryption: RSA protects a small one-time key, while AES protects the message. Keep the default unless you have a specific reason to change it. RSA and AES bit sizes measure different things, so do not compare their numbers directly.`,
    yo: `Aṣàyàn ìwọ̀n kọ́kọ́rọ́ RSA. Àwọn kọ́kọ́rọ́ tuntun tí a ṣẹ̀dá níbí yóò jẹ́ RSA bítì ${keyBits}. RSA tààrà àti ìfiránṣẹ́ RSA4 nílò báítì UTF-8 tó pọ̀ jù ${maxBytes} fún ìwọ̀n yìí. Kọ́kọ́rọ́ tí a lẹ̀ mọ́ tàbí kó wọlé ní ìwọ̀n àti ààlà tirẹ̀. A kò gba kọ́kọ́rọ́ tó kéré sí bítì 2048.`,
    ig: `Nhọrọ nha igodo RSA. Igodo ọhụrụ e mepụtara ebe a ga-eji RSA bit ${keyBits}. Ozi direct RSA na RSA4 nwere oke byte UTF-8 ${maxBytes} na nha a. Igodo e tinyere ma ọ bụ bubata nwere nha na oke nke ha. A naghị akwado igodo na-erughị bit 2048.`,
    ha: `Zaɓin girman maɓallin RSA. Sabbin maɓallan da aka ƙirƙira a nan za su yi amfani da RSA mai bit ${keyBits}. Saƙonnin direct RSA da RSA4 suna da iyakar byte UTF-8 ${maxBytes} a wannan girman. Maɓallan da aka manna ko shigo da su suna da nasu girma da iyaka. Ba a tallafa wa ƙasa da bit 2048 ba.`,
    pcm: `RSA key size option. New key pairs wey you generate here go use ${keyBits}-bit RSA. Direct RSA and RSA4 dual-key message fit get up to ${maxBytes} UTF-8 bytes for dis size. Pasted or imported keys get their own size and limit. We no support keys below 2048 bits.`,
    es: `Selector del tamaño de clave RSA. Los pares nuevos generados aquí usarán RSA de ${keyBits} bits. Los mensajes RSA directos y RSA4 admiten hasta ${maxBytes} bytes UTF-8 con este tamaño. Las claves pegadas o importadas tienen su propio tamaño y límite. No se admiten claves inferiores a 2048 bits.`,
    fr: `Sélecteur de taille de clé RSA. Les nouvelles paires générées ici utiliseront RSA ${keyBits} bits. Les messages RSA direct et RSA4 acceptent jusqu’à ${maxBytes} octets UTF-8 avec cette taille. Les clés collées ou importées ont leur propre taille et leur propre limite. Les clés de moins de 2048 bits ne sont pas prises en charge.`
  };
  return phrases[language] || phrases.en;
}

function getRsaGeneratedNarration(language, keyBits, mode) {
  const maxBytes = keyBits / 8 - 66;
  const message = STATUS_NARRATION[language]?.rsaKeyGenerated || STATUS_NARRATION.en.rsaKeyGenerated;
  if (mode !== 'rsa-direct' && mode !== 'rsa-aes') return message;
  const limit = {
    en: `With this ${keyBits}-bit key, the short-message limit is ${maxBytes} bytes. Letters and symbols may use more than one byte.`,
    yo: `Kọ́kọ́rọ́ bítì ${keyBits} yìí gba báítì UTF-8 tó pọ̀ jù ${maxBytes} fún ọ̀nà ìfiránṣẹ́ kúkúrú yìí.`,
    ig: `Igodo bit ${keyBits} a nwere oke byte UTF-8 ${maxBytes} maka usoro ozi dị mkpirikpi a.`,
    ha: `Wannan maɓallin bit ${keyBits} yana da iyakar byte UTF-8 ${maxBytes} ga wannan hanyar saƙo gajere.`,
    pcm: `Dis ${keyBits}-bit key fit carry up to ${maxBytes} UTF-8 bytes for dis short-message method.`,
    es: `Esta clave de ${keyBits} bits admite hasta ${maxBytes} bytes UTF-8 para este método de mensajes cortos.`,
    fr: `Cette clé de ${keyBits} bits accepte jusqu’à ${maxBytes} octets UTF-8 pour cette méthode de messages courts.`
  }[language] || `This ${keyBits}-bit key allows up to ${maxBytes} UTF-8 bytes for this short-message method.`;
  return `${message} ${limit}`;
}

const HASH_ALGORITHM_GUIDES = Object.freeze({
  en: Object.freeze({
    md5: 'MD5 creates a short file digest for compatibility with older systems. It is not safe for security checks. Choose a file to calculate it; for a safer check, use SHA-256.',
    sha1: 'SHA one is kept for compatibility with older systems, but it is not safe for important security checks. Choose a file to calculate it; use SHA-256 for a new check unless a trusted system requires SHA one.',
    sha256: 'SHA two fifty-six creates a digest for checking a file. Choose a file, then compare the complete digest with one from a source you trust. A match does not prove who created the file.',
    sha512: 'SHA five twelve creates a longer file digest. Choose a file, then compare the complete digest with one from a source you trust. Use it when the publisher or system requests it.'
  }),
  yo: Object.freeze({
    md5: 'MD5 ń ṣe ààmì fáìlì kúkúrú fún ìbáramu pẹ̀lú àwọn ètò àtijọ́. Kò ní ààbò fún àyẹ̀wò pàtàkì. Yan fáìlì láti ṣe ààmì rẹ̀; lo SHA-256 fún àyẹ̀wò tó ní ààbò jù.',
    sha1: 'A pa SHA one mọ́ fún ìbáramu pẹ̀lú àwọn ètò àtijọ́, ṣùgbọ́n kò ní ààbò fún àyẹ̀wò pàtàkì. Yan fáìlì láti ṣe ààmì rẹ̀; lo SHA-256 àyàfi tí ètò tí o gbẹ́kẹ̀lé bá béèrè fún SHA one.',
    sha256: 'SHA two fifty-six ń ṣe ààmì láti ṣàyẹ̀wò fáìlì. Yan fáìlì, kí o sì fi gbogbo ààmì náà wé èyí láti orísun tí o gbẹ́kẹ̀lé. Ìbámu kò jẹ́rìí ẹni tó dá fáìlì náà.',
    sha512: 'SHA five twelve ń ṣe ààmì fáìlì tó gùn sí i. Yan fáìlì, kí o sì fi gbogbo ààmì náà wé èyí láti orísun tí o gbẹ́kẹ̀lé. Lo ó tí olùtẹ̀jáde tàbí ètò bá béèrè fún un.'
  }),
  ig: Object.freeze({
    md5: 'MD5 na-emepụta akara faịlụ dị mkpụmkpụ maka sistemụ ochie. Ọ nweghị nchekwa maka nyocha nchekwa dị mkpa. Họrọ faịlụ iji gbakọọ akara ya; jiri SHA-256 maka nyocha dị nchebe karịa.',
    sha1: 'A na-edobe SHA one maka sistemụ ochie, mana ọ nweghị nchekwa maka nyocha nchekwa dị mkpa. Họrọ faịlụ iji gbakọọ akara ya; jiri SHA-256 ma ọ bụrụ na sistemụ ntụkwasịrị obi achọghị SHA one.',
    sha256: 'SHA two fifty-six na-emepụta akara iji tụnyere faịlụ. Họrọ faịlụ, tụzie akara ahụ dum na nke sitere n’ebe ị tụkwasịrị obi. Nsonaazụ dakọtara anaghị egosi onye mepụtara faịlụ ahụ.',
    sha512: 'SHA five twelve na-emepụta akara faịlụ toro ogologo. Họrọ faịlụ, tụzie akara ahụ dum na nke sitere n’ebe ị tụkwasịrị obi. Jiri ya mgbe onye bipụtara faịlụ ma ọ bụ sistemụ rịọrọ ya.'
  }),
  ha: Object.freeze({
    md5: 'MD5 yana ƙirƙirar gajeren lambar fayil don tsofaffin tsare-tsare. Ba shi da aminci ga muhimman binciken tsaro. Zaɓi fayil don lissafa lambarsa; yi amfani da SHA-256 don bincike mafi aminci.',
    sha1: 'An ajiye SHA one don tsofaffin tsare-tsare, amma ba shi da aminci ga muhimman binciken tsaro. Zaɓi fayil don lissafa lambarsa; yi amfani da SHA-256 sai dai idan tsarin da ka amince da shi ya buƙaci SHA one.',
    sha256: 'SHA two fifty-six yana ƙirƙirar lambar duba fayil. Zaɓi fayil, sannan ka kwatanta cikakkiyar lambar da wadda ta fito daga amintaccen tushe. Daidaito ba ya tabbatar da wanda ya ƙirƙiri fayil ɗin.',
    sha512: 'SHA five twelve yana ƙirƙirar lambar fayil mafi tsawo. Zaɓi fayil, sannan ka kwatanta cikakkiyar lambar da wadda ta fito daga amintaccen tushe. Yi amfani da shi idan mai wallafa ko tsarin ya nema.'
  }),
  pcm: Object.freeze({
    md5: 'MD5 dey make short file code for old systems. E no safe for serious security check. Choose file to calculate di code; use SHA-256 for safer check.',
    sha1: 'We keep SHA one for old systems, but e no safe for serious security check. Choose file to calculate di code; use SHA-256 unless trusted system ask for SHA one.',
    sha256: 'SHA two fifty-six dey make code to check file. Choose di file, then compare di full code with one from trusted source. Match no prove who make di file.',
    sha512: 'SHA five twelve dey make longer file code. Choose di file, then compare di full code with one from trusted source. Use am when di publisher or system ask for am.'
  }),
  es: Object.freeze({
    md5: 'MD5 crea un resumen corto del archivo para sistemas antiguos. No es seguro para comprobaciones importantes. Selecciona un archivo para calcularlo; usa SHA-256 para una comprobación más segura.',
    sha1: 'SHA uno se conserva para sistemas antiguos, pero no es seguro para comprobaciones importantes. Selecciona un archivo para calcularlo; usa SHA-256 salvo que un sistema de confianza requiera SHA uno.',
    sha256: 'SHA dos cincuenta y seis crea un resumen para comprobar un archivo. Selecciónalo y compara el resumen completo con uno de una fuente de confianza. Una coincidencia no demuestra quién creó el archivo.',
    sha512: 'SHA cinco doce crea un resumen de archivo más largo. Selecciónalo y compara el resumen completo con uno de una fuente de confianza. Úsalo cuando lo solicite el editor o el sistema.'
  }),
  fr: Object.freeze({
    md5: 'MD5 crée une courte empreinte de fichier pour les anciens systèmes. Cette méthode n’est pas sûre pour les vérifications importantes. Choisissez un fichier pour la calculer ; préférez SHA-256 pour une vérification plus sûre.',
    sha1: 'SHA one est conservé pour les anciens systèmes, mais n’est pas sûr pour les vérifications importantes. Choisissez un fichier pour le calculer ; préférez SHA-256, sauf si un système de confiance exige SHA one.',
    sha256: 'SHA two fifty-six crée une empreinte pour vérifier un fichier. Choisissez-le, puis comparez l’empreinte complète à celle d’une source fiable. Une correspondance ne prouve pas qui a créé le fichier.',
    sha512: 'SHA five twelve crée une empreinte de fichier plus longue. Choisissez-le, puis comparez l’empreinte complète à celle d’une source fiable. Utilisez-le si l’éditeur ou le système le demande.'
  })
});

const HASH_UNCHECKED_NARRATION = Object.freeze({
  en: name => `${name} is unchecked and will not be included in the file check.`,
  yo: name => `A kò yan ${name}; a kò ní lò ó láti ṣàyẹ̀wò fáìlì.`,
  ig: name => `Ahọpụtaghị ${name}; a gaghị etinye ya na nyocha faịlụ.`,
  ha: name => `Ba a zaɓi ${name} ba; ba za a yi amfani da shi wajen duba fayil ba.`,
  pcm: name => `You no select ${name}, so dem no go include am for di file check.`,
  es: name => `${name} no está seleccionado y no se incluirá en la comprobación.`,
  fr: name => `${name} n’est pas sélectionné et ne sera pas utilisé pour vérifier le fichier.`
});

export function selectNarrationVoice(voices, language = 'en') {
  const speechTag = NARRATION_LANGUAGES[language]?.speechTag || NARRATION_LANGUAGES.en.speechTag;
  const normalizedTag = speechTag.toLowerCase().replaceAll('_', '-');
  const languagePrefix = normalizedTag.slice(0, 2);
  const candidates = (Array.isArray(voices) ? voices : []).map(voice => ({
    voice,
    lang: String(voice.lang || '').toLowerCase().replaceAll('_', '-')
  })).filter(candidate => candidate.lang);
  const exact = candidates.filter(candidate => candidate.lang === normalizedTag);
  const regional = candidates.filter(candidate =>
    candidate.lang.startsWith(`${languagePrefix}-`) && candidate.lang !== normalizedTag
  );
  const base = candidates.filter(candidate => candidate.lang === languagePrefix);
  const englishFallback = language === 'pcm'
    ? candidates.filter(candidate => candidate.lang.startsWith('en-') || candidate.lang === 'en')
    : [];
  const selected = exact.length ? exact : regional.length ? regional : base.length ? base : englishFallback;
  return selected.find(candidate => candidate.voice.localService === true)?.voice
    || selected[0]?.voice
    || null;
}

const HASH_ALGORITHM_NAMES = Object.freeze({
  md5: 'MD5',
  sha1: 'SHA one',
  sha256: 'SHA two fifty-six',
  sha512: 'SHA five twelve'
});

const HASH_EVENT_NARRATION = Object.freeze({
  en: Object.freeze({
    copied: name => `${name} digest copied. Save it separately if you want to compare this file later.`,
    copyFailed: name => `Could not copy the ${name} digest. It is selected so you can copy it manually.`,
    verified: (name, matches, mismatches, unchecked) =>
      `Expected ${name}: ${matches} match${matches === 1 ? '' : 'es'}, ${mismatches} mismatch${mismatches === 1 ? '' : 'es'}, ${unchecked} could not be checked.`,
    invalidExpected: (name, length) =>
      `The expected ${name} digest is invalid. Enter exactly ${length} hexadecimal characters.`,
    exported: 'The file hash report has been prepared for download.'
  }),
  yo: Object.freeze({
    copied: name => `A ti da ààmì ${name} kọ. Fi í pamọ́ lọ́tọ̀ bí o bá fẹ́ fi wé fáìlì náà lọ́jọ́ iwájú.`,
    copyFailed: name => `Dídà ààmì ${name} kò ṣàṣeyọrí. A ti yan ààmì náà kí o lè dà á kọ lọ́wọ́.`,
    verified: (name, matches, mismatches, unchecked) =>
      `Àbájáde ${name}: ìbámu ${matches}, àìbámu ${mismatches}, fáìlì tí a kò lè ṣàyẹ̀wò ${unchecked}.`,
    invalidExpected: (name, length) =>
      `Ààmì ${name} tí a retí kò tọ́. Tẹ àwọn lẹ́tà hexadecimal gangan ${length}.`,
    exported: 'A ti pèsè ìròyìn hash fáìlì fún gbígbà sílẹ̀.'
  }),
  ig: Object.freeze({
    copied: name => `Edepụtala hash ${name}. Chekwaa ya iche ma ọ bụrụ na ịchọrọ iji ya tụnyere faịlụ a ọzọ.`,
    copyFailed: name => `Edepụtaghị hash ${name}. Ahọpụtala ya ka i nwee ike idetuo ya n’aka.`,
    verified: (name, matches, mismatches, unchecked) =>
      `Nsonaazụ ${name}: faịlụ dakọtara ${matches}, ndị na-adabaghị ${mismatches}, ndị a na-enyochaghị ${unchecked}.`,
    invalidExpected: (name, length) =>
      `Hash ${name} ị tụrụ anya adịghị mma. Tinye mkpụrụedemede hexadecimal ${length} kpọmkwem.`,
    exported: 'A kwadebela akụkọ hash faịlụ maka nbudata.'
  }),
  ha: Object.freeze({
    copied: name => `An kwafi hash ${name}. Ajiye shi daban idan kana son sake kwatanta wannan fayil daga baya.`,
    copyFailed: name => `An kasa kwafi hash ${name}. An zaɓe shi domin ka kwafe shi da hannu.`,
    verified: (name, matches, mismatches, unchecked) =>
      `Sakamakon ${name}: daidaito ${matches}, rashin daidaito ${mismatches}, waɗanda ba a iya dubawa ba ${unchecked}.`,
    invalidExpected: (name, length) =>
      `Hash ${name} da ake tsammani ba daidai ba ne. Shigar da haruffan hexadecimal ${length} daidai.`,
    exported: 'An shirya rahoton hash na fayil don saukewa.'
  }),
  pcm: Object.freeze({
    copied: name => `You don copy di ${name} hash. Keep am separate if you wan compare di file again later.`,
    copyFailed: name => `Copy of di ${name} hash no work. Di hash don select so you fit copy am by hand.`,
    verified: (name, matches, mismatches, unchecked) =>
      `${name} check result: ${matches} match, ${mismatches} no match, ${unchecked} no fit check.`,
    invalidExpected: (name, length) =>
      `Di expected ${name} hash no correct. Enter exactly ${length} hexadecimal characters.`,
    exported: 'Di file hash report don ready to download.'
  }),
  es: Object.freeze({
    copied: name => `Se copió el resumen ${name}. Guárdalo por separado si quieres comparar este archivo más adelante.`,
    copyFailed: name => `No se pudo copiar el resumen ${name}. Está seleccionado para que puedas copiarlo manualmente.`,
    verified: (name, matches, mismatches, unchecked) =>
      `Resultado ${name}: ${matches} coincidencias, ${mismatches} diferencias, ${unchecked} sin verificar.`,
    invalidExpected: (name, length) =>
      `El resumen ${name} esperado no es válido. Introduce exactamente ${length} caracteres hexadecimales.`,
    exported: 'El informe de hashes de archivos está preparado para descargarse.'
  }),
  fr: Object.freeze({
    copied: name => `L’empreinte ${name} a été copiée. Enregistrez-la séparément pour comparer ce fichier plus tard.`,
    copyFailed: name => `Impossible de copier l’empreinte ${name}. Elle est sélectionnée pour une copie manuelle.`,
    verified: (name, matches, mismatches, unchecked) =>
      `Résultat ${name} : ${matches} correspondance(s), ${mismatches} différence(s), ${unchecked} fichier(s) non vérifié(s).`,
    invalidExpected: (name, length) =>
      `L’empreinte ${name} attendue est invalide. Saisissez exactement ${length} caractères hexadécimaux.`,
    exported: 'Le rapport des empreintes de fichiers est prêt à être téléchargé.'
  })
});

export function createAudioController({ isLocked }) {
  const $ = id => document.getElementById(id);
  const light = $('light');
  const narration = $('narr');
  const narrationText = $('ntext');
  const audioStatus = $('audioStatus');
  const narrationLanguageSelect = $('narrLanguage');
  const toggles = [];
  let narrationEnabled = false;
  let resetNarrationToggle = () => {};
  let narrationRunning = false;
  let narrationGeneration = 0;
  let narrationMode = 'aes';
  let narrationLanguage = 'en';
  let narrationKeyBits = 256;
  let narrationRsaKeyBits = Number($('rsaKeySize').value);
  let narrationGuide = getNarrationGuide(
    narrationMode, narrationLanguage, narrationKeyBits, narrationRsaKeyBits
  );
  let voice = null;

  const speech = typeof window.speechSynthesis !== 'undefined' &&
    typeof window.speechSynthesis.speak === 'function' &&
    typeof window.speechSynthesis.cancel === 'function' &&
    typeof window.SpeechSynthesisUtterance === 'function';

  function reportError(error) {
    audioStatus.textContent = error.message === 'speech-unavailable'
      ? 'Narration is not supported by this browser.'
      : error.name === 'NotAllowedError'
        ? 'Speech was blocked by the browser. Click Narration again to allow playback.'
        : `Could not start narration${error.message ? `: ${error.message}` : ''}. Check browser speech settings and try again.`;
    audioStatus.classList.add('error');
  }

  function pickVoice(language) {
    const voices = window.speechSynthesis.getVoices();
    return selectNarrationVoice(voices, language);
  }

  function stopNarration() {
    narrationRunning = false;
    narrationGeneration++;
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

  function startNarration() {
    if (!speech) throw new Error('speech-unavailable');
    if (narrationRunning) return true;
    audioStatus.textContent = '';
    audioStatus.classList.remove('error');
    narrationEnabled = true;
    narrationRunning = true;
    return narrationRunning;
  }

  function setNarrationMode(mode, announce = false) {
    if ((!NARRATION_GUIDES[mode] && mode !== 'rsa-direct') || mode === narrationMode) return;
    narrationMode = mode;
    narrationGuide = getNarrationGuide(mode, narrationLanguage, narrationKeyBits, narrationRsaKeyBits);
    if (announce && narrationRunning) {
      announceMessage(getContextualGuide($('mode')));
    }
  }

  function setNarrationKeySize(keyBits, announce = false) {
    if (![128, 192, 256].includes(keyBits) || keyBits === narrationKeyBits) return;
    narrationKeyBits = keyBits;
    narrationGuide = getNarrationGuide(narrationMode, narrationLanguage, narrationKeyBits, narrationRsaKeyBits);
    if (announce && narrationRunning) {
      announceMessage(getKeySizeNarration(narrationLanguage, narrationKeyBits));
    }
  }

  function setNarrationLanguage(language) {
    if (!NARRATION_LANGUAGES[language] || language === narrationLanguage) return;
    narrationLanguage = language;
    voice = null;
    narrationGuide = getNarrationGuide(narrationMode, language, narrationKeyBits, narrationRsaKeyBits);
  }

  function setNarrationRsaKeySize(keyBits, announce = false) {
    if (![2048, 3072, 4096].includes(keyBits) || keyBits === narrationRsaKeyBits) return;
    narrationRsaKeyBits = keyBits;
    narrationGuide = getNarrationGuide(
      narrationMode, narrationLanguage, narrationKeyBits, narrationRsaKeyBits
    );
    if (announce && narrationRunning) {
      announceMessage(getRsaKeySizeNarration(narrationLanguage, narrationRsaKeyBits));
    }
  }

  function getPassphraseStrengthResult({
    generated = false, includeLength = true,
    keyId = 'key', lengthId = 'passphraseLength',
    enforceLength = keyId !== 'stegoAccessKey'
  } = {}) {
    const value = keyId === 'stegoAccessKey' ? $(keyId).value : $(keyId).value.trim();
    const target = Number($(lengthId).value);
    const strings = PASSPHRASE_STRENGTH_NARRATION[narrationLanguage]
      || PASSPHRASE_STRENGTH_NARRATION.en;
    const estimate = estimatePassphraseStrength(value, target);
    if (!estimate) return null;

    const actual = countPassphraseCharacters(value);
    let lengthGuidance = enforceLength ? strings.unique : strings.optionalLength;
    if (enforceLength && actual < target) {
      const difference = target - actual;
      lengthGuidance = `${strings.add} ${difference} ${strings.characters} ${strings.meetLength}`;
    } else if (enforceLength && actual > target) {
      const difference = actual - target;
      lengthGuidance = `${strings.remove} ${difference} ${strings.characters} ${strings.meetLength}`;
    } else if (enforceLength && narrationLanguage === 'en' && estimate.guidance.startsWith('For a higher estimate')) {
      lengthGuidance = strings.lengthMet;
    }
    const grade = strings[estimate.level];
    const detail = enforceLength && narrationLanguage === 'en' &&
      actual === target &&
      estimate.guidance.startsWith('For a higher estimate')
      ? `${estimate.guidance} `
      : '';
    const lengthSummary = includeLength
      ? enforceLength
        ? `${actual} of ${target} ${strings.characters}. ${lengthGuidance} `
        : `${actual} ${strings.characters}. ${lengthGuidance} `
      : '';
    return `${generated ? `${strings.generated} ` : ''}${strings.estimate}: ${grade}, ${estimate.score} out of 100. ${lengthSummary}${detail}${strings.disclaimer}`;
  }

  function getContextualGuide(target) {
    if (!target || typeof target.closest !== 'function') return null;
    const element = target.closest(
      'input,textarea,select,button,label,summary,#stegoStatus,#stegoCarrierStatus,#stegoPayloadStatus,#stegoExtractHint,#stegoFileSelectionSummary,.field-hint,.key-strength-status,.key-strength-guidance,.stego-detail,.stego-extract-hint,.stego-warning,.stego-security-card,.stego-capacity-card,.stego-format-card,.stego-picker-copy,.stego-drop-hint,.stego-section-label,[role="progressbar"],progress,.otext,.audio-status,.hash-dropzone,.hash-selected,.hash-output'
    );
    if (!element) return null;
    const hashAlgorithmInput = element.name === 'hashAlgorithm' ? element : element.querySelector?.('input[name="hashAlgorithm"]');
    if (hashAlgorithmInput && hashAlgorithmInput.name === 'hashAlgorithm') {
      const algorithm = hashAlgorithmInput.value;
      return HASH_ALGORITHM_GUIDES[narrationLanguage]?.[algorithm] ||
        HASH_ALGORITHM_GUIDES.en[algorithm] ||
        'Hash algorithm selector. Choose the digest you want to calculate with the selected file.';
    }
    const id = element.tagName === 'LABEL' ? element.htmlFor : element.id;
    const isWithin = selector => typeof element.matches === 'function' &&
      (element.matches(selector) || Boolean(element.closest?.(selector)));
    if (element.tagName === 'SUMMARY' && isWithin('.stego-key-advanced')) {
      return 'Advanced key options. Expand this section to hear the passphrase generator and key-strength estimate.';
    }
    const stegoControlGuidance = {
      stegoModeHide: 'Embed mode. Choose a carrier and one payload source, then encrypt and embed it. PNG and JPEG images use pixel embedding; PDFs receive a standard encrypted attachment; other files have an encrypted block appended.',
      stegoModeExtract: 'Extract mode. Choose the unchanged output carrier and the same access key used to embed the payload.',
      stegoDropzone: 'Carrier picker. Choose one PNG or JPEG image, video, audio recording, PDF, document, or other file. PNG and JPEG use pixel embedding; JPEG output becomes PNG. PDFs receive an encrypted attachment and remain PDFs; other files have data appended, which is not concealed.',
      stegoCarrier: 'Choose one carrier file, including a PDF or document. PNG and JPEG images use pixel embedding; PDFs receive an encrypted attachment; other files have encrypted payload data appended.',
      stegoCapacityBar: 'Carrier capacity indicator. Image capacity is estimated from opaque pixels; PDFs and other files support payloads up to four mebibytes. Other files have data appended, which is not concealed.',
      stegoCapacityValue: 'Estimated capacity for the selected carrier. Image capacity depends on opaque pixels; PDFs use an attachment; other files use appended data.',
      stegoPayloadSection: 'Payload source. Choose either a text message or files, not both. One file keeps its format; multiple files or a folder are bundled into a ZIP.',
      stegoText: 'Text payload. Enter the message to encrypt and embed. Choose either text or files, not both. The maximum plaintext payload is four mebibytes.',
      stegoFilePicker: 'File payload picker. Add one file, multiple files, or a folder. A single file keeps its format; collections and folders are bundled into a ZIP.',
      stegoChooseFiles: 'Choose one or more files to embed. A single file keeps its format; multiple files are bundled into a ZIP.',
      stegoChooseFolder: 'Choose a folder to embed. Folder contents are bundled into a ZIP with their relative paths.',
      stegoClearFiles: 'Clear the selected payload files and folder.',
      stegoHide: 'Encrypt and embed the selected payload with the chosen workspace access key.',
      stegoExtract: 'Extract and decrypt the payload from the selected unchanged carrier using the same workspace access key.',
      stegoKeySetup: 'Workspace access-key settings. This key is always used in the media and file payload workspace, independently of the main Access key. Keep it to extract payloads.',
      stegoStatus: $('stegoStatus').textContent,
      stegoCarrierStatus: $('stegoCarrierStatus').textContent,
      stegoPayloadStatus: $('stegoPayloadStatus').textContent,
      stegoExtractHint: $('stegoExtractHint').textContent,
      stegoFileSelectionSummary: $('stegoFileSelectionSummary').textContent
    };
    if (stegoControlGuidance[id]) return stegoControlGuidance[id];
    if (isWithin('.stego-security-card')) {
      return 'Payloads are encrypted with authenticated AES-256-GCM before embedding. The selected workspace access key is required to recover them.';
    }
    if (isWithin('.stego-capacity-card')) {
      return 'Carrier capacity. Image capacity depends on opaque pixels; PDFs use standard embedded attachments; other non-PDF files have encrypted data appended, which is not concealed and may affect compatibility.';
    }
    if (isWithin('.stego-format-card')) {
      return 'Supported workflow. PNG uses pixel embedding; JPEG input becomes PNG; PDFs keep their format with an encrypted attachment; other files use appended data. A single payload file keeps its format, while folders and multiple files recover as a ZIP.';
    }
    if (isWithin('.stego-warning')) {
      return element.textContent.trim();
    }
    if (isWithin('.stego-picker-copy')) {
      return 'Select one carrier, including a PDF or document. PNG and JPEG images use pixel embedding; JPEG becomes PNG. PDFs receive a standard encrypted attachment; other files have encrypted payload data appended, which is not concealed.';
    }
    if (isWithin('.stego-drop-hint')) {
      return 'Drop files into the payload picker, or use Choose folder to preserve a folder structure.';
    }
    if (isWithin('.stego-section-label')) {
      return element.textContent.trim();
    }
    const localizedHashControl = HASH_CONTROL_NARRATION[narrationLanguage]?.[id];
    if (localizedHashControl) return localizedHashControl;
    if (id === 'signatureToolsSummary') {
      return SIGNATURE_EVENT_NARRATION[narrationLanguage]?.summary
        || SIGNATURE_EVENT_NARRATION.en.summary;
    }
    if (id === 'signatureStatus') {
      const status = $('signatureStatus').textContent;
      if (/signing stopped/i.test(status)) return SIGNATURE_EVENT_NARRATION[narrationLanguage]?.keyMismatch;
      if (/could not be decrypted/i.test(status)) return getSignatureEventMessage('decryptionFailed', narrationLanguage);
      if (/message decrypted/i.test(status)) return SIGNATURE_EVENT_NARRATION[narrationLanguage]?.decrypted;
      if (/verification failed/i.test(status)) return SIGNATURE_EVENT_NARRATION[narrationLanguage]?.failed;
      if (/signature verified|signature is valid/i.test(status)) return SIGNATURE_EVENT_NARRATION[narrationLanguage]?.verified;
      if (/unsigned message/i.test(status)) return SIGNATURE_EVENT_NARRATION[narrationLanguage]?.unsigned;
      if (/message signed/i.test(status)) return SIGNATURE_EVENT_NARRATION[narrationLanguage]?.signed;
      return status || getControlNarration(id, narrationLanguage);
    }
    if (id === 'stegoStatus' || id === 'stegoCarrierStatus' ||
        id === 'stegoPayloadStatus' || id === 'stegoExtractHint' ||
        id === 'stegoFileSelectionSummary') {
      return $(id).textContent || getControlNarration(id, narrationLanguage);
    }
    if (id === 'keyStrengthMeter' || id === 'keyStrengthStatus' || id === 'keyStrengthGuidance' ||
        id === 'stegoKeyStrengthMeter' || id === 'stegoKeyStrengthStatus' || id === 'stegoKeyStrengthGuidance') {
      const separateKey = id.startsWith('stego');
      return getPassphraseStrengthResult(separateKey
        ?{
          keyId:'stegoAccessKey',
          lengthId:'stegoPassphraseLength',
          includeLength:true
        }
        :undefined) || getControlNarration(id, narrationLanguage);
    }
    const controlNarration = getControlNarration(id, narrationLanguage);
    if (controlNarration) return controlNarration;
    const methodName = NARRATION_METHOD_NAMES[narrationMode];
    if (narrationLanguage !== 'en') {
      if (id === 'mode' || id === 'modeHint') return `${methodName}. ${narrationGuide[0]}`;
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
      if (id === 'hashInput' || id === 'hashDropzone' || id === 'hashSelected' || id === 'hashOutput') {
        return getControlNarration(id, narrationLanguage) || 'File hash calculator. Select files and choose MD5, SHA-1, SHA-256, or SHA-512 to compute the local digest values in your browser.';
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
    const method = narrationGuide;
    const why = {
      aes: 'This is the recommended choice when you and the recipient can share an access key safely. It also checks whether the encrypted message was changed.',
      cbc: 'This older choice is only needed for some existing systems. Use the recommended AES-GCM method for a new message.',
      'rsa-direct': `This method can only protect a short message. With a ${narrationRsaKeyBits}-bit key, the limit is ${narrationRsaKeyBits / 8 - 66} bytes. Choose the hybrid method for a longer message.`,
      'rsa-aes': 'This special method needs both a shared access key and the recipient’s private key to open a message. It is limited to short messages.',
      hybrid: 'This is the recommended way to send a message using a recipient’s public key. You do not need to share an access key for the message.',
      legacy: 'This old method is unsafe and is only here to open old messages. Never use it to protect a new or private message.'
    }[narrationMode];
    const accessKey = narrationMode === 'rsa-aes'
      ? 'This method needs the shared access key as well as the recipient’s private key.'
      : narrationMode === 'hybrid' || narrationMode === 'rsa-direct'
      ? 'This access key is not used for this message method. It is still needed for file encryption and access-key methods.'
      : narrationMode === 'legacy'
        ? 'Enter the old key only to open an old message. This method is unsafe and cannot reliably show if someone changed the message.'
        : 'Use a long access key that you do not use anywhere else. Share it separately from the protected message, because anyone with both can read the message.';
    const guides = {
      mode: `${methodName}. Message protection method. ${method[0]} ${why}`,
      modeHint: `${methodName}. ${method[0]} ${why}`,
      aesKeySize: getKeySizeNarration(narrationLanguage, narrationKeyBits),
      rsaKeySize: getRsaKeySizeNarration(narrationLanguage, narrationRsaKeyBits),
      key: `Access key box. ${accessKey}`,
      inp: `Message box. Type the message you want to protect, or paste the complete protected message here to open it. ${why}`,
      encB: `Encrypt message button. It protects the message in the box and shows the result here. ${why}`,
      decB: `Decrypt message button. Paste the complete protected message and provide the matching access key or private key, as needed. If the key is wrong or the protected message was changed, it may not open. ${why}`,
      clrB: 'Clear button. It removes the message, result, and selected file from this page. It does not delete anything you already saved to your device.',
      out: 'Result area. This shows either a protected message or an opened message. Opened messages may be private. Do not share them unless you mean to.',
      copy: 'Copy result button. It copies the result. Check that the result is safe to share before sending it to anyone.',
      downloadToken: 'Download message button. It saves the protected message, but not the access key or private key.',
      rsaPublic: 'Recipient public key box. Paste the public key text here to protect a message for its owner. Public keys can be shared, but compare the full fingerprint with the owner through a separate trusted way first.',
      rsaPrivate: 'Private key box. Paste the matching private key here to open messages. This key can unlock messages sent to its matching public key. Never share it. If you choose to show or export it, keep it somewhere secure.',
      rsaKeyMode: 'Private key storage choice. A key kept only in the browser cannot be backed up here and is lost when the page reloads or locks. An exported key can be backed up, but you must keep it secret.',
      rsaKeySizeHint: getRsaKeySizeNarration(narrationLanguage, narrationRsaKeyBits),
      generateRsa: `Make keys button. It makes a ${narrationRsaKeyBits}-bit public key and private key. The private key kept in the browser is lost if the page reloads or locks. Check the public key fingerprint with its owner before using it.`,
      copyPublic: 'Copy public key button. You can share this key, but check its fingerprint with the owner first.',
      copyPrivate: 'Copy private key button. This copies a key that can open messages. Keep it somewhere secure and never share it.',
      migrateLegacy: 'Move old message to safer protection button. It puts the opened message in the message box, chooses the recommended method, and removes the old key from the box. Enter a new long access key and protect the message again. The old method is unsafe.',
      rsaFingerprint: 'Public key fingerprint. Compare the whole fingerprint with the owner through a separate trusted way before using this key. Matching fingerprints show that the keys match; they do not prove who the owner is.',
      fileInput: 'Choose a file. Pick the file you want to protect, or a protected file you want to open. File protection always uses the access key and AES-GCM, no matter which message method is selected.',
      fileEncrypt: 'Protect and save file button. It protects the chosen file with your access key and saves a new protected file.',
      fileDecrypt: 'Open and save file button. It checks the protected file as it opens it, then saves the opened file. Use the same access key used to protect it.',
      hashDropzone: 'File check area. Drop one or more files here, or choose them from your device. The app checks them on your device and does not send them anywhere.',
      hashInput: 'Choose files to check. The app makes a short code for each file using the methods you selected.',
      hashSelected: 'Chosen files. This shows which files are ready to check.',
      hashOutput: 'File check results. Each code helps compare a file with a copy you trust. Compare the whole code, not just the beginning.',
      passphraseLength: 'Generated passphrase length. Choose between 16 and 64 characters. Longer randomly generated passphrases are harder to guess; 24 characters is the recommended default.',
      generatePassphrase: 'Generate secure passphrase button. It uses browser cryptographic randomness to create a mixed-character access key and puts it in the access-key box. It is not saved for you, so store it securely before relying on it.',
      stegoAccessKey: 'Media and file payload workspace access key. This key is always used in this workspace, not the main Access key. Keep it securely and use the same key to recover the payload.',
      stegoAccessKeyEye: 'Show or hide the media and file payload workspace access key.',
      stegoPassphraseLength: 'Passphrase length for the media and file payload key generator. This only determines the length of generated passphrases.',
      stegoGeneratePassphrase: 'Generate secure passphrase button for the media and file payload workspace. It uses browser cryptographic randomness. Store the generated key securely; it is not saved for you.',
      keyStrengthMeter: 'Access-key quality meter. It gives a rough estimate based on length, character variety, repetition, and common sequences. It is not a password audit and cannot detect reused passphrases or personal information.',
      keyStrengthStatus: 'Access-key quality estimate. The score is a rough guide, not a password audit. Suggestions can flag selected length, character variety, repeated runs, and predictable sequences. Character groups are not a password requirement; prefer a long, unique, securely generated passphrase.',
      signatureToolsSummary: SIGNATURE_EVENT_NARRATION[narrationLanguage]?.summary
        || SIGNATURE_EVENT_NARRATION.en.summary,
      exportHashResults: 'Export hash results CSV button. It downloads calculated digests and match results for the selected files.',
      hashProgress: 'Hashing progress and completion status for the selected files.',
      expectedHashAlgorithm: 'Expected hash algorithm. Choose the same algorithm used by the digest you were given. The selected digest is calculated even if its algorithm checkbox is not selected.',
      expectedHash: 'Expected digest. Paste the complete hexadecimal digest from a source you trust. The calculator compares it with the selected file and reports Match or Mismatch. A match does not prove the digest came from an authentic source.',
      expectedHashHint: 'Expected digest guidance. The digest must have the exact length and hexadecimal format for its algorithm. Prefer SHA-256 or SHA-512; MD5 and SHA-1 are only for compatibility.',
      signMessage: 'Sign encrypted output. When checked, the app wraps a supported encrypted message token in an ECDSA P-256 signature. A matching private and public key pair is required. Recipients still need to trust the signing-key fingerprint.',
      signingKeyMode: 'Generated signing-key handling. This setting affects newly generated keys only. A non-extractable key stays in this page and is lost when it locks or closes. Choose exportable PEM only if you need a secure backup.',
      ecdsaPublicKey: 'ECDSA public signing key. Compare its full SHA-256 fingerprint with the claimed sender through a separate trusted channel before trusting signatures.',
      ecdsaPrivateKey: 'ECDSA private signing key. This key can create signatures. Keep it secret and back it up securely if it is exportable.',
      generateEcdsa: 'Generate ECDSA P-256 signing-key button. Keep the private key secret. Share only the public key and compare its fingerprint through a separate trusted channel.',
      copyEcdsaPublic: 'Copy public signing key button. Share only this public key and verify its fingerprint through a trusted channel.',
      copyEcdsaPrivate: 'Copy private signing-key backup button. This key can create signatures in your name. Keep it secret and store it securely.',
      verifySignature: 'Verify signature only button. It checks the signed encrypted token with the supplied ECDSA public key without decrypting the message. Trust the key fingerprint separately.',
      signatureStatus: 'Signature status. A valid signature proves the matching private key signed the token, not the identity of the person holding that key.',
      md5: 'MD5 makes a short code for a file. It is useful for older systems or spotting duplicates, but it is not safe for checking that a file is genuine.',
      sha1: 'SHA one makes a code for a file. Some older systems still need it, but it is not safe for important file checks.',
      sha256: 'SHA two fifty-six makes a code for a file and is a good default for checking a download. Compare the whole code with one from a source you trust.',
      sha512: 'SHA five twelve makes a longer code for a file. Use it when the maker or system asks for it. Compare the whole code with one from a source you trust.'
    };
    if (id === 'narrLanguage') return getControlNarration(id, narrationLanguage);
    if (id === 'voxB') return getControlNarration(id, narrationLanguage);
    if (id === 'eye') return getControlNarration(id, narrationLanguage);
    if (id === 'aesKeySizeHint') return guides.aesKeySize;
    if (id === 'aesKeySize' || id === 'rsaKeySize') return guides[id];
    if (id === 'key') return `${guides.key} ${why}`;
    if (id === 'rsaPublic') return `${guides.rsaPublic} ${why}`;
    if (id === 'keyHint') return `Access key guidance. ${accessKey} ${why}`;
    if (id === 'rsaKeyModeHint' || id === 'rsaKeySummary' || id === 'rsaBackupReminder') return guides.rsaKeyMode;
    if (id === 'fingerprintStatus') return guides.rsaFingerprint;
    if (id === 'fileHint') return guides.fileInput;
    if (id === 'hashDropzone' || id === 'hashInput' || id === 'hashSelected' || id === 'hashOutput' ||
        id === 'exportHashResults' || id === 'hashProgress' ||
        id === 'passphraseLength' || id === 'generatePassphrase' ||
        id === 'stegoAccessKey' || id === 'stegoAccessKeyEye' || id === 'stegoPassphraseLength' ||
        id === 'stegoGeneratePassphrase' || id === 'expectedHashAlgorithm' || id === 'expectedHash' ||
        id === 'expectedHashHint' || id === 'signMessage' || id === 'signingKeyMode' ||
        id === 'ecdsaPublicKey' || id === 'ecdsaPrivateKey' || id === 'generateEcdsa' ||
        id === 'copyEcdsaPublic' || id === 'copyEcdsaPrivate' || id === 'verifySignature' ||
        id === 'signatureStatus') return guides[id];
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

  function announceMessage(message) {
    if (!narrationRunning || isLocked() || document.hidden) return;
    const speechText = String(message || '').replace(/\s+/g, ' ').trim();
    if (!speechText) return;
    narrationGeneration++;
    const generation = narrationGeneration;
    window.speechSynthesis.cancel();
    try {
      voice = voice || pickVoice(narrationLanguage);
      const utterance = new window.SpeechSynthesisUtterance(speechText);
      if (voice) utterance.voice = voice;
      utterance.lang = NARRATION_LANGUAGES[narrationLanguage].speechTag;
      utterance.rate = .92;
      utterance.pitch = 1;
      utterance.volume = 1;
      narrationText.textContent = `"${speechText}"`;
      narration.classList.add('active');
      light.classList.add('active');
      utterance.onend = () => {
        if (generation !== narrationGeneration) return;
        narration.classList.remove('active');
        light.classList.remove('active');
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
    if (event.type !== 'click') return;
    const target = event.target;
    // Find a nearby interactive control first; prefer a selector that includes the hash dropzone
    const element = target?.closest?.(
      'input,textarea,select,button,label,summary,#signatureStatus,#stegoStatus,#stegoCarrierStatus,#stegoPayloadStatus,#stegoExtractHint,#stegoFileSelectionSummary,#stegoCapacityValue,.field-hint,.key-strength-status,.key-strength-guidance,meter,progress,[role="progressbar"],.stego-detail,.stego-extract-hint,.stego-warning,.stego-security-card,.stego-capacity-card,.stego-format-card,.stego-picker-copy,.stego-file-picker-copy,.stego-drop-hint,.stego-section-label,.otext,.audio-status,.hash-dropzone,.hash-selected,.hash-output'
    );
    if (!element) return;
    // Ignore narration toggle and selects opening
    if (element.id === 'voxB' || element.tagName === 'SELECT') return;
    if (element.id === 'generatePassphrase' || element.id === 'stegoGeneratePassphrase') return;
    // If this was a hash-algorithm click (a checkbox inside the algorithms area), ignore here so
    // the change handler can announce the algorithm change explicitly.
    const hashAlgorithmInput = element.name === 'hashAlgorithm'
      ? element
      : element.querySelector?.('input[type="checkbox"][name="hashAlgorithm"]');
    if (hashAlgorithmInput) return;
    announceMessage(getContextualGuide(event.target));
  }

  function announceStatus(status) {
    const statusKey = status === 'messageEncrypted' && narrationMode === 'legacy'
      ? 'messageEncryptedLegacy'
      : status;
    const message = status === 'rsaKeyGenerated'
      ? getRsaGeneratedNarration(narrationLanguage, narrationRsaKeyBits, narrationMode)
      : STATUS_NARRATION[narrationLanguage]?.[statusKey] || STATUS_NARRATION.en[statusKey];
    if (!message) return false;
    announceMessage(message);
    return true;
  }

  function announceStegoKeyOptions(open) {
    const messages = {
      en: open
        ? 'Advanced key options expanded. Choose a passphrase generator length and review the strength estimate.'
        : 'Advanced key options collapsed. The workspace key field remains available.',
      yo: open
        ? 'Àwọn àṣàyàn kọ́kọ́rọ́ tó ti ní ìlọsíwájú ti ṣí. Yan gígùn fún ohun èlò dídá ọ̀rọ̀ aṣínà, o lè béèrè fún gígùn kan náà, kí o sì wo ìṣírò agbára.'
        : 'Àwọn àṣàyàn kọ́kọ́rọ́ tó ti ní ìlọsíwájú ti pa. Apótí kọ́kọ́rọ́ workspace ṣì wà.',
      ig: open
        ? 'Nhọrọ igodo dị elu emeghela. Họrọ ogologo maka ngwa imepụta paswọọdụ, họrọ ma ị chọrọ ịmanye otu ogologo ahụ, ma lelee atụmatụ ike igodo.'
        : 'Emechiela nhọrọ igodo dị elu. Igbe igodo workspace ka dị.',
      ha: open
        ? 'An buɗe saitunan maɓalli na ci gaba. Zaɓi tsawon kalmar sirri, zaɓi ko za a tilasta wannan tsawon, sannan a duba ƙiyasin ƙarfin maɓalli.'
        : 'An rufe saitunan maɓalli na ci gaba. Akwatin maɓallin workspace yana nan.',
      pcm: open
        ? 'Advanced key options don open. Choose generator length and check key-strength estimate.'
        : 'Advanced key options don close. Workspace key box still dey.',
      es: open
        ? 'Se abrieron las opciones avanzadas de la clave. Elige la longitud del generador y consulta la estimación de seguridad.'
        : 'Se cerraron las opciones avanzadas. El campo de clave del espacio de trabajo sigue disponible.',
      fr: open
        ? 'Les options avancées de la clé sont ouvertes. Choisissez la longueur du générateur et consultez l’estimation de robustesse.'
        : 'Les options avancées sont fermées. Le champ de clé de l’espace de travail reste disponible.'
    };
    announceMessage(messages[narrationLanguage] || messages.en);
    return true;
  }

  function announceStegoStatus(status, detail = '') {
    const messages = {
      carrierRemoved: 'The carrier selection was cleared.',
      carrierAppendReady: 'Carrier inspected. Up to four mebibytes can be appended as encrypted data; it is not concealed and may affect compatibility.',
      pdfCarrierReady: 'PDF inspected. The encrypted payload will be stored as a standard attachment inside the PDF, which remains a PDF. Attachment display depends on the viewer.',
      carrierInvalid: 'The selected carrier could not be inspected. Choose a supported image or a file within the carrier size limit.',
      jpegExtractUnavailable: 'JPEG is accepted as a source image for hiding, but extraction requires the PNG output created by this tool.',
      embedMode: 'Embed mode selected. Choose a carrier, one payload source, and an access key.',
      extractMode: 'Extract mode selected. Choose the unchanged output carrier and the same access key used to embed the payload.',
      carrierRequired: 'Choose one carrier file before continuing.',
      keyRequired: 'Enter the workspace access key to continue. The main Access key is not used here.',
      keyTooShort: detail
        ?`The workspace key has ${detail} At least 10 characters are required to extract a payload.`
        :'The workspace access key must contain at least 10 characters to extract a payload.',
      folderRequired: 'Use the folder picker to add a folder and preserve its structure.',
      tooManyPayloadFiles: 'A payload collection can contain no more than 1,000 files.',
      oneCarrierRequired: 'Choose one carrier file at a time.',
      operationFailed: 'The payload operation could not be completed. Review the message in the workspace and try again.',
      embedded: 'The payload was encrypted and embedded in the image. Keep the output unchanged and retain the access key.',
      pdfAttached: 'The encrypted payload was attached inside the PDF. The PDF remains valid and its pages are preserved. Keep the output unchanged and retain the access key.',
      appended: 'The payload was encrypted and appended to a copy of the carrier. Appended data is not concealed and may affect compatibility.',
      extracted: 'The payload was authenticated, decrypted, and downloaded. Keep the access key secure.'
    };
    const message = status === 'imageCarrierReady'
      ?detail
      :status === 'operationFailed'
        ?$('stegoStatus').textContent || 'The payload operation failed. Review the workspace and try again.'
        :messages[status];
    if (!message) return false;
    announceMessage(message);
    return true;
  }

  function announceLanguageChanged(language) {
    if (!NARRATION_LANGUAGES[language]) return false;
    announceMessage(LANGUAGE_CHANGE_NARRATION[language]);
    return true;
  }

  function announceHashAlgorithm(algorithm, selected = true) {
    const guide = HASH_ALGORITHM_GUIDES[narrationLanguage]?.[algorithm]
      || HASH_ALGORITHM_GUIDES.en[algorithm];
    if (!guide) return false;
    const label = HASH_ALGORITHM_NAMES[algorithm];
    const message = selected
      ? guide
      : (HASH_UNCHECKED_NARRATION[narrationLanguage] || HASH_UNCHECKED_NARRATION.en)(label);
    announceMessage(message);
    return true;
  }

  function announceHashDigestCopy(algorithm, copied) {
    const name = HASH_ALGORITHM_NAMES[algorithm];
    const messages = HASH_EVENT_NARRATION[narrationLanguage] || HASH_EVENT_NARRATION.en;
    if (!name) return false;
    announceMessage(messages[copied ? 'copied' : 'copyFailed'](name));
    return true;
  }

  function announceHashVerification(algorithm, matches, mismatches, unchecked) {
    const name = HASH_ALGORITHM_NAMES[algorithm];
    const messages = HASH_EVENT_NARRATION[narrationLanguage] || HASH_EVENT_NARRATION.en;
    if (!name || [matches, mismatches, unchecked].some(count => !Number.isInteger(count) || count < 0)) {
      return false;
    }
    announceMessage(messages.verified(name, matches, mismatches, unchecked));
    return true;
  }

  function announceInvalidExpectedHash(algorithm, length) {
    const name = HASH_ALGORITHM_NAMES[algorithm];
    const messages = HASH_EVENT_NARRATION[narrationLanguage] || HASH_EVENT_NARRATION.en;
    if (!name || !Number.isInteger(length) || length < 1) return false;
    announceMessage(messages.invalidExpected(name, length));
    return true;
  }

  function announceHashExported() {
    const messages = HASH_EVENT_NARRATION[narrationLanguage] || HASH_EVENT_NARRATION.en;
    announceMessage(messages.exported);
    return true;
  }

  function announcePassphraseLength(length, {
    keyId = 'key', lengthId = 'passphraseLength',
    enforceLength = keyId !== 'stegoAccessKey'
  } = {}) {
    if (![16, 20, 24, 32, 40, 64].includes(length)) return false;
    const guidance=getContextualGuide($(lengthId))||
      'Generated passphrase length. Choose between 16 and 64 characters. Longer random passphrases are harder to guess; 24 characters is the recommended default.';
    const strengthResult = getPassphraseStrengthResult({
      includeLength: keyId === 'stegoAccessKey', enforceLength, keyId, lengthId
    });
    announceMessage(`${guidance} Selected length: ${length} characters.${strengthResult ? ` ${strengthResult}` : ''}`);
    return true;
  }

  function announcePassphraseResult(options) {
    const message = getPassphraseStrengthResult(options);
    if (!message) return false;
    announceMessage(message);
    return true;
  }

  function announcePassphraseGenerationError() {
    const messages = {
      en: 'A secure passphrase could not be generated. Use a secure browser on HTTPS or localhost, then try again.',
      yo: 'A kò lè dá ọ̀rọ̀ aṣínà ààbò. Lo ẹ̀rọ aṣàwákiri ààbò lórí HTTPS tàbí localhost, kí o sì tún gbìyànjú.',
      ig: 'Enweghị ike ịmepụta paswọọdụ nchekwa. Jiri ihe nchọgharị nchekwa na HTTPS ma ọ bụ localhost, nwaa ọzọ.',
      ha: 'Ba a iya ƙirƙirar kalmar sirri mai tsaro ba. Yi amfani da amintaccen burauza a HTTPS ko localhost, sannan a sake gwadawa.',
      pcm: 'We no fit generate secure passphrase. Use secure browser for HTTPS or localhost, then try again.',
      es: 'No se pudo generar una frase segura. Usa un navegador seguro con HTTPS o localhost e inténtalo de nuevo.',
      fr: 'Impossible de générer une phrase sécurisée. Utilisez un navigateur sécurisé avec HTTPS ou localhost, puis réessayez.'
    };
    announceMessage(messages[narrationLanguage] || messages.en);
    return true;
  }

  function announceExpectedHashAlgorithm() {
    announceMessage(getContextualGuide($('expectedHashAlgorithm')));
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

  resetNarrationToggle = toggle($('voxB'), 'Narration: On', 'Narration: Off', async enabled => {
    if (enabled) {
      return startNarration();
    } else {
      narrationEnabled = false;
      stopNarration();
    }
  });

  $('mode').addEventListener('change', () => {
    setNarrationMode($('mode').value, true);
  });
  narrationLanguageSelect.addEventListener('change', () => {
    setNarrationLanguage(narrationLanguageSelect.value);
    announceLanguageChanged(narrationLanguageSelect.value);
  });
  $('aesKeySize').addEventListener('change', () => {
    setNarrationKeySize(Number($('aesKeySize').value), true);
  });
  $('rsaKeySize').addEventListener('change', handleRsaKeySizeChange);
  $('passphraseLength').addEventListener('change', () => {
    announcePassphraseLength(Number($('passphraseLength').value));
  });
  $('stegoPassphraseLength').addEventListener('change', () => {
    announcePassphraseLength(Number($('stegoPassphraseLength').value), {
      keyId:'stegoAccessKey',
      lengthId:'stegoPassphraseLength',
      enforceLength:false
    });
  });
  document.querySelector?.('.stego-key-advanced')?.addEventListener('toggle', event => {
    announceStegoKeyOptions(event.currentTarget.open);
  });
  $('expectedHashAlgorithm').addEventListener('change', announceExpectedHashAlgorithm);
  if (speech) window.speechSynthesis.onvoiceschanged = () => { voice = pickVoice(narrationLanguage); };
  document.addEventListener('click', announceContext);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && speech) {
      window.speechSynthesis.cancel();
      narration.classList.remove('active');
      light.classList.remove('active');
    }
  });

  return {
    setNarrationMode,
    setNarrationKeySize,
    setNarrationRsaKeySize,
    setNarrationLanguage,
    announceStatus,
    announceStegoStatus,
    announceStegoKeyOptions,
    announceLanguageChanged,
    announceHashAlgorithm,
    announceHashDigestCopy,
    announceHashVerification,
    announceInvalidExpectedHash,
    announceHashExported,
    announcePassphraseLength,
    announcePassphraseResult,
    announcePassphraseGenerationError,
    announceSignatureEvent(event) {
      const message = getSignatureEventMessage(event, narrationLanguage);
      if (!message) return false;
      announceMessage(message);
      return true;
    },
    reset() {
      narrationEnabled = false;
      stopNarration();
      toggles.forEach(reset => reset());
    }
  }
}
