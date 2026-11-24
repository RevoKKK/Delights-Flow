# Delights Flow

**Delights Flow** is a lightweight, zero-build Progressive Web App (PWA) for **private multi-user personal money tracking**, **multi-shop revenue & capital management**, and **instant customer receipt generation**—built to run for free on GitHub Pages and Firebase.

Designed for individuals, couples, and small online sellers, Delights Flow keeps your real-world wallet balances (Cash, Bank, KPay, CBPay, etc.) synced in real time across Android, iOS, and Desktop while strictly separating personal spending from shop operations in reports.

---

## Key Features

### 1. Money Tracker (`index.html`)
* **Customizable Wallets & Banks:** New workspaces start clean with **Cash** and **Bank**. Add, rename, or remove unlimited accounts anytime, pick an account icon (`Cash`, `Bank`, `Mobile Pay`, `Card`), choose from **18 color themes**, and set opening balances. Deleted wallet names remain preserved on historical entries.
* **Income, Expense & Internal Transfers:** Log daily spending and income with fast amount chips (`+1,000` to `+100,000`) and custom categories. Wallet-to-wallet transfers automatically adjust both accounts without inflating income or expense totals.
* **2-Person + Shared + Shop Ownership:** Switch quickly between **Person 1** and **Person 2** for logging, tag joint household costs as **Shared**, and keep all online shop transactions automatically isolated under **Shop**.
* **Quick Templates:** Create 1-tap shortcuts (synced across devices) for recurring daily entries like coffee, bills, or commute costs.
* **History & Calendar View:** Browse transactions grouped by date or switch to an interactive **Calendar View** showing daily inflows and outflows. Filter by search term, month, wallet, type, owner, or scope (`Personal + Shop`, `Personal Only`, `Shop Only`).
  * Tap any wallet card on **Overview** to inspect that wallet's history; opening **History** from the navigation bar automatically resets to **All Wallets**.
  * Tap any **Shop** entry in Recent Activity or History to jump directly to its Receipt or Edit modal in `shop.html`.
* **Visual Analytics:** Interactive Chart.js dashboards for **Expenses by Category**, **6-Month Income vs. Expense Trend**, **Live Wallet Balances**, and **Owner Breakdown**—with a toggle for Personal, Shop, or Combined reports.
* **Privacy Mode & Dark Mode:** Mask all balances and figures (`••••••`) with one tap when using the app in public, and switch seamlessly between Light and Dark themes.
* **CSV Export & Full JSON Backup/Restore:** Export filtered records as UTF-8 BOM CSV files (Excel-ready with full Myanmar/Unicode support), or download/restore full workspace JSON backups with automatic duplicate detection.

### 2. Multi-Shop & Customer Receipts (`shop.html`)
* **Multiple Shops with Individual Branding:** New users start with **Shop 1** and can add unlimited shops under **Manage Shops**. Each shop maintains its own **Name**, **Color**, **Uploaded Logo** (auto-compressed), **Receipt Footer**, and **Starting Capital**.
* **Capital vs. Revenue Scorecards:** Track **Today's Sales**, **Total Revenue**, **Total Capital**, **Net Profit / Amount Left to Break Even**, and **Pending COD** at a glance, plus per-shop Capital Recovery progress bars.
* **Direct Wallet Sync:** Recording a shop sale or capital/cost entry (`Stock / Capital`, `Packaging`, `Delivery`, `Ads / Boost`, `Other`) automatically updates your exact same live wallets in `index.html`—zero double entry.
* **Paid & COD Payment Split:** Record orders as **Full Paid**, **Full COD**, or **Partial Paid + COD**.
  * Upfront paid amounts enter your selected wallet immediately.
  * Unpaid COD amounts stay tracked under **Pending COD** without inflating wallet balances.
  * When delivery funds arrive, tap **✓ Mark COD Paid** and choose the receiving wallet and date to credit your balance accurately.
* **Branded Customer Receipt Generator (PNG & Text):**
  * Multi-item order builder with quantity, unit price, delivery fee, and discount.
  * Renders a crisp ticket-style **PNG receipt** directly on the device using HTML5 Canvas—complete with per-shop Name, Logo, Footer, Paid/COD status boxes, and automatic text wrapping for long English and Myanmar item names.
  * One-tap **Share PNG** (via Web Share API on mobile), **Download PNG**, or **Copy Text Receipt** for Messenger/Viber.
