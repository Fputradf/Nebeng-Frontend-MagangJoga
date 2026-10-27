# Estructura del Proyecto

<!-- PROJECT_STRUCTURE_START -->
```
├── 📄 .env.example
├── 📄 .gitignore
├── 📁 backup-layout/
│   ├── 📄 CustomerLayout.jsx
│   ├── 📄 MitraLayout.jsx
│   ├── 📄 OperatorLayout.jsx
│   ├── 📄 RegionalLayout.jsx
│   └── 📄 SuperadminLayout.jsx
├── 📄 CUSTOMER_CHAT_IMPLEMENTATION.md
├── 📄 eslint.config.js
├── 📄 fix_banner.py
├── 📄 fix_eslint.py
├── 📄 fix_eslint_2.py
├── 📄 fix_regional.py
├── 📄 fix_topbar.py
├── 📄 index.html
├── 📄 mock_auth_server.js
├── 📄 NOTIFICATION_IMPLEMENTATION.md
├── 📄 package-lock.json
├── 📄 package.json
├── 📁 public/
│   ├── 📄 favicon.svg
│   ├── 📄 firebase-messaging-sw.js
│   └── 📄 icons.svg
├── 📄 README.md
├── 📁 src/
│   ├── 📄 App.css
│   ├── 📄 App.jsx
│   ├── 📁 assets/
│   │   ├── 📄 auth-illustration.png
│   │   ├── 📄 AuthIllustration.png
│   │   ├── 📄 Daftar.png
│   │   └── 📄 LOGO.png
│   ├── 📁 components/
│   │   ├── 📁 layout/
│   │   │   ├── 📄 AppShell.jsx
│   │   │   ├── 📄 AppTopbar.jsx
│   │   │   ├── 📄 AuthLayout.jsx
│   │   │   ├── 📄 BusinessHeader.jsx
│   │   │   ├── 📄 FullPageLoader.jsx
│   │   │   └── 📄 VerificationBanner.jsx
│   │   ├── 📄 NotificationAuthHandler.jsx
│   │   ├── 📁 routing/
│   │   │   └── 📄 ProtectedRoute.jsx
│   │   └── 📁 ui/
│   │       ├── 📄 AuthInput.jsx
│   │       ├── 📄 BannerSlider.jsx
│   │       ├── 📄 BaseModal.jsx
│   │       ├── 📄 EmptyState.jsx
│   │       ├── 📄 EnterpriseTable.jsx
│   │       ├── 📄 NotificationBell.jsx
│   │       ├── 📄 PhoneCallModal.jsx
│   │       ├── 📄 QrScannerModal.jsx
│   │       ├── 📄 Skeleton.jsx
│   │       ├── 📄 StatCard.jsx
│   │       ├── 📄 StatusBadge.jsx
│   │       └── 📄 ToggleSwitch.jsx
│   ├── 📁 config/
│   │   ├── 📄 env.js
│   │   └── 📄 firebase.js
│   ├── 📁 context/
│   │   ├── 📄 AuthContext.jsx
│   │   ├── 📄 GPSContext.jsx
│   │   ├── 📄 MitraDataContext.jsx
│   │   ├── 📄 NotificationContext.jsx
│   │   ├── 📄 TicketsContext.jsx
│   │   └── 📄 ToastContext.jsx
│   ├── 📁 data/
│   │   └── 📄 indonesiaCities.js
│   ├── 📁 features/
│   │   ├── 📁 auth/
│   │   │   ├── 📄 ForgotPassword.jsx
│   │   │   ├── 📄 Login.jsx
│   │   │   └── 📄 Register.jsx
│   │   ├── 📁 customer/
│   │   │   ├── 📁 components/
│   │   │   │   ├── 📄 CustomerProfileModal.jsx
│   │   │   │   ├── 📄 CustomerSidebar.jsx
│   │   │   │   ├── 📄 CustomerTopbar.jsx
│   │   │   │   └── 📄 TicketTimelineModal.jsx
│   │   │   ├── 📄 CustomerLayout.jsx
│   │   │   └── 📁 views/
│   │   │       ├── 📄 BiometricOnboarding.jsx
│   │   │       ├── 📄 CustomerAccountSettings.jsx
│   │   │       ├── 📄 CustomerChat.jsx
│   │   │       ├── 📄 CustomerRewards.jsx
│   │   │       ├── 📄 CustomerWallet.jsx
│   │   │       ├── 📄 MyTickets.jsx
│   │   │       └── 📄 SearchTrip.jsx
│   │   ├── 📁 mitra/
│   │   │   ├── 📁 components/
│   │   │   │   ├── 📄 MitraProfileModal.jsx
│   │   │   │   ├── 📄 MitraSidebar.jsx
│   │   │   │   └── 📄 MitraTopbar.jsx
│   │   │   ├── 📄 MitraLayout.jsx
│   │   │   └── 📁 views/
│   │   │       ├── 📄 MitraAccountSettings.jsx
│   │   │       ├── 📄 MitraBalance.jsx
│   │   │       ├── 📄 MitraChat.jsx
│   │   │       ├── 📄 MitraDashboard.jsx
│   │   │       ├── 📄 MitraOnboarding.jsx
│   │   │       ├── 📄 MitraQrDisplay.jsx
│   │   │       └── 📄 MitraTripManagement.jsx
│   │   ├── 📁 notifications/
│   │   │   ├── 📄 index.js
│   │   │   ├── 📄 NotificationHistory.jsx
│   │   │   ├── 📄 NotificationPermissionRequest.jsx
│   │   │   └── 📄 NotificationSettings.jsx
│   │   ├── 📁 operator-pos/
│   │   │   ├── 📁 components/
│   │   │   │   ├── 📄 OperatorAccountSettings.jsx
│   │   │   │   ├── 📄 OperatorProfileModal.jsx
│   │   │   │   ├── 📄 OperatorSidebar.jsx
│   │   │   │   └── 📄 OperatorTopBar.jsx
│   │   │   ├── 📄 OperatorLayout.jsx
│   │   │   └── 📁 views/
│   │   │       ├── 📄 OperatorDashboard.jsx
│   │   │       ├── 📄 OperatorDualScanner.jsx
│   │   │       ├── 📄 OperatorFinancial.jsx
│   │   │       ├── 📄 OperatorHandover.jsx
│   │   │       ├── 📄 OperatorInspection.jsx
│   │   │       └── 📄 OperatorManifest.jsx
│   │   ├── 📁 regional/
│   │   │   ├── 📁 components/
│   │   │   │   ├── 📄 RegionalSidebar.jsx
│   │   │   │   ├── 📄 RegionalTopbar.jsx
│   │   │   │   └── 📄 UserProfileModal.jsx
│   │   │   ├── 📄 RegionalLayout.jsx
│   │   │   └── 📁 views/
│   │   │       ├── 📄 AdminRegionalDashboard.jsx
│   │   │       ├── 📄 ArmadaKurirTabs.jsx
│   │   │       ├── 📄 ArmadaPage.jsx
│   │   │       ├── 📄 FinancialReportPage.jsx
│   │   │       ├── 📄 KurirPage.jsx
│   │   │       ├── 📄 OperatorPosManagement.jsx
│   │   │       ├── 📄 PosMitraManagement.jsx
│   │   │       ├── 📄 RegionalAccountSettings.jsx
│   │   │       ├── 📄 TripOrderMonitoring.jsx
│   │   │       └── 📄 VerificationCenter.jsx
│   │   └── 📁 superadmin/
│   │       ├── 📁 components/
│   │       │   ├── 📄 SuperadminHeader.jsx
│   │       │   ├── 📄 SuperadminProfileModal.jsx
│   │       │   └── 📄 SuperadminSidebar.jsx
│   │       ├── 📄 SuperadminLayout.jsx
│   │       └── 📁 views/
│   │           ├── 📄 AuditLedger.jsx
│   │           ├── 📄 BannerManagement.jsx
│   │           ├── 📄 MerchandiseManagement.jsx
│   │           ├── 📄 PricingManagement.jsx
│   │           ├── 📄 RegionalAdminsManagement.jsx
│   │           ├── 📄 RegionsManagement.jsx
│   │           ├── 📄 SuperadminAccountSettings.jsx
│   │           ├── 📄 SuperadminDashboard.jsx
│   │           └── 📄 UserGovernance.jsx
│   ├── 📁 hooks/
│   │   ├── 📄 useActiveMenu.js
│   │   ├── 📄 usePushNotifications.js
│   │   └── 📄 useSimulatedLoading.js
│   ├── 📄 index.css
│   ├── 📄 main.jsx
│   ├── 📁 services/
│   │   ├── 📄 adminService.js
│   │   ├── 📄 apiClient.js
│   │   ├── 📄 auditService.js
│   │   ├── 📄 authService.js
│   │   ├── 📄 bannerService.js
│   │   ├── 📄 merchandiseService.js
│   │   ├── 📄 mitraPricing.js
│   │   ├── 📄 mitraService.js
│   │   ├── 📄 notificationService.js
│   │   ├── 📄 operatorService.js
│   │   ├── 📄 pricingPolicyService.js
│   │   ├── 📄 pricingService.js
│   │   ├── 📄 regionalService.js
│   │   ├── 📄 regionService.js
│   │   ├── 📄 userService.js
│   │   ├── 📄 vehicleService.js
│   │   ├── 📄 verificationService.js
│   │   └── 📄 walletService.js
│   └── 📁 utils/
│       ├── 📄 geoJsonUtil.js
│       └── 📄 mitraUtils.js
├── 📄 structure.md
├── 📄 tailwind.config.js
├── 📄 VAPID_FIX_GUIDE.md
└── 📄 vite.config.js
```
<!-- PROJECT_STRUCTURE_END -->
