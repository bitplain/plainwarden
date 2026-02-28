"use client";

import Link from "next/link";
import { useState } from "react";
import { CALENDAR2_LINEAR_VARS } from "@/components/calendar2/calendar2-theme";
import SettingsCliTab from "@/components/settings/SettingsCliTab";
import SettingsApiTab from "@/components/settings/SettingsApiTab";
import SettingsGitHubTab from "@/components/settings/SettingsGitHubTab";
import SettingsTlsTab from "@/components/settings/SettingsTlsTab";

type SettingsTab = "cli" | "api" | "github" | "tls";

const TAB_OPTIONS: { id: SettingsTab; label: string }[] = [
  { id: "cli", label: "Интерфейс" },
  { id: "api", label: "API" },
  { id: "github", label: "GitHub" },
  { id: "tls", label: "TLS / ACME" },
];

export default function SettingsPage() {
  const [isEmbedded] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("embedded") === "1";
  });
  const [activeTab, setActiveTab] = useState<SettingsTab>("cli");

  const renderContent = () => {
    switch (activeTab) {
      case "cli":
        return <SettingsCliTab />;
      case "api":
        return <SettingsApiTab />;
      case "github":
        return <SettingsGitHubTab />;
      case "tls":
        return <SettingsTlsTab />;
      default:
        return null;
    }
  };

  return (
    <div
      style={CALENDAR2_LINEAR_VARS}
      className={`settings-page-shell ${isEmbedded ? "settings-page-shell-embedded" : ""}`}
    >
      <div className={`settings-page-container ${isEmbedded ? "settings-page-container-embedded" : ""}`}>
        {/* Header */}
        <header className="settings-page-header">
          <div className="settings-page-header-left">
            {!isEmbedded ? (
              <Link href="/calendar" className="settings-page-back">
                ← Календарь
              </Link>
            ) : null}
            <div>
              <p className="settings-page-kicker">NetDen</p>
              <h1 className="settings-page-title">Настройки</h1>
            </div>
          </div>
          {!isEmbedded ? (
            <nav className="settings-page-nav">
              <Link href="/calendar" className="settings-page-nav-link">
                Календарь
              </Link>
            </nav>
          ) : null}
        </header>

        {/* Tabs */}
        <div className="settings-page-tabs-row">
          <div className="settings-page-tabs">
            {TAB_OPTIONS.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`settings-page-tab ${isActive ? "settings-page-tab-active" : ""}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <section className="settings-page-panel">
          {renderContent()}
        </section>
      </div>
    </div>
  );
}