* **Dedicated Shop History & Shop Analytics:** Tap any shop card on Shop Home to view that shop's history, browse All Shops in the dedicated History tab, export Shop CSVs, and analyze Daily/Monthly Sales vs. Capital trends and cost breakdowns.

### 3. Security, Privacy & Multi-User Isolation
* **Google Direct Sign-In (GIS) + Email/Password:** Uses Google Identity Services (`accounts.google.com`) directly to bypass `*.firebaseapp.com` popup blocks (no VPN needed on restricted networks), with standard Email/Password sign-in and password reset included.
* **Isolated Workspaces with Partner Join PIN:** Each user's ledger is stored under its own Firestore workspace document protected by strict Security Rules. Partners can only join a shared workspace with both the exact **Workspace ID** and **Join PIN**.
* **Zero Hardcoded Secrets or Branding:** Shop names, logos, wallets, and transactions live exclusively inside each user's private Firestore workspace—never in public HTML files.

### 4. PWA & Mobile-First Experience
* **Installable App:** Works as a standalone full-screen app on Android, iOS, and Windows/macOS via `manifest.json`.
* **Offline-First:** Service Worker (`sw.js`) caches the app shell while Firestore's IndexedDB `persistentLocalCache` queues offline edits and syncs automatically when connectivity returns.
* **Smart Mobile Navigation & Back Handling:** Consistent 5-slot bottom navigation bars (`Overview | Shop | (+) | Analytics | History` on Money Tracker; `Money | Shop | (+) | Analytics | History` on Shop) and smart hardware back-button handling (closes open modals → returns to Home tab → asks for exit confirmation on Overview).

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | HTML5, Vanilla JavaScript (ES Modules) |
| **Styling** | Tailwind CSS (CDN, class-based Dark Mode), Inter Font |
| **Charts** | Chart.js v4.4.1 |
| **Receipts** | Native HTML5 Canvas API + Web Share API |
| **Auth** | Firebase Auth v11.6.1 + Google Identity Services (GIS) |
| **Database** | Firebase Cloud Firestore (with IndexedDB Offline Persistence) |
| **Hosting & PWA** | GitHub Pages, Web App Manifest (`manifest.json`), Service Worker (`sw.js`) |

No Node.js, npm, or build step is required—every file runs directly in the browser.

---

## Repository Structure

```text
delights-flow/
├── index.html      # Money Tracker (Auth, Workspaces, Overview, History, Calendar, Analytics, Settings)
├── shop.html       # Multi-Shop Dashboard, COD Tracking, Shop Analytics & Customer Receipt Generator
├── manifest.json   # PWA manifest & app icon metadata
├── sw.js           # Service Worker for offline shell caching
└── README.md       # Project documentation
```

---

## Firestore Data Model

```text
delights_flow_users/{userId}
  ├── email, displayName
  ├── activeWorkspaceId
  ├── workspaces: [{ id, name }]
  └── activePerson, darkMode, privacyMode

delights_flow_workspaces/{workspaceId}
  ├── ownerUid, memberUids[], joinPin
  ├── name, currency, userNames { person1, person2 }
  ├── wallets[], archivedWalletNames{}, openingBalances{}
  ├── customExpenseCategories[], customIncomeCategories[]
  ├── quickTemplates[]
  ├── shopCategories[]   # Per-shop id, name, colorKey, startingCapital, footer, logoDataUrl
  └── transactions/{txId}
        ├── type ("income" | "expense" | "transfer")
        ├── scope ("personal" | "shop")
        ├── amount, date, wallet, fromWallet, toWallet, category, loggedBy, note
        └── (shop fields) shopEntryType, shopCategoryId, items[], orderTotal,
                          paidAmount, codAmount, codStatus, codWallet, codPaidDate,
                          deliveryFee, discount, receiptNo, customerName, customerPhone
```

---

## Setup & Deployment Guide (Self-Hosting)

If you are deploying your own instance of **Delights Flow**:

