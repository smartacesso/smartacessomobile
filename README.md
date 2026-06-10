# Smart Acesso — Mobile

App React Native (Expo SDK 54) para moradores, responsáveis e perfil gerencial do Smart Acesso.

- **Package Android:** `br.com.smartacesso.mobile.app`
- **Bundle iOS:** `br.com.smartacesso.mobile.app`
- **API:** `{servidor}/sistema/restful-services/app`

---

## Índice

1. [Desenvolvimento](#desenvolvimento)
2. [Pré-requisitos de build nativo](#pré-requisitos-de-build-nativo)
3. [Firebase e push](#firebase-e-push)
4. [Build Android](#build-android)
5. [Build iOS](#build-ios)
6. [EAS Build (nuvem)](#eas-build-nuvem)
7. [Debug vs Release](#debug-vs-release)
8. [Publicação nas lojas](#publicação-nas-lojas)
9. [Solução de problemas](#solução-de-problemas)

---

## Desenvolvimento

```bash
npm install
npx expo start
```

Edite as telas em `app/` (Expo Router).

### Limitações do Expo Go

| Recurso | Expo Go | Build nativo (APK/IPA) |
|---------|---------|-------------------------|
| Login / API | Sim | Sim |
| Push FCM/APNs nativo | **Não** | Sim |
| `google-services.json` | **Não** | Sim |

Para testar **notificações push**, use sempre **APK/IPA release** ou development build — não o Expo Go.

---

## Pré-requisitos de build nativo

### Todos os sistemas

- **Node.js** 20+ (LTS recomendado)
- **npm** (vem com Node)
- Dependências instaladas: `npm install`

### Android (Windows, macOS ou Linux)

| Ferramenta | Versão / observação |
|------------|---------------------|
| **JDK** | 17 ou 21 (`JAVA_HOME` apontando para o JDK) |
| **Android SDK** | Via [Android Studio](https://developer.android.com/studio) |
| **ANDROID_HOME** | Ex.: `C:\Users\<user>\AppData\Local\Android\Sdk` |
| **Platform tools** | `adb` no PATH (opcional, para instalar no celular) |

Variáveis de ambiente (PowerShell — ajuste os caminhos):

```powershell
$env:ANDROID_HOME = "C:\Users\<user>\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
```

### iOS (somente macOS)

| Ferramenta | Observação |
|------------|------------|
| **Xcode** | Versão compatível com SDK do Expo 54 |
| **CocoaPods** | `sudo gem install cocoapods` ou via Homebrew |
| **Conta Apple Developer** | Obrigatória para instalar em dispositivo físico e App Store |

Build iOS **não roda no Windows**. Use Mac local ou **EAS Build** na nuvem.

---

## Firebase e push

### Android

1. Projeto Firebase: `smartacesso-mobile` (ou o configurado no console).
2. Arquivo na raiz do projeto: **`google-services.json`**
3. Package deve ser **`br.com.smartacesso.mobile.app`** (igual ao `app.json`).
4. Backend: service account JSON no servidor (`FIREBASE_SERVICE_ACCOUNT_PATH`).

### iOS

1. Mesmo projeto Firebase.
2. Adicionar app iOS com bundle **`br.com.smartacesso.mobile.app`**.
3. Baixar **`GoogleService-Info.plist`** e colocar na raiz do projeto.
4. Configurar no `app.json` (após adicionar o arquivo):

   ```json
   "ios": {
     "googleServicesFile": "./GoogleService-Info.plist"
   }
   ```

5. No Firebase Console: upload da **chave APNs** (.p8) em Project Settings → Cloud Messaging → Apple.
6. Rodar `npx expo prebuild` novamente após incluir o plist.

### Fluxo push no app

1. Login → JWT
2. `POST /app/device-token` com token FCM/APNs nativo
3. Backend envia push → app abre `/avisos`, `/entregas` ou `/historico` conforme `type`

Diagnóstico no app: **Perfil → Notificações push** (`GET /push/status`).

---

## Build Android

### Passo 0 — Gerar pasta nativa (primeira vez ou após mudar `app.json` / plugins)

Na raiz do projeto:

```bash
npx expo prebuild --platform android
```

Isso cria/atualiza a pasta `android/`.

### Passo 1 — APK Release (testes em celular físico)

**Importante:** use **`assembleRelease`**, não `assembleDebug`. O debug **não embute JavaScript** e trava na tela do logo sem o Metro rodando no PC.

```powershell
cd android
$env:NODE_ENV = "production"
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
```

**Saída:**

```
android/app/build/outputs/apk/release/app-release.apk
```

Instalar no celular (USB + depuração USB):

```powershell
adb install -r app\build\outputs\apk\release\app-release.apk
```

Ou copie o APK para o aparelho e instale manualmente.

### Passo 2 — AAB (Google Play Store)

```powershell
cd android
$env:NODE_ENV = "production"
.\gradlew.bat bundleRelease -PreactNativeArchitectures=arm64-v8a
```

**Saída:**

```
android/app/build/outputs/bundle/release/app-release.aab
```

### Alternativa via Expo CLI

Com celular/emulador conectado:

```bash
npx expo run:android --variant release
```

Compila e instala direto (equivalente a release local).

### Arquiteturas (ABI)

| Comando | Uso |
|---------|-----|
| `-PreactNativeArchitectures=arm64-v8a` | Celulares físicos modernos (~40 MB) |
| Omitir o flag | arm + x86 + x86_64 (emuladores + devices, APK maior) |

---

## Build iOS

### Passo 0 — Pré-requisitos iOS

1. Mac com Xcode instalado.
2. `GoogleService-Info.plist` na raiz (push).
3. Gerar projeto nativo:

   ```bash
   npx expo prebuild --platform ios
   ```

4. Instalar pods:

   ```bash
   cd ios
   pod install
   cd ..
   ```

### Passo 1 — Build e run no simulador / dispositivo (desenvolvimento)

```bash
npx expo run:ios
```

Escolhe simulador ou device conectado (device exige provisioning na Apple).

### Passo 2 — Build Release local (Xcode)

1. Abra `ios/SmartAcesso.xcworkspace` no Xcode (nome pode variar após prebuild).
2. Selecione target **Any iOS Device** ou seu iPhone.
3. **Product → Archive**.
4. **Distribute App** → Ad Hoc / TestFlight / App Store.

Ou via linha de comando (após prebuild):

```bash
npx expo run:ios --configuration Release
```

### Passo 3 — Sem Mac (EAS)

Veja [EAS Build](#eas-build-nuvem) com `--platform ios`.

### Capabilities necessárias (Xcode)

- **Push Notifications**
- **Background Modes → Remote notifications** (já em `app.json` → `UIBackgroundModes`)

---

## EAS Build (nuvem)

Recomendado para **iOS sem Mac** e para **assinatura de produção** padronizada.

### Configuração inicial

```bash
npm install -g eas-cli
eas login
eas build:configure
```

O arquivo `eas.json` já define perfis:

| Perfil | Android | iOS | Uso |
|--------|---------|-----|-----|
| `development` | APK | — | Dev client |
| `preview` | APK | — | Testes internos |
| `production` | AAB | IPA | Lojas |

### Comandos

```bash
# APK Android (testes)
eas build --platform android --profile preview

# AAB Play Store
eas build --platform android --profile production

# IPA iOS (TestFlight / App Store)
eas build --platform ios --profile production
```

Credenciais (keystore Android, certificados Apple) podem ser geradas pelo EAS na primeira execução.

---

## Debug vs Release

| | `assembleDebug` / Debug | `assembleRelease` / Release |
|---|---------------------------|-----------------------------|
| JS embarcado no APK/IPA | **Não** (precisa Metro) | **Sim** |
| Instalar APK no celular sozinho | Trava no splash | Funciona |
| Push / Firebase | Incompleto no debug standalone | Completo |
| Assinatura atual do projeto | Debug keystore | Debug keystore* |

\*Para produção na Play Store, configure keystore de release (Gradle ou EAS). O release atual usa keystore debug — adequado para **testes internos**, não para publicação final.

### O que acontece no build Release

1. Gradle/Xcode invoca **Expo export:embed** (`bundleCommand` no `android/app/build.gradle`).
2. Gera `index.android.bundle` (Hermes) + assets.
3. Compila código nativo (Expo modules, Reanimated, etc.).
4. Empacota **APK/AAB/IPA** com `google-services` / Firebase.

---

## Publicação nas lojas

### Google Play

1. Conta Google Play Console.
2. Build **AAB**: `bundleRelease` ou `eas build --profile production`.
3. Keystore de **produção** (não usar debug keystore em produção).
4. Upload do AAB no Play Console → teste interno → produção.

### Apple App Store

1. Conta Apple Developer ($/ano).
2. App Store Connect → novo app com bundle `br.com.smartacesso.mobile.app`.
3. IPA via Xcode Archive ou `eas build --platform ios`.
4. TestFlight → revisão → App Store.

### Checklist antes de publicar

- [ ] Versão em `app.json` (`version`) e `android/app/build.gradle` (`versionCode` / `versionName`)
- [ ] Ícone e splash corretos
- [ ] `google-services.json` (Android) e `GoogleService-Info.plist` (iOS)
- [ ] Backend em produção com Firebase Admin configurado
- [ ] Teste push em device físico (release)
- [ ] Keystore / certificados de produção configurados

---

## Solução de problemas

### App trava na tela do logo (splash)

- Causa: APK **debug** instalado sem Metro.
- Solução: instale **`app-release.apk`** (`assembleRelease`).

### Push: login OK no servidor, sem notificação no celular

- Use APK **release**, não Expo Go.
- Conceda permissão de notificação (Android 13+).
- Teste com app em **background** (Home).
- Perfil → **Re-registrar token push** → deve mostrar `1 token(s) ativo(s)`.
- Push de **acesso** só chega para perfil **RESPONSAVEL** ou **GERENCIAL**, não COMUM.

### Gradle: erro de arquivo bloqueado

```powershell
cd android
.\gradlew.bat --stop
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
```

### Build Android lento na primeira vez

Normal: download Gradle, NDK, compilação C++ (15–60 min). Builds seguintes são incrementais (~2–5 min).

### iOS: `pod install` falha

```bash
cd ios
pod repo update
pod install
```

### Mudou `app.json`, plugins ou Firebase

```bash
npx expo prebuild --clean
# Depois refaça o build release
```

---

## Estrutura útil

```
smartacessomobile/
├── app/                 # Telas (Expo Router)
├── lib/                 # API, push, auth
├── android/             # Projeto Gradle (após prebuild)
├── ios/                 # Projeto Xcode (após prebuild no Mac)
├── google-services.json # Firebase Android (não commitar se política exigir)
├── GoogleService-Info.plist  # Firebase iOS (quando configurado)
├── app.json             # Config Expo (package, plugins)
├── eas.json             # Perfis EAS Build
└── package.json
```

---

## Scripts npm

| Comando | Descrição |
|---------|-----------|
| `npm start` | Metro / Expo Dev Tools |
| `npm run android` | Expo start + abrir Android (dev) |
| `npm run ios` | Expo start + abrir iOS (dev, requer Mac) |

Para build de produção local Android, use **Gradle** (`assembleRelease`) conforme seções acima.

---

## Referências

- [Expo — Local app development](https://docs.expo.dev/workflow/overview/)
- [Expo — Prebuild](https://docs.expo.dev/workflow/prebuild/)
- [Expo — EAS Build](https://docs.expo.dev/build/introduction/)
- [React Native — Publishing to Google Play](https://reactnative.dev/docs/signed-apk-android)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
