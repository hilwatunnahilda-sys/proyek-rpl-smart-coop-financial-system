/**
 * Application Bootstrap Entry Point
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 * Database & Authentication Subsystem
 */

import { ENV } from './config/env.js';
import { db } from './infrastructure/database/connection.js';
import { auth } from './infrastructure/auth/authService.js';
import { router } from './presentation/router/router.js';
import { renderLayout } from './presentation/layout/Layout.js';

// Views
import { renderLoginView } from './presentation/views/LoginView.js';
import { renderDashboardShellView } from './presentation/views/DashboardShellView.js';
import { renderAdminAreaView } from './presentation/views/AdminAreaView.js';
import { renderChairmanAreaView } from './presentation/views/ChairmanAreaView.js';
import { renderMemberProfileView } from './presentation/views/MemberProfileView.js';
import { renderAdminLoanView } from './presentation/views/AdminLoanView.js';
import { renderMemberLoanView } from './presentation/views/MemberLoanView.js';
import { renderMemberListView } from './presentation/views/MemberListView.js';
import { renderMemberAddView } from './presentation/views/MemberAddView.js';
import { renderMemberEditView } from './presentation/views/MemberEditView.js';
import { renderMemberDetailView } from './presentation/views/MemberDetailView.js';
import { renderForbiddenView } from './presentation/views/ForbiddenView.js';
import { renderNotFoundView } from './presentation/views/NotFoundView.js';
import { renderTransactionListView } from './presentation/views/TransactionListView.js';
import { renderMemberTransactionView } from './presentation/views/MemberTransactionView.js';
import { renderReportsView } from './presentation/views/ReportsView.js';
import { renderAboutView } from './presentation/views/AboutView.js';
import { renderTelegramSettingsView } from './presentation/views/TelegramSettingsView.js';
import { renderAiModelControlCenterView } from './presentation/views/AiModelControlCenterView.js';

class ApplicationBootstrap {
  async run() {
    console.log(`[App] Initializing ${ENV.APP_NAME} v${ENV.APP_VERSION} (DB: ${ENV.DATABASE.DRIVER})...`);

    // 1. Connect Database & Run Migrations / Seeders
    await db.connect();

    // 2. Restore active session
    await auth.initSession();

    // 3. Register Views to Router Registry
    const appRoot = document.getElementById('app');

    router.registerView('LoginView', (container) => renderLoginView(container));
    router.registerView('DashboardShellView', (container, ctx) => renderDashboardShellView(container, ctx));
    router.registerView('AdminAreaView', (container, ctx) => renderAdminAreaView(container, ctx));
    router.registerView('AiModelControlCenterView', (container, ctx) => renderAiModelControlCenterView(container, ctx));
    router.registerView('ChairmanAreaView', (container, ctx) => renderChairmanAreaView(container, ctx));
    router.registerView('MemberProfileView', (container, ctx) => renderMemberProfileView(container, ctx));
    router.registerView('AdminLoanView', (container, ctx) => renderAdminLoanView(container, ctx));
    router.registerView('MemberLoanView', (container, ctx) => renderMemberLoanView(container, ctx));
    router.registerView('TransactionListView', (container, ctx) => renderTransactionListView(container, ctx));
    router.registerView('MemberTransactionView', (container, ctx) => renderMemberTransactionView(container, ctx));
    router.registerView('ReportsView', (container, ctx) => renderReportsView(container, ctx));
    router.registerView('AboutView', (container, ctx) => renderAboutView(container, ctx));
    router.registerView('TelegramSettingsView', (container, ctx) => renderTelegramSettingsView(container, ctx));
    router.registerView('MemberListView', (container, ctx) => renderMemberListView(container, ctx));
    router.registerView('MemberAddView', (container, ctx) => renderMemberAddView(container, ctx));
    router.registerView('MemberEditView', (container, ctx) => renderMemberEditView(container, ctx));
    router.registerView('MemberDetailView', (container, ctx) => renderMemberDetailView(container, ctx));
    router.registerView('ForbiddenView', (container, ctx) => renderForbiddenView(container, ctx));
    router.registerView('NotFoundView', (container) => renderNotFoundView(container));

    // 4. Layout Shell Coordinator
    router.onRouteChanged = (route, user) => {
      if (route.isPublic && route.path === '/login') {
        router.setContainer(appRoot);
      } else {
        const contentView = renderLayout(appRoot, { route, user });
        router.setContainer(contentView);
      }
    };

    // 5. React to Authentication State Changes
    auth.onAuthStateChange((user) => {
      if (!user && router.getCurrentPath() !== '/login') {
        router.navigate('/login');
      } else if (user && router.getCurrentPath() === '/login') {
        router.navigate('/dashboard');
      } else {
        router.handleRouting();
      }
    });

    // 6. Start Router
    router.init();
    console.log('[App] Database & Authentication Subsystem initialized successfully.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ApplicationBootstrap().run();
});