### 1. Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com) and create a new project.
2. Add a **Web App (`</>`)** and copy your `firebaseConfig`.
3. Replace `window.__firebase_config` in both `index.html` and `shop.html` with your own config.

### 2. Enable Authentication & Direct Google Sign-In (GIS)
1. In Firebase Console → **Build → Authentication → Sign-in method**, enable:
   * **Google**
   * **Email/Password**
2. Under **Authentication → Settings → Authorized domains**, add your hosting domain (e.g., `YOUR-USERNAME.github.io`).
3. Copy your **Web client ID** from **Authentication → Sign-in method → Google → Web SDK configuration**, and update `window.__google_web_client_id` in `index.html`.
4. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), select your Web client ID, and add `https://YOUR-USERNAME.github.io` under **Authorized JavaScript origins** (without a trailing slash or repo path).

### 3. Publish Firestore Security Rules
In **Build → Firestore Database → Rules**, publish the following rules to enforce strict workspace isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Private per-user preferences and workspace list
    match /delights_flow_users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Isolated Workspaces
    match /delights_flow_workspaces/{workspaceId} {
      allow read: if request.auth != null &&
        request.auth.uid in resource.data.memberUids;

      allow create: if request.auth != null &&
        request.resource.data.ownerUid == request.auth.uid &&
        request.auth.uid in request.resource.data.memberUids;

      // Members can update settings; a partner can join ONLY with the exact Join PIN
      allow update: if request.auth != null && (
        request.auth.uid in resource.data.memberUids ||
        (
          resource.data.joinPin is string &&
          resource.data.joinPin.size() >= 4 &&
          request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['memberUids', 'lastJoinPinAttempt', 'updatedAt']) &&
          request.resource.data.lastJoinPinAttempt == resource.data.joinPin &&
          request.resource.data.memberUids.hasAll(resource.data.memberUids) &&
          request.resource.data.memberUids.size() == resource.data.memberUids.size() + 1 &&
          request.auth.uid in request.resource.data.memberUids
        )
      );

      allow delete: if request.auth != null &&
        resource.data.ownerUid == request.auth.uid;

      // Isolated Transactions subcollection
      match /transactions/{txId} {
        allow read, write: if request.auth != null &&
          request.auth.uid in get(/databases/$(database)/documents/delights_flow_workspaces/$(workspaceId)).data.memberUids;
      }
    }

  }
}
```

### 4. Deploy to GitHub Pages
1. Push `index.html`, `shop.html`, `manifest.json`, and `sw.js` to your GitHub repository.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch** → select `main` and `/ (root)` → click **Save**.
4. Your app will be live at `https://YOUR-USERNAME.github.io/delights-flow/`.

---

## Installing as a Native-Like App

Open your live URL in your browser:
* **Android (Chrome):** Tap **⋮** → **Add to Home screen** → **Install** *(or use **Install Delights Flow App** inside Wallets & Settings)*.
* **iOS (Safari):** Tap **Share** → **Add to Home Screen** → **Add**.
* **Windows / macOS (Chrome / Edge):** Click the **Install App** icon on the right side of the address bar.

---

## Quick Usage Guide

### Pairing with a Partner
1. **Person 1** creates a ledger and opens **Wallets & Settings → Private Workspace & Partner Invite** to copy the **Workspace ID** and **Join PIN**.
2. **Person 2** signs in with their own Google or Email account, selects **Join Partner's**, and enters the Workspace ID + PIN.
3. Both devices now sync all wallets, templates, personal entries, shops, and receipts in real time.

### Recording Sales with COD
1. Open **Shop** → tap **+** → select your shop and add items.
2. Choose **Full Paid**, **Full COD**, or enter custom **Paid Now** and **COD Amount** values.
3. Save to immediately generate and share the customer receipt.
4. Once delivery cash arrives, tap **✓ Mark COD Paid** on the order and select the receiving wallet.

### Safe Backups & Rollbacks
* Download a periodic snapshot anytime via **Wallets & Settings → Download Backup (JSON)**.
* Because all ledger data lives in Firebase Firestore, rolling back `index.html` or `shop.html` in GitHub never affects your saved financial records.

---

## License

This project is open for personal use and customization.